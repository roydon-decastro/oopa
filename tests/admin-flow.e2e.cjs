// End-to-end check of the site admin area. Start the app with ADMIN_EMAILS=siteadmin@example.com, then:
// BASE=http://localhost:3000 node tests/admin-flow.e2e.cjs
// Note: Better Auth rate-limits sign-ups (3 per 10s per IP), so leave ~10s between test runs.
/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require('playwright');
const assert = (c, m) => { if (!c) throw new Error('ASSERT: ' + m); };
(async () => {
  const base = process.env.BASE || 'http://localhost:3000';
  const photo = process.env.PHOTO || '/var/tmp/photo0.jpg';
  const shots = process.env.SHOTS;
  const stamp = Date.now();
  const title = `Studio near Ayala ${stamp}`;
  const ownerEmail = `owner${stamp}@example.com`;
  const b = await chromium.launch();
  const ctxOpts = { viewport: { width: 1280, height: 900 }, deviceScaleFactor: shots ? 2 : 1 };
  const log = (...a) => console.log(...a);
  const anonSees = async () => {
    const a = await (await b.newContext(ctxOpts)).newPage();
    await a.goto(base + `/listings?q=${stamp}`);
    await a.goto(base + '/listings?city=Makati');
    const n = await a.locator(`text=${title}`).count();
    await a.context().close();
    return n > 0;
  };

  // Owner publishes a listing
  const owner = await (await b.newContext(ctxOpts)).newPage();
  await owner.goto(base + '/signup?role=owner');
  await owner.fill('#name', 'Marites Santos'); await owner.fill('#email', ownerEmail); await owner.fill('#password', 'password123');
  await owner.check('input[name=consent]'); await owner.click('button:has-text("Create account")'); await owner.waitForURL('**/dashboard');
  await owner.goto(base + '/dashboard/properties/new');
  await owner.fill('input[name=title]', title);
  await owner.selectOption('select[name=type]', 'condo');
  await owner.fill('textarea[name=description]', 'Walking distance to Ayala Triangle.');
  await owner.fill('input[name=monthlyRentPhp]', '22000');
  await owner.fill('input[name=city]', 'Makati'); await owner.fill('input[name=province]', 'Metro Manila');
  await owner.setInputFiles('input[name=photos]', [photo]);
  await owner.click('button:has-text("Publish listing")'); await owner.waitForURL('**/dashboard?saved=published');
  const listingId = await owner.locator(`a:has-text("${title}")`).first().getAttribute('href');
  assert(await anonSees(), 'listing visible before takedown');
  log('owner published');

  // Non-admins don't see the admin area
  const res = await owner.goto(base + '/admin');
  assert(res.status() === 404, 'non-admin gets 404 on /admin');
  assert(await owner.locator('header >> text=Admin').count() === 0, 'no admin link for owner');
  log('non-admin blocked');

  // Admin logs in (or signs up the first time)
  const admin = await (await b.newContext(ctxOpts)).newPage();
  await admin.goto(base + '/login');
  await admin.fill('#email', 'siteadmin@example.com'); await admin.fill('#password', 'password123');
  await admin.click('main form button:has-text("Log in")');
  await admin.waitForTimeout(1500);
  if (admin.url().includes('/login')) {
    await admin.goto(base + '/signup');
    await admin.fill('#name', 'Site Admin'); await admin.fill('#email', 'siteadmin@example.com'); await admin.fill('#password', 'password123');
    await admin.check('input[name=consent]'); await admin.click('button:has-text("Create account")'); await admin.waitForTimeout(2000);
  }
  await admin.goto(base + '/');
  await admin.click('header >> text=Admin'); await admin.waitForURL('**/admin');
  await admin.waitForSelector('text=Live listings');
  if (shots) await admin.screenshot({ path: shots + '/admin-overview.png', fullPage: true });
  log('admin overview ok');

  // Take the listing down
  await admin.goto(base + `/admin/listings?q=${stamp}`);
  await admin.click('button:has-text("Take down")');
  await admin.selectOption('select', 'Fake or scam listing');
  await admin.click('div.bg-red-50 button:has-text("Take down")');
  await admin.waitForSelector('text=Reason: Fake or scam listing');
  if (shots) await admin.screenshot({ path: shots + '/admin-listings.png', fullPage: true });
  assert(!(await anonSees()), 'listing hidden after takedown');
  const anon = await (await b.newContext(ctxOpts)).newPage();
  assert((await anon.goto(base + listingId)).status() === 404, 'taken-down listing 404 for public');
  assert((await admin.goto(base + listingId)).status() === 200, 'admin can still open it');
  await owner.goto(base + '/dashboard');
  await owner.waitForSelector('text=Taken down by Oopa');
  await owner.click('text=Taken down by Oopa');
  await owner.waitForSelector('text=Reason: Fake or scam listing');
  // Owner re-publishing doesn't bring it back
  await owner.goto(base + '/dashboard');
  log('takedown ok');

  // Restore
  await admin.goto(base + '/admin/listings?show=removed&q=' + stamp);
  await admin.click('button:has-text("Restore")');
  await admin.waitForSelector('text=No listings match.');
  assert(await anonSees(), 'listing visible after restore');
  log('restore ok');

  // Suspend the owner
  await admin.goto(base + `/admin/users?q=${encodeURIComponent(ownerEmail)}`);
  await admin.click('button:has-text("Suspend")');
  await admin.click('button:has-text("Yes, suspend")');
  await admin.waitForSelector('text=/Suspended \\w/');
  if (shots) await admin.screenshot({ path: shots + '/admin-users.png', fullPage: true });
  assert(!(await anonSees()), 'suspended owner listing hidden');
  await owner.goto(base + '/dashboard');
  assert(owner.url().includes('/login'), 'suspended owner logged out');
  await owner.fill('#email', ownerEmail); await owner.fill('#password', 'password123');
  await owner.click('main form button:has-text("Log in")');
  await owner.waitForSelector('text=This account has been suspended');
  log('suspend ok');

  // Unsuspend
  await admin.click('button:has-text("Unsuspend")');
  await admin.waitForSelector('button:has-text("Suspend")');
  assert(await anonSees(), 'listing back after unsuspend');
  await owner.click('main form button:has-text("Log in")');
  await owner.waitForURL('**/dashboard');
  log('unsuspend ok');

  // Applications page renders
  await admin.goto(base + '/admin/applications');
  await admin.waitForSelector('text=Read-only');
  log('ALL ADMIN CHECKS PASSED');
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
