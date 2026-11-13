// End-to-end check of the owner flow. Run against a running app: BASE=http://localhost:3000 node tests/owner-flow.e2e.cjs
// Needs test images; set PHOTOS to three comma-separated JPG paths.
// Note: Better Auth rate-limits sign-ups (3 per 10s per IP), so leave ~10s between test runs.
/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  const base = process.env.BASE || 'http://localhost:3000';
  const photos = (process.env.PHOTOS || '/var/tmp/photo0.jpg,/var/tmp/photo1.jpg,/var/tmp/photo2.jpg').split(',');
  const log = (...a) => console.log(...a);
  p.on('pageerror', e => log('PAGEERROR', e.message));
  // Signup as owner
  await p.goto(base + '/signup?role=owner');
  await p.fill('#name', 'Maria Santos');
  await p.fill('#phone', '09171234567');
  await p.fill('#email', `owner${Date.now()}@example.com`);
  await p.fill('#password', 'password123');
  await p.screenshot({ path: '/var/tmp/shots/1-signup.png' });
  await p.click('button:has-text("Create account")');
  await p.waitForURL('**/dashboard', { timeout: 15000 });
  log('signup ok ->', p.url());
  await p.screenshot({ path: '/var/tmp/shots/2-empty-dashboard.png' });
  // Add property
  await p.click('text=+ Add a property');
  await p.waitForURL('**/properties/new');
  await p.fill('input[name=title]', 'Fully furnished 1BR condo near BGC');
  await p.selectOption('select[name=furnishing]', 'fully');
  await p.fill('textarea[name=description]', 'Walking distance to High Street. 24/7 security, pool and gym.');
  await p.fill('input[name=monthlyRentPhp]', '35000');
  await p.fill('input[name=floorAreaSqm]', '42');
  await p.fill('input[name=barangay]', 'Fort Bonifacio');
  await p.fill('input[name=city]', 'Taguig');
  await p.fill('input[name=province]', 'Metro Manila');
  await p.check('input[value="Swimming pool"]');
  await p.check('input[value="Gym"]');
  await p.setInputFiles('input[name=photos]', [photos[0], photos[1]]);
  await p.screenshot({ path: '/var/tmp/shots/3-form.png', fullPage: true });
  await p.click('button:has-text("Publish listing")');
  await p.waitForURL('**/dashboard?saved=published', { timeout: 15000 });
  log('publish ok');
  // Second as draft
  await p.goto(base + '/dashboard/properties/new');
  await p.fill('input[name=title]', 'Bedspace for female students, Sampaloc');
  await p.selectOption('select[name=type]', 'bedspace');
  await p.fill('input[name=monthlyRentPhp]', '4500');
  await p.fill('input[name=city]', 'Manila');
  await p.fill('input[name=province]', 'Metro Manila');
  await p.click('button:has-text("Save as draft")');
  await p.waitForURL('**/dashboard?saved=draft');
  log('draft ok');
  // Validation error
  await p.goto(base + '/dashboard/properties/new');
  await p.fill('input[name=title]', 'Big house');
  await p.fill('input[name=monthlyRentPhp]', '50000');
  await p.fill('input[name=city]', 'Cebu City');
  await p.fill('input[name=province]', 'Cebu');
  await p.setInputFiles('input[name=photos]', { name: 'doc.pdf', mimeType: 'application/pdf', buffer: Buffer.from('x') });
  await p.click('button:has-text("Publish listing")');
  await p.waitForSelector('.bg-red-50');
  log('validation:', await p.textContent('.bg-red-50'));
  // Mark first rented
  await p.goto(base + '/dashboard');
  const firstRow = p.locator('li', { hasText: 'BGC' });
  await firstRow.locator('button:has-text("Mark rented")').click();
  await firstRow.locator('text=Rented').waitFor();
  log('rented ok');
  // Edit: remove a photo, add one
  await firstRow.locator('text=Edit').click();
  await p.waitForURL('**/edit');
  await p.locator('section button').first().click();
  await p.click('text=Remove 1 selected photo');
  await p.waitForTimeout(1500);
  log('photos after remove:', await p.locator('section img').count());
  await p.setInputFiles('input[name=photos]', [photos[2]]);
  await p.fill('input[name=monthlyRentPhp]', '33000');
  await p.click('button:has-text("Save changes")');
  await p.waitForURL('**/dashboard?saved=updated');
  log('edit ok, still rented:', await p.locator('li', { hasText: 'BGC' }).locator('text=Rented').count());
  await p.screenshot({ path: '/var/tmp/shots/4-dashboard.png', fullPage: true });
  // Renter cannot access dashboard
  const r = await b.newPage();
  await r.goto(base + '/signup');
  await r.fill('#name', 'Juan Cruz'); await r.fill('#email', `renter${Date.now()}@example.com`); await r.fill('#password', 'password123');
  await r.click('button:has-text("Create account")');
  await r.waitForURL('**/listings');
  await r.goto(base + '/dashboard');
  log('renter dashboard ->', r.url());
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
