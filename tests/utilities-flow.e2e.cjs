// End-to-end check of electricity/water sub-meters. Run against a running app: BASE=http://localhost:3000 node tests/utilities-flow.e2e.cjs
// Better Auth rate-limits sign-ups (3 per 10s per IP), so leave ~10s between test runs.
/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require('playwright');
const assert = (c, m) => { if (!c) throw new Error('ASSERT: ' + m); };
(async () => {
  const base = process.env.BASE || 'http://localhost:3000';
  const shots = process.env.SHOTS;
  const stamp = Date.now();
  const b = await chromium.launch();
  const o = await (await b.newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: shots ? 2 : 1 })).newPage();
  const log = (...a) => console.log(...a);
  o.on('pageerror', (e) => log('PAGEERROR', e.message));

  await o.goto(base + '/signup?role=owner');
  await o.fill('#name', 'Mila Cruz'); await o.fill('#email', `uowner${stamp}@example.com`); await o.fill('#password', 'password123');
  await o.check('input[name=consent]'); await o.click('button:has-text(\"Create account\")'); await o.waitForURL('**/dashboard');

  // Building: 2 floors x 3 units, electricity sub-metered at 13.50/kWh, water sub-metered 80/m3 with 150 minimum
  await o.goto(base + '/dashboard/buildings/new');
  await o.fill('input[name=name]', `Meter Test ${stamp}`);
  await o.fill('input[name=city]', 'Quezon City'); await o.fill('input[name=province]', 'Metro Manila');
  await o.fill('input[name=floors]', '2'); await o.fill('input[name=unitsPerFloor]', '3');
  await o.fill('input[name=monthlyRentPhp]', '8000');
  await o.selectOption('select[name=electricityBilling]', 'submeter');
  await o.fill('input[name=electricityRatePhp]', '13.5');
  await o.selectOption('select[name=waterBilling]', 'submeter');
  await o.fill('input[name=waterRatePhp]', '80');
  await o.fill('input[name=waterMinimumPhp]', '150');
  await o.check('input[name=publish]');
  await o.click('button:has-text("Create building and units")');
  await o.waitForURL(/created=6/);
  const bUrl = o.url().split('?')[0];
  log('building created');

  // Unit 102 has its own Meralco account
  await o.click('a:has(p:text-is("102"))'); await o.waitForURL('**/edit');
  assert((await o.textContent('select[name=electricityBilling]')).includes('Same as building (Sub-metered · ₱13.50/kWh)'), 'inherited label');
  await o.selectOption('select[name=electricityBilling]', 'direct');
  await o.fill('input[name=electricMeterNo]', 'MER-55821');
  await o.click('button:has-text("Save changes")'); await o.waitForURL(bUrl + '?saved=1');

  // Baseline electricity readings on Oct 1
  await o.goto(bUrl + '/meters?utility=electricity&date=2026-10-01');
  assert(await o.locator('tbody tr').count() === 5, 'unit 102 excluded from electricity');
  assert((await o.textContent('main')).includes("Not listed here because they aren't sub-metered for electricity: 102"), 'note excluded');
  const base1 = { 101: 1000, 103: 2000, 201: 500, 202: 750, 203: 0 };
  for (const [u, v] of Object.entries(base1)) await o.fill(`input[aria-label="Unit ${u} reading"]`, String(v));
  await o.click('button:has-text("Save readings")');
  await o.locator('text=Saved 5 readings').waitFor();
  log('baseline saved');

  // Nov 1 readings: usage computed live
  await o.goto(bUrl + '/meters?utility=electricity&date=2026-11-01');
  const nov = { 101: 1120, 103: 2085.5, 201: 640, 202: 750 };
  for (const [u, v] of Object.entries(nov)) await o.fill(`input[aria-label="Unit ${u} reading"]`, String(v));
  // 120*13.5=1620, 85.5*13.5=1154.25, 140*13.5=1890, 0 => 4664.25
  assert((await o.textContent('tfoot')).includes('₱4,664.25'), 'live total ' + await o.textContent('tfoot'));
  await o.fill('input[aria-label="Unit 203 reading"]', '-5');
  await o.fill('input[aria-label="Unit 203 reading"]', '');
  await o.click('button:has-text("Save readings")');
  await o.locator('text=Saved 4 readings').waitFor();
  if (shots) await o.screenshot({ path: shots + '/meters.png', fullPage: true });
  // Lower than previous is rejected
  await o.fill('input[aria-label="Unit 101 reading"]', '900');
  await o.click('button:has-text("Save readings")');
  await o.locator('text=is lower than the previous reading').waitFor();
  log('electricity readings ok');

  // Water: 101 uses 1.2 m3 -> 96 -> minimum 150; 103 uses 4 -> 320
  await o.goto(bUrl + '/meters?utility=water&date=2026-10-01');
  assert(await o.locator('tbody tr').count() === 6, 'all 6 on water');
  await o.fill('input[aria-label="Unit 101 reading"]', '10'); await o.fill('input[aria-label="Unit 103 reading"]', '20');
  await o.click('button:has-text("Save readings")'); await o.locator('text=Saved 2 readings').waitFor();
  await o.goto(bUrl + '/meters?utility=water&date=2026-11-01');
  await o.fill('input[aria-label="Unit 101 reading"]', '11.2'); await o.fill('input[aria-label="Unit 103 reading"]', '24');
  assert((await o.textContent('tfoot')).includes('₱470.00'), 'water total with minimum');
  await o.click('button:has-text("Save readings")'); await o.locator('text=Saved 2 readings').waitFor();
  log('water readings ok');

  // Unit 101 bill history + statement
  await o.goto(bUrl);
  await o.click('a:has(p:text-is("101"))'); await o.waitForURL('**/edit');
  await o.click('text=Utility bills'); await o.waitForURL('**/utilities');
  assert((await o.textContent('main')).includes('₱1,620.00'), 'history shows electricity charge');
  await o.click('text=November 2026'); await o.waitForURL('**/statement?month=2026-11');
  const st = await o.textContent('article');
  assert(st.includes('₱1,620.00') && st.includes('₱150.00') && st.includes('(minimum charge)') && st.includes('₱1,770.00'), 'statement totals: ' + st);
  if (shots) await o.screenshot({ path: shots + '/statement.png' });
  log('statement ok');

  // Delete latest only
  await o.goBack();
  await o.locator('section', { hasText: 'Electricity' }).locator('button:has-text("Delete")').first().click();
  await o.waitForFunction(() => !document.body.innerText.includes('₱1,620.00'));
  log('delete latest ok');

  // Renter sees utility terms on the listing
  const r = await (await b.newContext()).newPage();
  await r.goto(base + `/listings?city=${encodeURIComponent('Meter Test ' + stamp)}`);
  await r.click('text=Unit 102');
  await r.waitForSelector('text=Move-in cost');
  const page = await r.textContent('main');
  assert(page.includes('Own meter · tenant pays the electric company directly'), 'unit 102 direct');
  assert(page.includes('Sub-metered · ₱80.00/m³ · minimum ₱150'), 'water terms shown');
  log('listing terms ok');
  await b.close();
  log('ALL PASSED');
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
