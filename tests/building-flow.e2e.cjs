// End-to-end check of buildings and units. Run against a running app: BASE=http://localhost:3000 node tests/building-flow.e2e.cjs
// Set PHOTO to a JPG path. Better Auth rate-limits sign-ups (3 per 10s per IP), so leave ~10s between test runs.
/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require('playwright');
const assert = (c, m) => { if (!c) throw new Error('ASSERT: ' + m); };
(async () => {
  const base = process.env.BASE || 'http://localhost:3000';
  const photo = process.env.PHOTO || '/var/tmp/photo1.jpg';
  const shots = process.env.SHOTS;
  const stamp = Date.now();
  const name = `Casa Verde ${stamp}`;
  const b = await chromium.launch();
  const opts = { viewport: { width: 1280, height: 900 }, deviceScaleFactor: shots ? 2 : 1 };
  const log = (...a) => console.log(...a);
  const imgs = (p) => p.waitForFunction(() => [...document.images].every((i) => i.complete));

  const o = await (await b.newContext(opts)).newPage();
  o.on('pageerror', (e) => log('PAGEERROR', e.message));
  await o.goto(base + '/signup?role=owner');
  await o.fill('#name', 'Ramon Tan'); await o.fill('#email', `bowner${stamp}@example.com`); await o.fill('#password', 'password123');
  await o.click('button:has-text("Create account")'); await o.waitForURL('**/dashboard');

  // Create a 4-floor, 5-per-floor building as drafts
  await o.click('text=+ Add a building');
  await o.waitForURL('**/buildings/new');
  await o.fill('input[name=name]', name);
  await o.fill('textarea[name=description]', 'Family-friendly apartments 5 minutes from SM City. Gate closes at 11 PM.');
  await o.fill('input[name=street]', '88 Juan Luna Ave'); await o.fill('input[name=barangay]', 'Mabolo');
  await o.fill('input[name=city]', 'Cebu City'); await o.fill('input[name=province]', 'Cebu');
  await o.check('input[value="CCTV"]'); await o.check('input[value="Water tank"]');
  assert((await o.textContent('form')).includes('20 units'), 'preview count 20');
  await o.fill('input[name=monthlyRentPhp]', '9500');
  await o.fill('input[name=floorAreaSqm]', '24');
  await o.setInputFiles('input[name=photos]', [photo]);
  if (shots) await o.screenshot({ path: shots + '/building-form.png', fullPage: true });
  await o.click('button:has-text("Create building and units")');
  await o.waitForURL(/\/dashboard\/buildings\/[0-9a-f-]+\?created=20/);
  const buildingUrl = o.url().split('?')[0];
  const buildingId = buildingUrl.split('/').pop();
  assert(await o.locator('text=Floor 4').count() === 1, 'floor 4 row');
  for (const u of ['101', '105', '401', '405']) assert(await o.locator(`p:text-is("${u}")`).count() === 1, 'unit ' + u);
  log('created 20 units');

  // Mark floors 1-3 occupied, list floor 4 as vacant, set 401-402 rent
  for (const f of [1, 2, 3]) await o.check(`label:has-text("Floor ${f}") input`);
  await o.click('button:has-text("Mark occupied")');
  await o.waitForFunction(() => document.body.innerText.includes('75%'));
  await o.check('label:has-text("Floor 4") input');
  await o.click('button:has-text("List as vacant")');
  await o.waitForFunction(() => document.body.innerText.match(/Vacant & listed\s*5/));
  await o.check('input[aria-label="Select unit 401"]'); await o.check('input[aria-label="Select unit 402"]');
  await o.fill('input[placeholder="Rent ₱"]', '11000');
  await o.click('button:has-text("Set rent")');
  await o.waitForFunction(() => document.body.innerText.includes('₱11,000'));
  log('bulk status + rent ok');

  // Add unit 406
  await o.fill('input[name=unitLabel]', '406'); await o.fill('input[name=floor]', '4');
  await o.click('button:has-text("Add unit")');
  await o.locator('p:text-is("406")').waitFor();
  await o.fill('input[name=unitLabel]', '406'); await o.click('button:has-text("Add unit")');
  await o.locator('text=Unit 406 already exists').waitFor();
  log('add unit + duplicate guard ok');

  // Edit unit 403: becomes 2BR corner unit
  await o.click('a:has(p:text-is("403"))');
  await o.waitForURL('**/edit');
  assert(await o.locator('input[name=city]').count() === 0, 'no location fields for unit');
  await o.fill('input[name=bedrooms]', '2');
  await o.fill('textarea[name=description]', 'Corner unit with balcony.');
  await o.click('button:has-text("Save changes")');
  await o.waitForURL(buildingUrl + '?saved=1');
  if (shots) await o.screenshot({ path: shots + '/building-grid.png', fullPage: true });
  log('unit edit ok');

  // Rename building propagates to unit titles
  await o.click('text=Edit building');
  await o.fill('input[name=name]', name + ' Residences');
  await o.click('button:has-text("Save building")');
  await o.waitForURL(buildingUrl + '?saved=1');

  // Renter: browse shows units, building page lists 5 vacant (401-405, not 406 draft)
  const r = await (await b.newContext(opts)).newPage();
  await r.goto(base + `/listings?city=${encodeURIComponent(name)}`);
  const found = await r.locator('a[href^="/listings/"]').count();
  assert(found === 5, 'browse finds 5 listed units, got ' + found);
  assert(await r.locator(`text=${name} Residences – Unit 401`).count() === 1, 'renamed title');
  await r.goto(base + '/buildings/' + buildingId);
  assert((await r.textContent('h2')).includes('5 units available'), 'building page 5 available');
  assert(await r.locator('td:text-is("101")').count() === 0, 'occupied unit hidden');
  if (shots) { await imgs(r); await r.screenshot({ path: shots + '/building-public.png', fullPage: true }); }
  await r.locator('tr', { hasText: '403' }).locator('text=View & apply').click();
  await r.waitForSelector('text=Corner unit with balcony.');
  const body = await r.textContent('main');
  assert(body.includes('403 · Floor 4') && body.includes('Water tank') && body.includes('About ' + name), 'unit page merges building info');
  assert(await r.locator('main img').count() >= 1, 'building photo used for unit');
  // Apply
  await r.click('text=Sign up to apply');
  await r.fill('#name', 'Ana Lim'); await r.fill('#email', `brenter${stamp}@example.com`); await r.fill('#password', 'password123');
  const unitUrl = new URL(r.url()).searchParams.get('next');
  await r.click('button:has-text("Create account")'); await r.waitForURL('**' + unitUrl);
  await r.fill('input[name=moveInDate]', new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10));
  await r.click('button:has-text("Send application")'); await r.waitForURL('**/applications?sent=1');
  log('renter applied to unit 403');

  await o.goto(buildingUrl);
  assert(await o.locator('text=1 new application').count() === 1, 'grid shows new application');
  await o.goto(base + '/dashboard');
  assert((await o.textContent('main')).includes('21 units'), 'dashboard building card');
  log('owner sees application');
  await b.close();
  log('ALL PASSED');
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
