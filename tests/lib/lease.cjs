// Shared steps for the lease application flow in the e2e tests.

/** As the owner, open a listing's edit page and return its private application link. */
async function getApplyLink(owner, base, propertyId) {
  await owner.goto(`${base}/dashboard/properties/${propertyId}/edit`);
  await owner.click('button:has-text("Application link")');
  const input = owner.locator('input[aria-label="Application link"]');
  await input.waitFor();
  return input.inputValue();
}

/** Fill in and send the lease application form (renter must be on /apply/<token> and logged in). */
async function fillLease(page, { name, leaseStart, tenants = [], employer = 'Chong Hua Hospital' }) {
  await page.waitForSelector('text=Lease / rental information');
  if (name) await page.fill('input[name=fullName]', name);
  await page.fill('input[name=contactNumbers]', '0918 111 2222');
  await page.fill('input[name=address]', '12 Mango Ave, Cebu City');
  await page.fill('input[aria-label="ID 1 type"]', "Driver's license");
  await page.fill('input[aria-label="ID 1 number"]', 'N01-23-456789');
  await page.fill('input[name=employerName]', employer);
  await page.fill('input[name=emergencyName]', 'Maria Garcia');
  await page.fill('input[name=emergencyContact]', '0917 555 0000');
  await page.fill('input[name=leaseStart]', leaseStart || new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10));
  for (let i = 0; i < tenants.length; i++) {
    if (i > 0) await page.click('text=+ Add another tenant');
    await page.fill(`input[aria-label="Tenant ${i + 1} name"]`, tenants[i].name);
    await page.fill(`input[aria-label="Tenant ${i + 1} age"]`, String(tenants[i].age));
  }
  await page.check('input[name=agree]');
  await page.fill('input[name=signedName]', name || await page.inputValue('input[name=fullName]'));
  await page.click('button:has-text("Send lease application")');
}

module.exports = { getApplyLink, fillLease };
