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

  // Owner edits their contract template once: fills in their civil status and address, changes the grace period
  o.on('dialog', (d) => d.accept());
  await o.goto(base + '/dashboard');
  await o.click('a:has-text("Contract template")');
  await o.waitForURL('**/dashboard/contract-template');
  assert(await o.locator("text=You're using Oopa's default template").count() === 1, 'starts on default');
  const tpl = o.locator('textarea[aria-label="Contract template"]');
  let t = await tpl.inputValue();
  assert(t.includes('[RENTER NAME]') && t.includes('ABANDONED BELONGINGS') && t.includes('Article 1670'), 'default has blanks and protections');
  t = t.replace('**[LESSOR NAME]**, of legal age, ____________ (civil status), Filipino, with residence address at ________________________________________',
    '**[LESSOR NAME]**, of legal age, married, Filipino, with residence address at 51 Seattle Street, Cubao, Quezon City')
    .replace('**5-day** grace period', '**3-day** grace period');
  await tpl.fill(t);
  await o.click('button:has-text("Save my template")');
  await o.locator('text=Saved. Your next contracts will start from this template.').waitFor();
  await o.reload();
  assert(await o.locator("text=You're using your own saved template").count() === 1, 'own template saved');
  assert((await tpl.inputValue()).includes('**3-day** grace period'), 'saved text kept');
  log('template saved');

  // Owner prepares the contract: their template with this renter's blanks filled in
  await o.goto(base + '/dashboard/applications');
  await o.click('a:has-text("Prepare contract")');
  await o.waitForURL(`**/applications/${appId}/contract/edit`);
  const box = o.locator('textarea[aria-label="Contract text"]');
  let body = await box.inputValue();
  for (const s of [
    'JOSEFA SANTOS**, of legal age, married, Filipino, with residence address at 51 Seattle Street',
    'DAISY CRUZ**, of legal age', 'with residence address at 12 Mango Ave, Cebu City',
    '2559 Isabel Street, Barangay 884, Manila, Metro Manila', 'SIX (6) MONTHS', 'DECEMBER 07, 2026 to JUNE 06, 2027',
    'ELEVEN THOUSAND PESOS ONLY (₱11,000.00)', 'two (2)** month(s) rental in the total amount of **TWENTY-TWO THOUSAND PESOS ONLY (₱22,000.00)',
    'THREE (3) OCCUPANT(S) ONLY', 'a. No overnight visitors without notice.', "Driver's license N01-23-456789", '**3-day** grace period',
  ]) assert(body.includes(s), 'filled contract: ' + s);
  assert(!/\[(RENTER NAME|RENT|START DATE|END DATE|PROPERTY ADDRESS)\]/.test(body), 'blanks filled');
  // An edit for this renter only
  await box.fill(body.replace('2559 Isabel Street', 'Unit 4B, 2559 Isabel Street'));
  await o.click('button:has-text("Preview")');
  assert((await o.textContent('article')).includes('Unit 4B, 2559 Isabel Street'), 'preview shows edit');
  if (shots) await o.screenshot({ path: shots + '/contract-form.png', fullPage: true });
  await o.click('button:has-text("Save draft")');
  await o.waitForURL(`**/applications/${appId}/contract?saved=draft`);
  const doc = await o.textContent('article');
  for (const s of ['CONTRACT OF LEASE', 'JOSEFA SANTOS', 'DAISY CRUZ', 'Unit 4B, 2559 Isabel Street', 'NO PETS POLICY', 'NOTARY PUBLIC'])
    assert(doc.includes(s), 'contract text: ' + s);
  assert(!doc.includes('**'), 'bold markers rendered');
  assert(await o.locator('article strong:has-text("CONTRACT OF LEASE")').count() === 1, 'bold title');
  // Template unchanged by the per-renter edit
  await o.goto(base + '/dashboard/contract-template');
  assert(!(await tpl.inputValue()).includes('Unit 4B, 2559'), 'template untouched by contract edit');
  await o.goto(base + `/applications/${appId}/contract`);
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
  assert((await box.inputValue()).includes('Unit 4B, 2559 Isabel Street'), 'edit keeps saved contract');
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
  await box.fill((await box.inputValue()).replace(/ELEVEN THOUSAND PESOS ONLY \(₱11,000\.00\)/g, 'ELEVEN THOUSAND FIVE HUNDRED PESOS ONLY (₱11,500.00)'));
  await o.click('button:has-text("Save and send update to renter")');
  await o.waitForURL('**/contract?saved=updated');
  assert((await o.textContent('article')).includes('ELEVEN THOUSAND FIVE HUNDRED PESOS ONLY'), 'updated rent');
  await r.goto(base + `/applications/${appId}/contract`);
  assert(await r.locator('button:has-text("I\'ve reviewed it, ready to sign")').count() === 1, 'review reset after change');
  log('update resets review');

  // Reset the template to Oopa's default
  await o.goto(base + '/dashboard/contract-template');
  await o.click('button:has-text("Reset to Oopa default")');
  await o.waitForURL('**/contract-template?reset=1');
  assert((await tpl.inputValue()).includes('____________ (civil status)'), 'template reset to default');
  await o.goto(base + `/applications/${appId}/contract`);
  assert((await o.textContent('article')).includes('ELEVEN THOUSAND FIVE HUNDRED'), 'sent contract unchanged by reset');
  log('template reset ok');

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
