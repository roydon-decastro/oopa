// End-to-end check of the renter flow. Run against a running app: BASE=http://localhost:3000 node tests/renter-flow.e2e.cjs
// Set PHOTO to a JPG path for the test listing.
// Note: Better Auth rate-limits sign-ups (3 per 10s per IP), so leave ~10s between test runs.
/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require('playwright');
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
  await owner.click('button:has-text("Create account")'); await owner.waitForURL('**/dashboard');
  await owner.goto(base + '/dashboard/properties/new');
  await owner.fill('input[name=title]', title);
  await owner.selectOption('select[name=type]', 'apartment');
  await owner.fill('textarea[name=description]', 'Quiet street near IT Park. Water and electricity sub-metered.');
  await owner.fill('input[name=monthlyRentPhp]', '18000');
  await owner.fill('input[name=bedrooms]', '2');
  await owner.fill('input[name=barangay]', 'Lahug'); await owner.fill('input[name=city]', 'Cebu City'); await owner.fill('input[name=province]', 'Cebu');
  await owner.check('input[value="Parking"]');
  await owner.setInputFiles('input[name=photos]', [photo]);
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

  // Renter opens listing, signs up from it, applies
  await r.goto(base + '/listings?city=Lahug');
  await r.click(`text=${title}`);
  await r.waitForSelector('text=Move-in cost');
  const listingUrl = r.url();
  assert((await r.textContent('aside')).includes('₱54,000'), 'move-in cost = 1 adv + 2 dep');
  await r.click('text=Sign up to apply');
  await r.fill('#name', 'Paolo Garcia'); await r.fill('#email', `renter${stamp}@example.com`); await r.fill('#password', 'password123');
  await r.fill('#phone', '09181112222');
  await r.click('button:has-text("Create account")');
  await r.waitForURL(listingUrl);
  if (shots) { await r.waitForFunction(() => [...document.images].every(i => i.complete)); await r.screenshot({ path: shots + '/listing.png' }); }
  await r.fill('input[name=moveInDate]', new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10));
  await r.fill('input[name=monthlyIncomePhp]', '65000');
  await r.fill('input[name=employment]', 'Nurse at Chong Hua Hospital');
  await r.fill('textarea[name=message]', 'Hi! I work nearby and can move in within two weeks.');
  await r.click('button:has-text("Send application")');
  await r.waitForURL('**/applications?sent=1');
  assert(await r.locator('text=Submitted').count() >= 1, 'status submitted');
  await r.goto(listingUrl);
  assert(await r.locator('text=You applied on').count() === 1, 'no duplicate apply form');
  log('apply ok');

  // Owner reviews: contact hidden until review, then approves
  await owner.goto(base + '/dashboard/applications');
  const card = owner.locator('li', { hasText: 'Paolo Garcia' });
  assert(await card.locator('text=Shown when you review or approve').count() === 1, 'contact hidden');
  assert((await card.textContent()).includes('3.6× rent'), 'income ratio shown');
  await card.locator('button:has-text("Approve")').click();
  await card.locator('text=Approved').waitFor();
  assert((await card.textContent()).includes('09181112222'), 'contact shown after approve');
  if (shots) await owner.screenshot({ path: shots + '/owner-applications.png' });
  log('owner approve ok');

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
