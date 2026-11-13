// Checks the sign-up bot check (Cloudflare Turnstile) with a fake widget and a fake verify server.
// Build with NEXT_PUBLIC_TURNSTILE_SITE_KEY=test-site, start with TURNSTILE_SECRET_KEY=test-secret and
// TURNSTILE_VERIFY_URL pointing at a stand-in that accepts only "good-token". Then:
// BASE=http://localhost:3000 node tests/captcha-flow.e2e.cjs
/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require('playwright');
const assert = (c, m) => { if (!c) throw new Error('ASSERT: ' + m); };
const fakeWidget = (token) => `window.turnstile = {
  render(el, o) { el.textContent = 'fake check'; setTimeout(() => o.callback(${JSON.stringify(token)}), 300); return 'w1'; },
  reset() {}, remove() {} };`;
(async () => {
  const base = process.env.BASE || 'http://localhost:3000';
  const stamp = Date.now();
  const b = await chromium.launch();
  const log = (...a) => console.log(...a);

  // A bot posting straight to the API without solving the check is refused.
  const direct = await fetch(base + '/api/auth/sign-up/email', {
    method: 'POST', headers: { 'content-type': 'application/json', origin: base },
    body: JSON.stringify({ email: `bot${stamp}@example.com`, password: 'password123', name: 'Bot' }),
  });
  assert(direct.status >= 400, 'direct API sign-up without captcha refused, got ' + direct.status);
  log('direct API blocked:', direct.status);

  const signup = async (token) => {
    const ctx = await b.newContext();
    await ctx.route('https://challenges.cloudflare.com/**', (r) => r.fulfill({ contentType: 'text/javascript', body: fakeWidget(token) }));
    const p = await ctx.newPage();
    await p.goto(base + '/signup');
    await p.fill('#name', 'Captcha Test'); await p.fill('#email', `cap${token}${stamp}@example.com`); await p.fill('#password', 'password123');
    await p.check('input[name=consent]');
    return p;
  };

  // Fails verification: friendly error, no account.
  const bad = await signup('bad-token');
  await bad.waitForSelector('button:has-text("Create account"):enabled');
  await bad.click('button:has-text("Create account")');
  await bad.waitForSelector("text=The security check didn't go through");
  assert(bad.url().includes('/signup'), 'stays on sign-up');
  log('bad token rejected');

  // Button waits for the check before it can be clicked.
  const ctx = await b.newContext();
  await ctx.route('https://challenges.cloudflare.com/**', (r) => r.fulfill({ contentType: 'text/javascript', body: 'window.turnstile={render(){return "w"},reset(){},remove(){}}' }));
  const waiting = await ctx.newPage();
  await waiting.goto(base + '/signup');
  await waiting.waitForSelector("button:has-text(\"Checking you're not a robot\"):disabled");
  log('button disabled until check passes');

  // Passes verification: account created.
  const good = await signup('good-token');
  await good.waitForSelector('button:has-text("Create account"):enabled');
  await good.click('button:has-text("Create account")');
  await good.waitForURL('**/listings');
  log('good token signs up');

  // Login isn't affected.
  const login = await (await b.newContext()).newPage();
  await login.goto(base + '/login');
  await login.fill('#email', `capgood-token${stamp}@example.com`); await login.fill('#password', 'password123');
  await login.click('main form button:has-text("Log in")');
  await login.waitForURL('**/dashboard**').catch(() => {});
  assert(!login.url().includes('/login'), 'login works without captcha');
  log('ALL CAPTCHA CHECKS PASSED');
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
