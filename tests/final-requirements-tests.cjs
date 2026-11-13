const { chromium } = require(process.env.CODEQUIZ_PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.CODEQUIZ_BASE_URL || 'http://127.0.0.1:4173/';
const root = path.resolve(__dirname, '..');
const evidence = path.join(root, 'report/final');
fs.mkdirSync(path.join(evidence, 'screenshots'), { recursive: true });
const passed = [], errors = [];
const files = ['index.html', 'quiz.html', 'study.html', 'about.html', 'contact.html', 'profile.html'];
const bank = JSON.parse(fs.readFileSync(path.join(root, 'data/questions.json'), 'utf8'));
async function test(name, fn) { await fn(); passed.push(name); console.log('PASS', name); }
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Asia/Qyzylorda' });
    const p = await context.newPage(); p.setDefaultTimeout(15000); p.on('pageerror', e => errors.push(e.message));
    const go = file => p.goto(base + file, { waitUntil: 'domcontentloaded' });
    const screenshot = async name => {
        await p.evaluate(async () => {
            if (!document.querySelector('.custom-modal-overlay.active')) {
                for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { scrollTo({ top: y, behavior: 'instant' }); await new Promise(r => setTimeout(r, 40)); }
                scrollTo({ top: 0, behavior: 'instant' });
                await Promise.all([...document.images].filter(img => !img.hasAttribute('data-src')).map(img => img.decode().catch(() => {})));
            }
            await document.fonts.ready;
        });
        return p.screenshot({ path: path.join(evidence, 'screenshots', name + '.png'), fullPage: true, animations: 'disabled' });
    };
    async function register(name, email) {
        await p.locator('.signup-button').click();
        await p.locator('#reg-name').fill(name); await p.locator('#reg-email').fill(email);
        await p.locator('#reg-phone').fill('+7 (701) 123-45-67');
        await p.locator('#reg-password').fill('Practice9!'); await p.locator('#reg-confirm-password').fill('Practice9!');
        await p.locator('#reg-terms').check(); await p.locator('#registration-form button[type=submit]').click();
        await p.locator('#registration-login-button').click();
        await p.locator('#tab-login').waitFor({ state: 'visible' });
    }
    async function login(email) {
        if (!await p.locator('#tab-login').isVisible()) { await p.locator('.signup-button').click(); await p.locator('#modal-tab-login').click(); }
        await p.locator('#login-email').fill(email); await p.locator('#login-password').fill('Practice9!');
        await p.locator('#login-form button[type=submit]').click(); await p.waitForURL('**/profile.html');
        await p.locator('#profile-details').waitFor({ state: 'visible' });
    }
    async function finishQuiz() {
        await go('quiz.html#java'); await p.getByRole('button', { name: 'Start quiz', exact: true }).click();
        for (let i = 0; i < 6; i++) {
            await p.locator('.session-answer-form input').nth(bank.topics[0].questions[i].answer).check();
            await p.getByRole('button', { name: i === 5 ? 'Review answers' : 'Next question', exact: true }).first().click();
        }
        await p.getByRole('button', { name: 'Submit answers', exact: true }).click();
        assert.equal(await p.locator('.result-score strong').innerText(), '6 / 6');
    }
    try {
        await test('Six connected pages have unique IDs, valid assets and JavaScript-only forms', async () => {
            for (const file of files) {
                const response = await go(file); assert.equal(response.status(), 200);
                const nav = await p.locator('#mainNavigation a.nav-link').evaluateAll(nodes => nodes.map(n => n.getAttribute('href')));
                assert.deepEqual(nav.sort(), files.slice().sort());
                const failures = await p.evaluate(() => {
                    const ids = [...document.querySelectorAll('[id]')].map(e => e.id);
                    return { duplicateIds: ids.filter((id, i) => ids.indexOf(id) !== i), nativeValidation: [...document.querySelectorAll('input,select,textarea')].filter(e => ['required', 'pattern', 'minlength', 'maxlength', 'min', 'max'].some(a => e.hasAttribute(a)) || e.type === 'email').map(e => e.id), formsWithoutNovalidate: [...document.forms].filter(f => !f.noValidate).map(f => f.id) };
                });
                assert.deepEqual(failures, { duplicateIds: [], nativeValidation: [], formsWithoutNovalidate: [] });
            }
        });
        await test('Validation rejects malformed email, weak passwords and invalid international phone numbers', async () => {
            await go('index.html');
            const validation = await p.evaluate(() => ({
                validEmails: ['student@astanait.edu.kz', 'name+quiz@sub.domain.com'].map(x => getEmailError(x)),
                invalidEmails: ['', 'student', 'student@@domain.com', '.name@domain.com', 'name..quiz@domain.com', 'name@-domain.com', 'name@domain.c'].map(x => !!getEmailError(x)),
                validPhones: ['+7 701 123 45 67', '+44 (20) 7946-0958'].map(x => getPhoneError(x)),
                invalidPhones: ['', '87011234567', '+123', '+7abcdef1234567', '+00000000000', '+1234567890123456'].map(x => !!getPhoneError(x)),
                validPassword: getPasswordError('Practice9!'),
                weakPasswords: ['', 'short', 'abcdefgh1', 'ABCDEFGH1!', 'Practice!', 'Practice9', 'Practice 9!', 'A'.repeat(129)].map(x => !!getPasswordError(x))
            }));
            assert.deepEqual(validation.validEmails, ['', '']); assert.ok(validation.invalidEmails.every(Boolean));
            assert.deepEqual(validation.validPhones, ['', '']); assert.ok(validation.invalidPhones.every(Boolean));
            assert.equal(validation.validPassword, ''); assert.ok(validation.weakPasswords.every(Boolean));
            await p.locator('.signup-button').click(); await p.locator('#registration-form button[type=submit]').click();
            assert.equal(await p.locator('#registration-form .is-invalid').count(), 6);
            assert.ok(await p.locator('#err-reg-phone').isVisible());
            await p.keyboard.press('Escape');
        });
        await test('Sign up stores name/email/password/phone, then login rejects wrong credentials and opens Profile', async () => {
            await register('Final Student', 'final.student@astanait.edu.kz');
            const user = await p.evaluate(() => JSON.parse(localStorage.getItem('codequiz-users'))[0]);
            assert.equal(user.name, 'Final Student'); assert.equal(user.email, 'final.student@astanait.edu.kz');
            assert.equal(user.password, 'Practice9!'); assert.equal(user.phone, '+77011234567');
            await p.locator('#login-password').fill('Wrongpass9!'); await p.locator('#login-form button[type=submit]').click();
            assert.match(await p.locator('#login-feedback').innerText(), /incorrect/); assert.ok(p.url().endsWith('index.html'));
            await login('FINAL.STUDENT@ASTANAIT.EDU.KZ');
            assert.equal(await p.locator('#profile-name').innerText(), 'Final Student');
            assert.equal(await p.locator('#profile-email').innerText(), 'final.student@astanait.edu.kz');
            assert.equal(await p.locator('#profile-phone').innerText(), '+77011234567');
            await p.reload({ waitUntil: 'domcontentloaded' }); assert.ok(await p.locator('#profile-details').isVisible());
            assert.equal(await p.locator('.signup-button').innerText(), 'Profile'); await screenshot('profile-desktop-light');
        });
        await test('Logged-in quiz progress is visible on Profile and isolated from another account', async () => {
            await finishQuiz(); await go('profile.html'); assert.equal(await p.locator('#profile-attempts').innerText(), '1');
            assert.equal(await p.locator('#profile-best').innerText(), '100%');
            await p.locator('#logout-button').click(); await p.waitForURL('**/index.html');
            await go('profile.html'); assert.ok(await p.locator('#profile-guest').isVisible()); assert.ok(!await p.locator('#profile-details').isVisible());
            await register('Second Student', 'second.student@astanait.edu.kz'); await login('second.student@astanait.edu.kz');
            assert.equal(await p.locator('#profile-attempts').innerText(), '0');
            await p.locator('#logout-button').click(); await p.waitForURL('**/index.html'); await login('final.student@astanait.edu.kz');
            assert.equal(await p.locator('#profile-attempts').innerText(), '1'); await p.locator('#logout-button').click(); await p.waitForURL('**/index.html');
        });
        await test('Duplicate email cannot overwrite an existing account', async () => {
            await p.locator('.signup-button').click(); await p.locator('#reg-name').fill('Other Student');
            await p.locator('#reg-email').fill('FINAL.STUDENT@ASTANAIT.EDU.KZ'); await p.locator('#reg-phone').fill('+77011234567');
            await p.locator('#reg-password').fill('Changed99!'); await p.locator('#reg-confirm-password').fill('Changed99!'); await p.locator('#reg-terms').check();
            await p.locator('#registration-form button[type=submit]').click(); assert.match(await p.locator('#err-reg-email').innerText(), /already exists/);
            assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('codequiz-users')).length), 2);
            await p.keyboard.press('Escape');
        });
        await test('Saved search/filter and contact feedback survive page reloads', async () => {
            await go('index.html'); await p.locator('#topic-search').fill('python'); await p.locator('[data-category=python]').click();
            await p.reload({ waitUntil: 'domcontentloaded' }); assert.equal(await p.locator('#topic-search').inputValue(), 'python');
            assert.equal(await p.locator('.topic-card').count(), 1); assert.equal(await p.locator('[data-category=python]').getAttribute('aria-pressed'), 'true');
            await p.locator('#topic-search').fill(''); await p.locator('[data-category=all]').click();
            await go('contact.html'); await p.locator('#user-name').fill('Feedback Student'); await p.locator('#user-email').fill('feedback@astanait.edu.kz');
            await p.locator('#user-phone').fill('+77011234567'); await p.locator('#user-message').fill('Please add more beginner Java questions.'); await p.locator('#contact-consent').check();
            await p.locator('#contact-form button[type=submit]').click(); await p.waitForFunction(() => !document.querySelector('#contact-form button[type=submit]').disabled);
            await p.reload({ waitUntil: 'domcontentloaded' }); assert.match(await p.locator('#saved-feedback-list').innerText(), /Please add more beginner Java questions/);
        });
        await test('Dark switch persists across all six pages and dark text contrast is improved', async () => {
            await p.getByRole('switch', { name: 'Dark mode' }).click();
            for (const file of files) { await go(file); assert.equal(await p.locator('body').getAttribute('data-theme'), 'midnight'); assert.equal(await p.getByRole('switch').getAttribute('aria-checked'), 'true'); }
            await screenshot('profile-guest-dark'); await go('contact.html'); await p.locator('#contact-form button[type=submit]').click();
            const color = await p.locator('#err-user-email').evaluate(e => getComputedStyle(e).color); assert.equal(color, 'rgb(255, 172, 172)'); await screenshot('contact-dark-validation');
            await go('index.html'); const metadata = await p.locator('.topic-meta').first().evaluate(e => getComputedStyle(e).color); assert.equal(metadata, 'rgb(166, 182, 172)');
        });
        await test('GitHub public API loads real Java/Python/web resources in the browser', async () => {
            await go('study.html'); await p.waitForFunction(() => !document.getElementById('learning-resources').hasAttribute('aria-busy'), { timeout: 20000 });
            assert.equal(await p.locator('.resource-card').count(), 3); assert.equal(await p.locator('.resource-card a').count(), 3);
            assert.match(await p.locator('#resource-status').innerText(), /GitHub/);
            assert.match(await p.locator('.resource-card').first().innerText(), /stars/); await screenshot('study-resources-desktop-dark');
        });
        await test('API loading, HTTP failure, Retry, malformed JSON and cache fallback have visible states', async () => {
            await p.evaluate(() => { ['TheAlgorithms/Java', 'TheAlgorithms/Python', 'freeCodeCamp/freeCodeCamp'].forEach(repo => CodeQuizStorage.remove('resource-' + repo)); });
            let release; const gate = new Promise(resolve => release = resolve);
            await p.route('https://api.github.com/repos/**', async r => { await gate; await r.fulfill({ status: 503, contentType: 'application/json', body: '{}' }); });
            await go('study.html'); assert.equal(await p.locator('#learning-resources').getAttribute('aria-busy'), 'true');
            assert.ok(await p.locator('#refresh-resources').isDisabled()); assert.match(await p.locator('#resource-status').innerText(), /Loading/); release();
            await p.waitForFunction(() => !document.getElementById('refresh-resources').disabled);
            assert.match(await p.locator('#resource-status').innerText(), /could not load/); assert.equal(await p.locator('.resource-card a').count(), 0);
            await screenshot('api-error-retry'); await p.unroute('https://api.github.com/repos/**');
            await p.locator('#refresh-resources').click(); await p.waitForFunction(() => !document.getElementById('refresh-resources').disabled);
            assert.equal(await p.locator('.resource-card a').count(), 3);
            await p.route('https://api.github.com/repos/**', r => r.abort()); await p.locator('#refresh-resources').click();
            await p.waitForFunction(() => !document.getElementById('refresh-resources').disabled); assert.match(await p.locator('#resource-status').innerText(), /saved resources/);
            await p.unroute('https://api.github.com/repos/**');
            await p.evaluate(() => { ['TheAlgorithms/Java', 'TheAlgorithms/Python', 'freeCodeCamp/freeCodeCamp'].forEach(repo => CodeQuizStorage.remove('resource-' + repo)); });
            await p.route('https://api.github.com/repos/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"unexpected":true}' }));
            await p.locator('#refresh-resources').click(); await p.waitForFunction(() => !document.getElementById('refresh-resources').disabled);
            assert.match(await p.locator('.resource-card').first().innerText(), /unexpected response/); await p.unroute('https://api.github.com/repos/**');
        });
        await test('Shared modal has keyboard focus containment, tab navigation and accessible Escape close', async () => {
            await go('index.html'); await p.locator('.signup-button').click(); assert.equal(await p.locator('#reg-name').evaluate(e => e === document.activeElement), true);
            await p.locator('#modal-tab-register').focus(); await p.keyboard.press('ArrowRight'); assert.ok(await p.locator('#tab-login').isVisible());
            await p.locator('#login-form button[type=submit]').focus(); await p.keyboard.press('Tab'); assert.equal(await p.locator('#modal-close-btn').evaluate(e => e === document.activeElement), true);
            await p.keyboard.press('Escape'); assert.ok(!await p.locator('#custom-modal-overlay').isVisible());
        });
        await test('Study gallery photos load on scroll, thumbnail controls work and Copy plan uses the generated plan', async () => {
            await go('study.html'); await p.locator('#study-image').scrollIntoViewIfNeeded();
            await p.waitForFunction(() => document.getElementById('study-image').naturalWidth > 1);
            await p.getByRole('button', { name: 'Show a coding workspace', exact: true }).click();
            await p.waitForFunction(() => document.getElementById('study-image').src.includes('photo-1498050108023') && document.getElementById('study-image').naturalWidth > 1);
            assert.match(await p.locator('#study-caption').innerText(), /short session/);
            await p.locator('#plan-name').fill('Plan Student'); await p.locator('#plan-next').click(); await p.locator('#plan-topic').selectOption('java'); await p.locator('#plan-next').click();
            await p.locator('#sound-enabled').uncheck(); await p.locator('#plan-finish').click();
            await p.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.qaCopiedPlan = text; } } }));
            await p.locator('#copy-plan').click(); await p.waitForFunction(() => !!window.qaCopiedPlan);
            assert.match(await p.evaluate(() => window.qaCopiedPlan), /Plan Student.*Java/); assert.match(await p.locator('#copy-plan').innerText(), /Copied/);
            await screenshot('study-complete-desktop-dark');
        });
        await test('Mobile account forms, Profile, API cards and navigation fit 320–768px in both modes', async () => {
            for (const width of [320, 360, 390, 768]) {
                await p.setViewportSize({ width, height: 844 });
                for (const theme of ['forest', 'midnight']) {
                    await go('profile.html'); if (await p.locator('body').getAttribute('data-theme') !== theme) await p.locator('#btn-change-bg').click();
                    await p.getByRole('button', { name: 'Create account', exact: true }).click();
                    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
                    assert.ok(await p.locator('#registration-form button[type=submit]').isVisible());
                    if (width === 390 && theme === 'forest') await screenshot('mobile-signup');
                    await p.keyboard.press('Escape');
                    await p.locator('.navbar-toggler').click(); await p.locator('#mainNavigation').waitFor({ state: 'visible' }); assert.ok(await p.locator('#mainNavigation').isVisible());
                    await p.locator('#mainNavigation a[href="study.html"]').click(); await p.waitForURL('**/study.html');
                    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
                    if (width === 390 && theme === 'midnight') await screenshot('mobile-study');
                }
            }
        });
        await test('Denied storage prevents a false account success and displays an inline error', async () => {
            const denied = await browser.newContext();
            await denied.addInitScript(() => { Storage.prototype.setItem = function () { throw new DOMException('Denied', 'SecurityError'); }; });
            const page = await denied.newPage(); page.on('pageerror', e => errors.push(e.message));
            await page.goto(base, { waitUntil: 'domcontentloaded' }); await page.locator('.signup-button').click();
            await page.locator('#reg-name').fill('Storage Student'); await page.locator('#reg-email').fill('storage@astanait.edu.kz');
            await page.locator('#reg-phone').fill('+77011234567'); await page.locator('#reg-password').fill('Practice9!'); await page.locator('#reg-confirm-password').fill('Practice9!'); await page.locator('#reg-terms').check();
            await page.locator('#registration-form button[type=submit]').click(); assert.match(await page.locator('#reg-success-message').innerText(), /could not be saved/);
            await denied.close();
        });
        await test('Static hosting works under a repository subpath without missing local assets or a Node API route', async () => {
            const staticContext = await browser.newContext(); const missing = [];
            const prefix = 'https://codequiz-static.test/WEB-Technologies/';
            const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.wav': 'audio/wav', '.ttf': 'font/ttf' };
            await staticContext.route('https://codequiz-static.test/**', async route => {
                const url = new URL(route.request().url());
                const relative = decodeURIComponent(url.pathname).replace(/^\/WEB-Technologies\//, '') || 'index.html';
                const file = path.resolve(root, relative);
                if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { missing.push(relative); await route.fulfill({ status: 404, body: 'Not found' }); return; }
                await route.fulfill({ status: 200, contentType: types[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
            });
            await staticContext.route('https://api.github.com/repos/**', route => {
                const repo = new URL(route.request().url()).pathname.slice('/repos/'.length);
                return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ full_name: repo, description: 'Static hosting test fixture', stargazers_count: 1, pushed_at: '2026-11-13T00:00:00Z' }) });
            });
            const page = await staticContext.newPage(); page.on('pageerror', e => errors.push(e.message));
            for (const file of files) { await page.goto(prefix + file, { waitUntil: 'domcontentloaded' }); assert.equal(await page.locator('#mainNavigation a').count(), 6); }
            await page.goto(prefix + 'quiz.html', { waitUntil: 'domcontentloaded' }); await page.getByRole('button', { name: 'Start quiz', exact: true }).waitFor();
            await page.getByRole('button', { name: 'Start quiz', exact: true }).click(); assert.equal(await page.locator('.session-answer-form input').count(), 3);
            assert.deepEqual(missing, []); await staticContext.close();
        });
        assert.deepEqual(errors, []);
        fs.writeFileSync(path.join(evidence, 'final-requirements-results.json'), JSON.stringify({ verifiedAt: new Date().toISOString(), base, browser: browser.version(), passed, errors }, null, 2));
        console.log(passed.length + ' final requirement groups passed; no JavaScript runtime errors.');
    } finally { await context.close(); await browser.close(); }
})().catch(e => { console.error(e.stack); process.exitCode = 1; });
