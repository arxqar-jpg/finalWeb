const { chromium } = require(process.env.CODEQUIZ_PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.CODEQUIZ_BASE_URL || 'http://127.0.0.1:4173/';
const passed = [], errors = [];
async function test(name, fn) { await fn(); passed.push(name); console.log('PASS', name); }
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage(); page.setDefaultTimeout(10000); page.on('pageerror', e => errors.push(e.message));
    const go = () => page.goto(base + 'index.html', { waitUntil: 'domcontentloaded' });
    try {
        await test('Typing and correcting a password keeps registration open on the same page', async () => {
            await go(); await page.locator('.signup-button').click();
            await page.locator('#reg-name').fill('Regression Student');
            await page.locator('#reg-password').pressSequentially('weak');
            assert.match(await page.locator('#err-reg-password').innerText(), /8|uppercase/);
            assert.ok(await page.locator('#custom-modal-overlay').isVisible());
            await page.locator('#reg-password').fill('Practice9!');
            assert.equal(await page.locator('#err-reg-password').innerText(), '');
            assert.ok(await page.locator('#custom-modal-overlay').isVisible());
            assert.ok(page.url().endsWith('index.html'));
        });
        await test('A backdrop click does not dismiss a registration form with entered details', async () => {
            await page.mouse.click(4, 4);
            assert.ok(await page.locator('#custom-modal-overlay').isVisible());
            assert.equal(await page.locator('#reg-name').inputValue(), 'Regression Student');
            assert.equal(await page.locator('#reg-password').inputValue(), 'Practice9!');
        });
        await test('An unrelated account registration in another tab does not reload or erase an open form', async () => {
            const other = await context.newPage(); await other.goto(base + 'profile.html', { waitUntil: 'domcontentloaded' });
            let navigations = 0; const countNavigation = frame => { if (frame === page.mainFrame()) navigations++; };
            page.on('framenavigated', countNavigation);
            await other.evaluate(() => localStorage.setItem('codequiz-users', JSON.stringify([{ id: 'other-test-user', name: 'Other Student', email: 'other@astanait.edu.kz', phone: '+77011234567', password: 'Practice9!', createdAt: new Date().toISOString() }])));
            await page.waitForTimeout(350);
            assert.equal(navigations, 0);
            assert.ok(await page.locator('#custom-modal-overlay').isVisible());
            assert.equal(await page.locator('#reg-name').inputValue(), 'Regression Student');
            page.off('framenavigated', countNavigation); await other.close();
        });
        await test('Create account shows explicit success without switching tabs or navigating; Continue opens Log in', async () => {
            await page.locator('#reg-email').fill('regression@astanait.edu.kz');
            await page.locator('#reg-phone').fill('+77011234567');
            await page.locator('#reg-confirm-password').fill('Practice9!'); await page.locator('#reg-terms').check();
            await page.locator('#registration-form button[type=submit]').click();
            assert.ok(await page.locator('#custom-modal-overlay').isVisible());
            assert.ok(await page.locator('#tab-register').isVisible());
            assert.match(await page.locator('#reg-success-message').innerText(), /Account created/);
            assert.ok(page.url().endsWith('index.html'));
            assert.ok(await page.locator('#registration-login-button').isVisible());
            const screenshots = path.join(__dirname, '../report/final/screenshots');
            fs.mkdirSync(screenshots, { recursive: true });
            await page.screenshot({ path: path.join(screenshots, 'registration-stable-success.png'), fullPage: false, animations: 'disabled' });
            await page.locator('#registration-login-button').click();
            assert.ok(await page.locator('#tab-login').isVisible());
            assert.equal(await page.locator('#login-email').inputValue(), 'regression@astanait.edu.kz');
            await page.locator('#login-password').fill('Practice9!'); await page.locator('#login-form button[type=submit]').click();
            await page.waitForURL('**/profile.html'); assert.equal(await page.locator('#profile-name').innerText(), 'Regression Student');
        });
        await test('Actual sign-out in a second tab switches account state only once and keeps the saved study plan', async () => {
            const planKey = await page.evaluate(() => {
                CodeQuizStorage.write('practice-plan', { name: 'Regression Student', topic: 'java', minutes: '15' });
                return CodeQuizStorage.key('practice-plan');
            });
            const other = await context.newPage(); await other.goto(base + 'profile.html', { waitUntil: 'domcontentloaded' });
            let navigations = 0; page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations++; });
            await other.locator('#logout-button').click(); await other.waitForURL('**/index.html');
            await page.locator('#profile-guest').waitFor({ state: 'visible' });
            await page.waitForTimeout(150); assert.equal(navigations, 1);
            assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).topic, planKey), 'java');
            await other.close();
        });
        assert.deepEqual(errors, []);
        const report = path.join(__dirname, '../report/final/registration-regression-results.json');
        fs.mkdirSync(path.dirname(report), { recursive: true });
        fs.writeFileSync(report, JSON.stringify({ verifiedAt: new Date().toISOString(), base, browser: browser.version(), passed, errors }, null, 2));
        console.log(passed.length + ' registration regression groups passed.');
    } finally { await context.close(); await browser.close(); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
