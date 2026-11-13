// Mirrors supabase/migrations/0001_init.sql
export type UserRole = "owner" | "renter";
export type PropertyType = "condo" | "apartment" | "house" | "townhouse" | "room" | "bedspace" | "commercial";
export type ListingStatus = "draft" | "active" | "rented" | "archived";
export type ApplicationStatus = "submitted" | "reviewing" | "approved" | "rejected" | "withdrawn";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
}

export interface Property {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  type: PropertyType;
  status: ListingStatus;
  monthly_rent_php: number;
  deposit_months: number;
  advance_months: number;
  bedrooms: number;
  bathrooms: number;
  floor_area_sqm: number | null;
  furnishing: "unfurnished" | "semi" | "fully" | null;
  pets_allowed: boolean;
  min_lease_months: number;
  available_from: string | null;
  street: string | null;
  barangay: string | null;
  city: string;
  province: string;
  region: string | null;
  amenities: string[];
  created_at: string;
}

export interface Application {
  id: string;
  property_id: string;
  renter_id: string;
  status: ApplicationStatus;
  move_in_date: string | null;
  lease_months: number | null;
  occupants: number;
  monthly_income_php: number | null;
  employment: string | null;
  message: string | null;
  created_at: string;
}

export const formatPHP = (n: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(n);
