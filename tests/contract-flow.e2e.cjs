// End-to-end check of the contract of lease. Run against a running app: BASE=http://localhost:3000 node tests/contract-flow.e2e.cjs
// Better Auth rate-limits sign-ups (3 per 10s per IP), so leave ~10s between test runs.
/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require('playwright');
const { getApplyLink, fillLease } = require('./lib/lease.cjs');
const assert = (c, m) => { if (!c) throw new Error('ASSERT: ' + m); };
(async () => {
  const base = process.env.BASE || 'http://localhost:3000';
  const photo = process.env.PHOTO || '/var/tmp/photo0.jpg';
  const shots = process.env.SHOTS;
  const stamp = Date.now();
  const title = `Studio in Sta. Ana ${stamp}`;
  const b = await chromium.launch();
  const opts = { viewport: { width: 1280, height: 900 }, deviceScaleFactor: shots ? 2 : 1 };
  const log = (...a) => console.log(...a);

  // Owner lists a studio: ₱11,000, 2 months deposit, 6-month minimum, up to 3 occupants
  const o = await (await b.newContext(opts)).newPage();
  o.on('pageerror', (e) => log('PAGEERROR', e.message));
  await o.goto(base + '/signup?role=owner');
  await o.fill('#name', 'Josefa Santos'); await o.fill('#email', `cowner${stamp}@example.com`); await o.fill('#password', 'password123');
  await o.check('input[name=consent]'); await o.click('button:has-text("Create account")'); await o.waitForURL('**/dashboard');
  await o.goto(base + '/dashboard/properties/new');
  await o.fill('input[name=title]', title);
  await o.selectOption('select[name=type]', 'condo');
  await o.fill('textarea[name=description]', 'Studio unit near PUP.');
  await o.fill('input[name=monthlyRentPhp]', '11000');
  if (await o.locator('input[name=depositMonths]').count()) await o.fill('input[name=depositMonths]', '2');
  if (await o.locator('input[name=minLeaseMonths]').count()) await o.fill('input[name=minLeaseMonths]', '6');
  await o.fill('input[name=street]', '2559 Isabel Street'); await o.fill('input[name=barangay]', 'Barangay 884');
  await o.fill('input[name=city]', 'Manila'); await o.fill('input[name=province]', 'Metro Manila');
  await o.setInputFiles('input[name=photos]', [photo]);
  await o.fill('input[name=maxOccupants]', '3');
  await o.fill('textarea[name=leaseTerms]', 'No overnight visitors without notice.');
  await o.click('button:has-text("Publish listing")'); await o.waitForURL('**/dashboard?saved=published');
  const propertyId = (await o.locator('li', { hasText: title }).locator(`a:has-text("${title}")`).getAttribute('href')).split('/').pop();

  // Renter applies through the link, owner approves
  const r = await (await b.newContext(opts)).newPage();
  r.on('pageerror', (e) => log('PAGEERROR renter', e.message));
  const link = await getApplyLink(o, base, propertyId);
  await r.goto(link);
  await r.click('text=Create an account');
  await r.fill('#name', 'Daisy Cruz'); await r.fill('#email', `crenter${stamp}@example.com`); await r.fill('#password', 'password123');
  await r.check('input[name=consent]'); await r.click('button:has-text("Create account")'); await r.waitForURL('**' + new URL(link).pathname);
  await fillLease(r, { name: 'Daisy Cruz', leaseStart: '2026-12-07' });
  await r.waitForURL(/\/lease\?sent=1/);
  const appId = r.url().split('/applications/')[1].split('/')[0];

  await o.goto(base + '/dashboard/applications');
  assert(await o.locator('text=Prepare contract').count() === 0, 'no contract before approval');
  await o.locator('li', { hasText: 'Daisy Cruz' }).locator('button:has-text("Approve")').click();
  await o.locator('a:has-text("Prepare contract")').waitFor();
  log('approved');

  // Owner prepares the contract: prefilled from listing + lease application
  await o.click('a:has-text("Prepare contract")');
  await o.waitForURL(`**/applications/${appId}/contract/edit`);
  const val = (n) => o.inputValue(`[name="${n}"]`);
  assert(await val('lessee.name') === 'Daisy Cruz', 'lessee name prefilled');
  assert(await val('lessee.address') === '12 Mango Ave, Cebu City', 'lessee address prefilled');
  assert(await val('lessee.idNumber') === 'N01-23-456789', 'lessee id prefilled');
  assert(await val('lessor.name') === 'Josefa Santos', 'lessor name prefilled');
  assert(await val('address') === '2559 Isabel Street, Barangay 884, Manila, Metro Manila', 'address prefilled');
  assert(await val('rentPhp') === '11000', 'rent prefilled');
  assert(await val('maxOccupants') === '3', 'occupants prefilled');
  assert(await val('startDate') === '2026-12-07', 'start prefilled');
  assert((await val('otherRules')).includes('No overnight visitors'), 'covenants prefilled');
  assert(await val('graceDays') === '5' && await val('penalty3') === '20', 'template defaults');
  await o.fill('input[name=months]', '6');
  await o.fill('input[name=depositMonths]', '2');
  assert(await o.locator('text=Ends JUNE 06, 2027').count() === 1, 'end date hint');
  await o.selectOption('select[name="lessee.civilStatus"]', 'single');
  // Missing lessor details → error
  await o.click('button:has-text("Save draft")');
  await o.waitForTimeout(300);
  assert(o.url().endsWith('/contract/edit'), 'stays on form when lessor details missing');
  await o.selectOption('select[name="lessor.civilStatus"]', 'married');
  await o.fill('input[name="lessor.address"]', '51 Seattle Street, Cubao, Quezon City');
  await o.selectOption('select[name="lessor.capacity"]', 'coowner');
  await o.fill('input[name="lessor.idType"]', 'UMID');
  await o.fill('input[name="lessor.idNumber"]', 'CRN-0000-1111111-2');
  await o.fill('input[name=premises]', 'Unit 4B of the five-storey residential building');
  await o.fill('input[name=witness1]', 'Mark Reyes');
  if (shots) await o.screenshot({ path: shots + '/contract-form.png', fullPage: true });
  await o.click('button:has-text("Save draft")');
  await o.waitForURL(`**/applications/${appId}/contract?saved=draft`);
  const doc = await o.textContent('article');
  for (const s of [
    'JOSEFA SANTOS', 'of legal age, married, Filipino, with residence address at 51 Seattle Street',
    'DAISY CRUZ', 'a co-owner and the appointed representative of the owners of Unit 4B',
    'SIX (6) MONTHS', 'DECEMBER 07, 2026 to JUNE 06, 2027', 'ELEVEN THOUSAND PESOS ONLY (₱11,000.00)',
    'every 7th day of the month', '5-day', 'TWO (2) months rental fee', 'TWENTY-TWO THOUSAND PESOS ONLY (₱22,000.00)',
    'THREE (3) OCCUPANTS ONLY', '(NO PETS POLICY)', '(NO GASUL)', 'No overnight visitors without notice.',
    'SIXTY (60) DAYS', 'MARK REYES', 'UMID / CRN-0000-1111111-2', "Driver's license / N01-23-456789", 'Condition No.3.2',
  ]) assert(doc.includes(s), 'contract text: ' + s);
  log('draft saved, wording ok');
  const anon0 = await (await b.newContext(opts)).newPage();
  assert((await anon0.goto(base + '/listings/' + propertyId)).status() === 200, 'listing still live while contract is a draft');
  await anon0.close();

  // Renter can't see a draft
  assert((await r.goto(base + `/applications/${appId}/contract`)).status() === 404, 'draft hidden from renter');
  await r.goto(base + '/applications');
  assert(await r.locator('text=Review your contract of lease').count() === 0, 'no contract link for draft');

  // Owner sends it
  await o.click('text=Edit contract');
  assert(await val('lessor.address') === '51 Seattle Street, Cubao, Quezon City', 'edit keeps saved values');
  await o.click('button:has-text("Save and send to renter")');
  await o.waitForURL('**/contract?saved=sent-unpublished');
  assert(await o.locator('text=unpublished your listing').count() === 1, 'unpublish notice');
  const anon = await (await b.newContext(opts)).newPage();
  assert((await anon.goto(base + '/listings/' + propertyId)).status() === 404, 'listing unpublished after sending contract');
  await anon.close();
  assert(await o.locator('text=Waiting for them to review it').count() === 1, 'owner sees sent');
  log('sent');

  // Renter reads it and marks it reviewed
  await r.goto(base + '/applications');
  await r.click('text=Review your contract of lease');
  await r.waitForURL(`**/applications/${appId}/contract`);
  assert((await r.textContent('article')).includes('DAISY CRUZ'), 'renter sees contract');
  assert(await r.locator('text=Edit contract').count() === 0, 'renter cannot edit');
  if (shots) await r.screenshot({ path: shots + '/contract-view.png', fullPage: true });
  await r.click('button:has-text("I\'ve reviewed it, ready to sign")');
  await r.locator('text=You marked this as reviewed').waitFor();
  assert((await r.goto(base + `/applications/${appId}/contract/edit`)).url().includes('/owners'), 'renter blocked from edit');
  log('renter reviewed');

  await o.goto(base + '/dashboard/applications');
  assert(await o.locator('text=Contract · reviewed by renter').count() === 1, 'owner list shows reviewed');
  await o.click('text=Contract · reviewed by renter');
  await o.waitForURL(`**/applications/${appId}/contract`);
  assert(await o.locator('text=reviewed it on').count() === 1, 'owner sees reviewed');

  // Owner changes rent after review → renter must review again
  await o.click('text=Edit contract');
  assert(await o.locator('button:has-text("Save draft")').count() === 0, 'no draft once sent');
  await o.fill('input[name=rentPhp]', '11500');
  await o.click('button:has-text("Save and send update to renter")');
  await o.waitForURL('**/contract?saved=updated');
  assert((await o.textContent('article')).includes('ELEVEN THOUSAND FIVE HUNDRED PESOS ONLY'), 'updated rent');
  await r.goto(base + `/applications/${appId}/contract`);
  assert(await r.locator('button:has-text("I\'ve reviewed it, ready to sign")').count() === 1, 'review reset after change');
  log('update resets review');

  // A stranger can't see it
  const s = await (await b.newContext(opts)).newPage();
  await s.goto(base + '/signup');
  await s.fill('#name', 'Nosy Neighbor'); await s.fill('#email', `cnosy${stamp}@example.com`); await s.fill('#password', 'password123');
  await s.check('input[name=consent]'); await s.click('button:has-text("Create account")'); await s.waitForURL('**/listings');
  assert((await s.goto(base + `/applications/${appId}/contract`)).status() === 404, 'contract hidden from others');
  log('privacy ok');
  await b.close();
  log('ALL PASSED');
})().catch(async (e) => { console.error('FAIL', e.stack); process.exit(1); });
