// End-to-end check of dormitories and bedspaces. Run against a running app:
// BASE=http://localhost:3000 node tests/dorm-flow.e2e.cjs
// Note: Better Auth rate-limits sign-ups (3 per 10s per IP), so leave ~10s between test runs.
/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require('playwright');
const assert = (c, m) => { if (!c) throw new Error('ASSERT: ' + m); };
(async () => {
  const base = process.env.BASE || 'http://localhost:3000';
  const photo = process.env.PHOTO || '/var/tmp/photo0.jpg';
  const shots = process.env.SHOTS;
  const stamp = Date.now();
  const city = `Dormtown${stamp}`;
  const dormName = `Villa Rosa Ladies Dorm ${stamp}`;
  const b = await chromium.launch();
  const opts = { viewport: { width: 1280, height: 900 }, deviceScaleFactor: shots ? 2 : 1 };
  const log = (...a) => console.log(...a);
  const search = async (qs) => {
    const p = await (await b.newContext(opts)).newPage();
    await p.goto(base + `/listings?city=${city}${qs}`);
    const text = await p.textContent('main');
    await p.context().close();
    return text;
  };

  const o = await (await b.newContext(opts)).newPage();
  o.on('pageerror', (e) => log('PAGEERROR', e.message));
  await o.goto(base + '/signup?role=owner');
  await o.fill('#name', 'Rosa Villanueva'); await o.fill('#email', `downer${stamp}@example.com`); await o.fill('#password', 'password123');
  await o.check('input[name=consent]'); await o.click('button:has-text("Create account")'); await o.waitForURL('**/dashboard');

  // Dorm building: 2 floors x 3 rooms, 4 beds each, female only
  await o.goto(base + '/dashboard/buildings/new');
  await o.click('text=Dormitory / boarding house');
  await o.fill('input[name=name]', dormName);
  await o.fill('input[name=city]', city); await o.fill('input[name=province]', 'Cebu');
  await o.selectOption('select[name=genderPolicy]', 'female');
  await o.fill('input[name=curfew]', '10:00 PM');
  await o.fill('textarea[name=houseRules]', 'No visitors in rooms.\nNo cooking in rooms.');
  await o.fill('input[name=floors]', '2'); await o.fill('input[name=unitsPerFloor]', '3');
  assert((await o.textContent('form')).includes('6 rooms'), 'preview says 6 rooms');
  await o.fill('input[name=bedsPerRoom]', '4');
  await o.fill('input[name=monthlyRentPhp]', '3000');
  await o.check('input[name=publish]');
  await o.setInputFiles('input[name=photos]', [photo]);
  if (shots) await o.screenshot({ path: shots + '/dorm-form.png', fullPage: true });
  await o.click('button:has-text("Create building and rooms")');
  await o.waitForURL(/\/dashboard\/buildings\/[0-9a-f-]+\?created=6/);
  const buildingId = o.url().split('?')[0].split('/').pop();
  await o.waitForFunction(() => /Beds\s*24/.test(document.body.innerText));
  log('dorm created: 6 rooms, 24 beds');

  // Room 101: 3 of 4 beds already taken
  for (let i = 1; i <= 3; i++) {
    await o.click('button[aria-label="One more bed taken in room 101"]');
    await o.waitForFunction((n) => document.body.innerText.includes(`${n}/4 beds`), i);
  }
  // Room 102: full
  await o.check('input[aria-label="Select room 102"]');
  await o.click('button:has-text("Mark full")');
  await o.waitForFunction(() => /Beds taken\s*7/.test(document.body.innerText));
  if (shots) await o.screenshot({ path: shots + '/dorm-grid.png', fullPage: true });
  log('bed counts ok');

  // Standalone bedspace, male only, 1 of 2 beds free
  await o.goto(base + '/dashboard/properties/new');
  await o.fill('input[name=title]', `Bedspace for working men ${stamp}`);
  await o.selectOption('select[name=type]', 'bedspace');
  await o.fill('input[name=bedsTotal]', '2'); await o.fill('input[name=bedsTaken]', '1');
  await o.selectOption('select[name=genderPolicy]', 'male');
  await o.fill('input[name=monthlyRentPhp]', '2500');
  await o.fill('input[name=city]', city); await o.fill('input[name=province]', 'Cebu');
  await o.click('button:has-text("Publish listing")'); await o.waitForURL('**/dashboard?saved=published');
  assert((await o.textContent('main')).includes('1/2 beds taken'), 'dashboard bed stepper');
  log('standalone bedspace ok');

  // Search: full room 102 hidden; "For women" hides the men-only bedspace
  let all = await search('');
  assert(all.includes('5 places found') || all.includes('6 places found'), 'count: 5 dorm rooms + bedspace = 6, got ' + all.match(/\d+ places? found/));
  assert(!all.includes('Room 102'), 'full room hidden');
  assert(all.includes('1 of 4 beds free') && all.includes('/bed'), 'card shows beds and per bed');
  let women = await search('&for=female');
  assert(women.includes('5 places found') && !women.includes('working men') && women.includes('Female only'), 'women filter');
  let men = await search('&for=male');
  assert(men.includes('1 place found') && men.includes('working men'), 'men filter');
  log('search ok');

  // Public building page and listing page
  const r = await (await b.newContext(opts)).newPage();
  await r.goto(base + `/buildings/${buildingId}`);
  assert((await r.textContent('main')).includes('17 beds available in 5 rooms'), 'building beds available');
  assert((await r.textContent('main')).includes('Curfew: 10:00 PM'), 'building curfew');
  await r.click('tr:has-text("101") >> text=View & apply');
  await r.waitForSelector('text=1 bed available');
  const listingUrl = r.url();
  const main = await r.textContent('main');
  assert(main.includes('Female only') && main.includes('10:00 PM') && main.includes('No cooking in rooms') && main.includes('per bed'), 'listing rules');
  if (shots) { await r.waitForFunction(() => [...document.images].every(i => i.complete)); await r.screenshot({ path: shots + '/dorm-listing.png', fullPage: true }); }
  log('public pages ok');

  // A renter applies for the last bed in 101; approving fills the room
  await r.click('text=Sign up to apply');
  await r.fill('#name', 'Joy Bautista'); await r.fill('#email', `drenter${stamp}@example.com`); await r.fill('#password', 'password123');
  await r.check('input[name=consent]'); await r.click('button:has-text("Create account")');
  await r.waitForURL(listingUrl);
  await r.waitForSelector('text=Apply for a bed');
  await r.fill('input[name=moveInDate]', new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10));
  await r.fill('input[name=employment]', 'Nursing student');
  await r.click('button:has-text("Send application")'); await r.waitForURL('**/applications?sent=1');
  await o.goto(base + '/dashboard/applications');
  const card = o.locator('li', { hasText: 'Joy Bautista' });
  await card.locator('button:has-text("Approve")').click();
  await card.locator('text=Approved').waitFor();
  all = await search('');
  assert(all.includes('5 places found') && !all.includes('1 of 4 beds free'), 'room 101 full after approval');
  await o.goto(base + `/dashboard/buildings/${buildingId}`);
  assert((await o.textContent('main')).includes('4/4 beds'), 'grid shows 101 full');
  log('approve fills bed');

  // Changing the decision frees the bed again
  await o.goto(base + '/dashboard/applications');
  await card.locator('button:has-text("Reject")').click();
  await card.locator('button:has-text("Approve")').waitFor();
  all = await search('');
  assert(all.includes('6 places found') && all.includes('1 of 4 beds free'), 'room 101 back after reject');
  log('ALL DORM CHECKS PASSED');
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
