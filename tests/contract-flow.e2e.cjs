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
  assert(t.includes('[LESSOR CIVIL STATUS], [LESSOR CITIZENSHIP], with residence address at [LESSOR ADDRESS]'), 'lessor blanks in default');
  // Your details: saved once, filled into every contract
  await o.fill('input[name=civilStatus]', 'married');
  await o.fill('input[name=address]', '51 Seattle Street, Cubao, Quezon City');
  await o.click('button:has-text("Save my details")');
  await o.locator('text=Saved.').first().waitFor();
  t = t.replace('**5-day** grace period', '**3-day** grace period');
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
  const fld = (label) => o.locator(`[aria-label="${label}"]`);
  const prefilled = {
    'Your full name': 'Josefa Santos', 'Your civil status': 'married', 'Your citizenship': 'Filipino',
    'Your residence address': '51 Seattle Street, Cubao, Quezon City', "Renter's full name": 'Daisy Cruz',
    "Renter's residence address": '12 Mango Ave, Cebu City', "Renter's ID type and number": "Driver's license N01-23-456789",
    'Address of the unit': '2559 Isabel Street, Barangay 884, Manila, Metro Manila', 'Monthly rent (₱)': '11000',
    'Security deposit (months)': '2', 'Maximum occupants': '3', 'Start of lease': '2026-12-07', 'Lease period (months)': '6',
    'End of lease': '2027-06-06',
  };
  for (const [label, v] of Object.entries(prefilled)) assert(await fld(label).inputValue() === v, `prefilled ${label}: ${await fld(label).inputValue()}`);
  assert((await fld('House rules').inputValue()).includes('No overnight visitors'), 'house rules prefilled');
  assert(await o.locator('text=Not filled in yet').count() === 1 && (await o.textContent('form')).includes("Renter's civil status"), 'missing civil status flagged');
  await fld("Renter's civil status").fill('single');
  await fld('Address of the unit').fill('Unit 4B, 2559 Isabel Street, Barangay 884, Manila, Metro Manila');
  // End date follows the lease period
  await fld('Lease period (months)').fill('12');
  assert(await fld('End of lease').inputValue() === '2027-12-06', 'end date recomputed');
  await fld('Lease period (months)').fill('6');
  assert(await o.locator('text=Not filled in yet').count() === 0, 'nothing missing');
  const preview = await o.textContent('article');
  for (const s of [
    'JOSEFA SANTOS, of legal age, married, Filipino, with residence address at 51 Seattle Street',
    'DAISY CRUZ, of legal age, single, Filipino, with residence address at 12 Mango Ave, Cebu City',
    'Unit 4B, 2559 Isabel Street, Barangay 884', 'SIX (6) MONTHS', 'DECEMBER 07, 2026 to JUNE 06, 2027',
    'ELEVEN THOUSAND PESOS ONLY (₱11,000.00)', 'two (2) month(s) rental in the total amount of TWENTY-TWO THOUSAND PESOS ONLY (₱22,000.00)',
    'THREE (3) OCCUPANT(S) ONLY', 'a. No overnight visitors without notice.', "Driver's license N01-23-456789", '3-day grace period',
  ]) assert(preview.includes(s), 'filled contract: ' + s);
  assert(!/\[[A-Z ]+\]/.test(preview.replace('[PAGE BREAK]', '')), 'no blanks left in preview');
  // Wording edit for this renter only
  await o.click('button:has-text("Edit wording")');
  const box = o.locator('textarea[aria-label="Contract wording"]');
  await box.fill((await box.inputValue()).replace('**NOTICES.**', '**NOTICES AND COMMUNICATIONS.**'));
  await o.click('button:has-text("Preview")');
  if (shots) await o.screenshot({ path: shots + '/contract-form.png', fullPage: true });
  await o.click('button:has-text("Save draft")');
  await o.waitForURL(`**/applications/${appId}/contract?saved=draft`);
  const doc = await o.textContent('article');
  for (const s of ['CONTRACT OF LEASE', 'JOSEFA SANTOS', 'DAISY CRUZ', 'Unit 4B, 2559 Isabel Street', 'NO PETS POLICY', 'NOTARY PUBLIC', 'NOTICES AND COMMUNICATIONS'])
    assert(doc.includes(s), 'contract text: ' + s);
  assert(!doc.includes('**'), 'bold markers rendered');
  assert(await o.locator('article strong:has-text("CONTRACT OF LEASE")').count() === 1, 'bold title');
  // Template unchanged by the per-renter edit
  await o.goto(base + '/dashboard/contract-template');
  assert(!(await tpl.inputValue()).includes('NOTICES AND COMMUNICATIONS'), 'template untouched by contract edit');
  await o.goto(base + `/applications/${appId}/contract`);
  if (shots) await o.pdf({ path: shots + '/contract.pdf', preferCSSPageSize: true, format: 'A4' });
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
  assert(await fld('Address of the unit').inputValue() === 'Unit 4B, 2559 Isabel Street, Barangay 884, Manila, Metro Manila', 'edit keeps saved details');
  assert((await o.textContent('article')).includes('NOTICES AND COMMUNICATIONS'), 'edit keeps saved wording');
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
  await fld('Monthly rent (₱)').fill('11500');
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
  assert((await tpl.inputValue()).includes('**5-day** grace period'), 'template reset to default');
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
