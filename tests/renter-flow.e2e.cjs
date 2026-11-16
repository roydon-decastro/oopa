// End-to-end check of the renter flow. Run against a running app: BASE=http://localhost:3000 node tests/renter-flow.e2e.cjs
// Set PHOTO to a JPG path for the test listing.
// Note: Better Auth rate-limits sign-ups (3 per 10s per IP), so leave ~10s between test runs.
/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require('playwright');
const { getApplyLink, fillLease } = require('./lib/lease.cjs');
const assert = (c, m) => { if (!c) throw new Error('ASSERT: ' + m); };
(async () => {
  const base = process.env.BASE || 'http://localhost:3000';
  const photo = process.env.PHOTO || '/var/tmp/photo0.jpg';
  const shots = process.env.SHOTS;
  const stamp = Date.now();
  const title = `2BR apartment in Lahug ${stamp}`;
  const b = await chromium.launch();
  const ctxOpts = { viewport: { width: 1280, height: 900 }, deviceScaleFactor: shots ? 2 : 1 };
  const log = (...a) => console.log(...a);

  // Owner publishes a listing
  const owner = await (await b.newContext(ctxOpts)).newPage();
  await owner.goto(base + '/signup?role=owner');
  await owner.fill('#name', 'Liza Reyes'); await owner.fill('#email', `owner${stamp}@example.com`); await owner.fill('#password', 'password123');
  await owner.check('input[name=consent]'); await owner.click('button:has-text(\"Create account\")'); await owner.waitForURL('**/dashboard');
  await owner.goto(base + '/dashboard/properties/new');
  await owner.fill('input[name=title]', title);
  await owner.selectOption('select[name=type]', 'apartment');
  await owner.fill('textarea[name=description]', 'Quiet street near IT Park. Water and electricity sub-metered.');
  await owner.fill('input[name=monthlyRentPhp]', '18000');
  await owner.fill('input[name=bedrooms]', '2');
  await owner.fill('input[name=barangay]', 'Lahug'); await owner.fill('input[name=city]', 'Cebu City'); await owner.fill('input[name=province]', 'Cebu');
  await owner.check('input[value="Parking"]');
  await owner.setInputFiles('input[name=photos]', [photo]);
  await owner.fill('input[name=reservationFeePhp]', '5000');
  await owner.fill('input[name=maxOccupants]', '2');
  await owner.fill('textarea[name=leaseTerms]', 'No pets.\nNo smoking (vaping included).');
  await owner.click('button:has-text("Publish listing")'); await owner.waitForURL('**/dashboard?saved=published');
  log('owner published');

  // Anonymous search
  const r = await (await b.newContext(ctxOpts)).newPage();
  await r.goto(base + '/listings?city=Lahug&type=apartment&beds=2&max=20000');
  assert(await r.locator(`text=${title}`).count() === 1, 'search finds listing');
  if (shots) { await r.waitForFunction(() => [...document.images].every(i => i.complete)); await r.screenshot({ path: shots + '/browse.png' }); }
  await r.goto(base + '/listings?city=Lahug&max=10000');
  assert(await r.locator(`text=${title}`).count() === 0, 'price filter excludes');
  log('search ok');

  // Renter opens the listing and sees how to contact the owner (no apply form on the listing)
  await r.goto(base + '/listings?city=Lahug');
  await r.click(`text=${title}`);
  await r.waitForSelector('text=Move-in cost');
  const listingUrl = r.url();
  const propertyId = listingUrl.split('/').pop();
  assert((await r.textContent('aside')).includes('₱54,000'), 'move-in cost = 1 adv + 2 dep');
  assert(await r.locator('textarea, input[name=moveInDate]').count() === 0, 'no application form on listing');
  await r.click('text=Sign up to contact the owner');
  await r.fill('#name', 'Paolo Garcia'); await r.fill('#email', `renter${stamp}@example.com`); await r.fill('#password', 'password123');
  await r.fill('#phone', '09181112222');
  await r.check('input[name=consent]'); await r.click('button:has-text(\"Create account\")');
  await r.waitForURL(listingUrl);
  const aside = await r.textContent('aside');
  assert(aside.includes('Contact the owner') && (aside.includes('Call') || aside.includes('Email')), 'owner contact shown to logged-in renter');
  if (shots) { await r.waitForFunction(() => [...document.images].every(i => i.complete)); await r.screenshot({ path: shots + '/listing.png' }); }
  log('contact shown');

  // They agree; owner sends the private application link; renter fills in the lease application
  const link = await getApplyLink(owner, base, propertyId);
  assert(/\/apply\/[A-Za-z0-9_-]{20,}$/.test(link), 'link format ' + link);
  await r.goto(link);
  if (shots) await r.screenshot({ path: shots + '/lease-form.png', fullPage: true });
  const form = await r.textContent('main');
  assert(form.includes('reservation fee of ₱5,000') && form.includes('No smoking (vaping included).') && form.includes('Up to 2 tenants only'), 'owner terms on form');
  await fillLease(r, { name: 'Paolo Garcia', tenants: [{ name: 'Liza Garcia', age: 29 }] });
  await r.waitForURL(/\/applications\/[0-9a-f-]+\/lease\?sent=1/);
  const leaseUrl = r.url().split('?')[0];
  const lease = await r.textContent('main');
  assert(lease.includes('Paolo Garcia') && lease.includes('N01-23-456789') && lease.includes('Liza Garcia') && lease.includes('₱36,000') && lease.includes('No pets.'), 'lease view');
  await r.goto(link);
  assert(await r.locator('text=You already sent your lease application').count() === 1, 'no duplicate lease application');
  log('lease application sent');

  // Owner reviews the lease application and approves
  await owner.goto(base + '/dashboard/applications');
  const card = owner.locator('li', { hasText: 'Paolo Garcia' });
  await card.locator('text=View lease application').click();
  await owner.waitForURL(leaseUrl);
  assert((await owner.textContent('main')).includes('Chong Hua Hospital'), 'owner sees lease form');
  if (shots) await owner.screenshot({ path: shots + '/lease-view.png', fullPage: true });
  await owner.click('button:has-text("Approve")');
  await owner.locator('text=Approved').first().waitFor();
  log('owner approve ok');

  // Another user can't open the lease application
  const stranger = await (await b.newContext(ctxOpts)).newPage();
  await stranger.goto(base + '/signup');
  await stranger.fill('#name', 'Nosy Neighbor'); await stranger.fill('#email', `nosy${stamp}@example.com`); await stranger.fill('#password', 'password123');
  await stranger.check('input[name=consent]'); await stranger.click('button:has-text(\"Create account\")'); await stranger.waitForURL('**/listings');
  assert((await stranger.goto(leaseUrl)).status() === 404, 'lease hidden from others');
  // A replaced link stops working
  await owner.goto(`${base}/dashboard/properties/${propertyId}/edit`);
  await owner.click('button:has-text("Application link")');
  await owner.click('text=Make a new link'); await owner.click('button.text-red-700:has-text("Make a new link")');
  await owner.waitForFunction((old) => document.querySelector('input[aria-label="Application link"]')?.value !== old, link);
  await stranger.goto(link);
  assert(await stranger.locator("text=This application link isn't valid").count() === 1, 'old link invalid');
  log('privacy ok');

  await r.goto(base + '/applications');
  assert(await r.locator('text=Approved!').count() === 1, 'renter sees approval');
  if (shots) { await r.waitForFunction(() => [...document.images].every(i => i.complete)); await r.screenshot({ path: shots + '/my-applications.png' }); }
  log('renter sees approved');

  // Renter can't see the owner applications page, owner dashboard shows count
  await r.goto(base + '/dashboard/applications');
  assert(r.url().includes('/owners'), 'renter blocked from owner applications');
  await owner.goto(base + '/dashboard');
  assert(await owner.locator('text=1 application').count() >= 1, 'count on dashboard');

  // Unpublished listing is hidden from public
  await owner.locator('li', { hasText: title }).locator('button:has-text("Unpublish")').click();
  await owner.locator('li', { hasText: title }).locator('text=Draft').waitFor();
  const anon = await (await b.newContext(ctxOpts)).newPage();
  const resp = await anon.goto(listingUrl);
  assert(resp.status() === 404, 'draft listing 404 for public');
  log('visibility ok');
  await b.close();
  log('ALL PASSED');
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
