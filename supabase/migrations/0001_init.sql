-- Oopa initial schema: profiles, properties, photos, applications.
-- Run in the Supabase SQL editor or with `supabase db push`.

create type user_role as enum ('owner', 'renter');
create type property_type as enum ('condo', 'apartment', 'house', 'townhouse', 'room', 'bedspace', 'commercial');
create type listing_status as enum ('draft', 'active', 'rented', 'archived');
create type application_status as enum ('submitted', 'reviewing', 'approved', 'rejected', 'withdrawn');

-- One profile per Supabase auth user.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'renter',
  full_name text not null default '',
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  type property_type not null,
  status listing_status not null default 'draft',
  monthly_rent_php numeric(12,2) not null check (monthly_rent_php >= 0),
  deposit_months smallint not null default 1 check (deposit_months >= 0),
  advance_months smallint not null default 1 check (advance_months >= 0),
  bedrooms smallint not null default 0,
  bathrooms smallint not null default 1,
  floor_area_sqm numeric(8,2),
  furnishing text check (furnishing in ('unfurnished', 'semi', 'fully')),
  pets_allowed boolean not null default false,
  min_lease_months smallint not null default 12,
  available_from date,
  -- Philippine address
  street text,
  barangay text,
  city text not null,
  province text not null,
  region text,
  latitude double precision,
  longitude double precision,
  amenities text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index properties_search_idx on properties (status, city, type, monthly_rent_php);
create index properties_owner_idx on properties (owner_id);

create table property_photos (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  storage_path text not null,
  position smallint not null default 0,
  created_at timestamptz not null default now()
);
create index property_photos_property_idx on property_photos (property_id, position);

create table applications (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  renter_id uuid not null references profiles(id) on delete cascade,
  status application_status not null default 'submitted',
  move_in_date date,
  lease_months smallint,
  occupants smallint not null default 1,
  monthly_income_php numeric(12,2),
  employment text,
  message text,
  owner_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, renter_id)
);
create index applications_renter_idx on applications (renter_id);
create index applications_property_idx on applications (property_id, status);

-- updated_at triggers
create function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger profiles_updated before update on profiles for each row execute function set_updated_at();
create trigger properties_updated before update on properties for each row execute function set_updated_at();
create trigger applications_updated before update on applications for each row execute function set_updated_at();

-- Create a profile automatically on sign-up (role/full_name from sign-up metadata).
create function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, role, full_name)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'renter'),
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- Row level security
alter table profiles enable row level security;
alter table properties enable row level security;
alter table property_photos enable row level security;
alter table applications enable row level security;

create policy "profiles: read own" on profiles for select using (auth.uid() = id);
create policy "profiles: update own" on profiles for update using (auth.uid() = id)
  with check (auth.uid() = id);
-- Owners can see the profiles of people who applied to their properties.
create policy "profiles: owners read applicants" on profiles for select using (
  exists (select 1 from applications a join properties p on p.id = a.property_id
          where a.renter_id = profiles.id and p.owner_id = auth.uid())
);

create policy "properties: public read active" on properties for select using (status = 'active' or owner_id = auth.uid());
create policy "properties: owner insert" on properties for insert with check (
  owner_id = auth.uid() and exists (select 1 from profiles where id = auth.uid() and role = 'owner')
);
create policy "properties: owner update" on properties for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "properties: owner delete" on properties for delete using (owner_id = auth.uid());

create policy "photos: read with property" on property_photos for select using (
  exists (select 1 from properties p where p.id = property_id and (p.status = 'active' or p.owner_id = auth.uid()))
);
create policy "photos: owner write" on property_photos for all using (
  exists (select 1 from properties p where p.id = property_id and p.owner_id = auth.uid())
) with check (
  exists (select 1 from properties p where p.id = property_id and p.owner_id = auth.uid())
);

create policy "applications: renter read own" on applications for select using (renter_id = auth.uid());
create policy "applications: owner read" on applications for select using (
  exists (select 1 from properties p where p.id = property_id and p.owner_id = auth.uid())
);
create policy "applications: renter create" on applications for insert with check (
  renter_id = auth.uid() and status = 'submitted'
  and exists (select 1 from properties p where p.id = property_id and p.status = 'active')
);
create policy "applications: renter withdraw" on applications for update using (renter_id = auth.uid())
  with check (renter_id = auth.uid() and status = 'withdrawn');
create policy "applications: owner decide" on applications for update using (
  exists (select 1 from properties p where p.id = property_id and p.owner_id = auth.uid())
) with check (
  exists (select 1 from properties p where p.id = property_id and p.owner_id = auth.uid())
);

-- Public bucket for listing photos; files stored under <owner_id>/<property_id>/...
insert into storage.buckets (id, name, public) values ('property-photos', 'property-photos', true)
  on conflict (id) do nothing;
create policy "photos bucket: public read" on storage.objects for select using (bucket_id = 'property-photos');
create policy "photos bucket: owner upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'property-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos bucket: owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'property-photos' and (storage.foldername(name))[1] = auth.uid()::text);
