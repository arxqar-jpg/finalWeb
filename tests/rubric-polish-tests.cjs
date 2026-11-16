const { chromium } = require(process.env.CODEQUIZ_PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.CODEQUIZ_BASE_URL || 'http://127.0.0.1:4173/';
const pages = [
    'index.html',
    'quiz.html',
    'study.html',
    'about.html',
    'contact.html',
    'profile.html'
];
const repos = ['TheAlgorithms/Java', 'TheAlgorithms/Python', 'freeCodeCamp/freeCodeCamp'];
const passed = [],
    errors = [];
async function test(name, fn) {
    await fn();
    passed.push(name);
    console.log('PASS', name);
}
function fixture(repo) {
    return {
        full_name: repo,
        description: 'Programming resource test fixture',
        stargazers_count: 123,
        pushed_at: '2026-11-15T12:00:00Z'
    };
}
function contrast(foreground, background) {
    function luminance(color) {
        const linear = color
            .match(/[\d.]+/g)
            .slice(0, 3)
            .map(Number)
            .map((n) => {
                n /= 255;
                return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
            });
        return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
    }
    const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
    return (values[0] + 0.05) / (values[1] + 0.05);
}
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    async function context() {
        const c = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
        c.on('page', (p) => p.on('pageerror', (e) => errors.push(e.message)));
        return c;
    }
    const c = await context();
    await c.route('https://api.github.com/repos/**', (route) =>
        route.fulfill({ status: 503, body: '{}' })
    );
    const p = await c.newPage();
    const go = (file) => p.goto(base + file, { waitUntil: 'domcontentloaded' });
    async function resources(page) {
        await page.waitForFunction(
            () => !document.getElementById('learning-resources').hasAttribute('aria-busy')
        );
    }
    try {
        await test('Both themes retain readable text and selected/hovered controls meet 4.5:1 contrast', async () => {
            for (const theme of ['forest', 'midnight']) {
                await go('index.html');
                await p.evaluate((theme) => localStorage.setItem('codequiz-theme', theme), theme);
                await go('quiz.html');
                for (const id of ['java', 'python', 'htmlcss', 'history']) {
                    await p.locator('[data-quiz-topic=' + id + ']').click();
                    await p.waitForFunction(
                        (id) =>
                            document
                                .querySelector('[data-quiz-topic=' + id + ']')
                                .classList.contains('active'),
                        id
                    );
                    await p.waitForTimeout(250);
                    const colors = await p.locator('.quiz-topic-tabs .active').evaluate((e) => {
                        const s = getComputedStyle(e);
                        return [s.color, s.backgroundColor];
                    });
                    assert.ok(
                        contrast(...colors) >= 4.5,
                        theme + ' selected ' + id + ': ' + colors
                    );
                }
                const secondary = await p
                    .locator('.platform-intro .text-secondary')
                    .evaluate((e) => [
                        getComputedStyle(e).color,
                        getComputedStyle(document.querySelector('.platform-topbar')).backgroundColor
                    ]);
                assert.ok(contrast(...secondary) >= 4.5, theme + ' secondary text');
                await p.locator('.signup-button').hover();
                await p.waitForTimeout(300);
                const hover = await p
                    .locator('.signup-button')
                    .evaluate((e) => [
                        getComputedStyle(e).color,
                        getComputedStyle(e).backgroundColor
                    ]);
                assert.ok(contrast(...hover) >= 4.5, theme + ' signup hover');
            }
        });
        await test('Larger metadata preserves all six layouts and mobile header controls at 320–1440px', async () => {
            for (const width of [320, 360, 390, 768, 992, 1440]) {
                await p.setViewportSize({ width, height: 900 });
                for (const theme of ['forest', 'midnight']) {
                    await p.evaluate(
                        (theme) => localStorage.setItem('codequiz-theme', theme),
                        theme
                    );
                    for (const file of pages) {
                        await go(file);
                        assert.ok(
                            await p.evaluate(
                                () => document.documentElement.scrollWidth <= innerWidth
                            ),
                            width + ' ' + theme + ' ' + file
                        );
                        assert.ok(
                            await p
                                .locator('.site-footer')
                                .evaluate((e) => parseFloat(getComputedStyle(e).fontSize) >= 12)
                        );
                        if (width < 992) {
                            const bounds = await p.evaluate(() =>
                                [
                                    '.codequiz-brand',
                                    '#btn-change-bg',
                                    '.signup-button',
                                    '.navbar-toggler'
                                ].map((selector) => {
                                    const r = document
                                        .querySelector(selector)
                                        .getBoundingClientRect();
                                    return {
                                        selector,
                                        left: r.left,
                                        right: r.right,
                                        top: r.top,
                                        bottom: r.bottom
                                    };
                                })
                            );
                            for (let i = 0; i < bounds.length; i++)
                                for (let j = i + 1; j < bounds.length; j++) {
                                    const a = bounds[i],
                                        b = bounds[j];
                                    assert.ok(
                                        a.right <= b.left ||
                                            b.right <= a.left ||
                                            a.bottom <= b.top ||
                                            b.bottom <= a.top,
                                        width + ' header overlap: ' + JSON.stringify([a, b])
                                    );
                                }
                        }
                    }
                }
            }
        });
        await test('Cold API failure keeps three useful learning links, then Retry restores live metadata', async () => {
            await go('study.html');
            await resources(p);
            assert.match(await p.locator('#resource-status').innerText(), /could not load/);
            assert.equal(await p.locator('.resource-card a').count(), 3);
            assert.doesNotMatch(await p.locator('#resource-list').innerText(), /stars/);
            await p.route('https://api.github.com/repos/**', (route) => {
                const repo = new URL(route.request().url()).pathname.slice('/repos/'.length);
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify(fixture(repo))
                });
            });
            await p.locator('#refresh-resources').click();
            await resources(p);
            assert.match(
                await p.locator('#resource-status').innerText(),
                /Loaded from the GitHub public API/
            );
            assert.equal(
                (await p.locator('#resource-list').innerText()).match(/123 stars/g).length,
                3
            );
        });
        await test('Expired saved API data remains visible and identified during an outage', async () => {
            await p.evaluate(
                (repos) =>
                    repos.forEach((repo) => {
                        const saved = CodeQuizStorage.read('resource-' + repo, null);
                        saved.at = Date.now() - 3600000;
                        CodeQuizStorage.write('resource-' + repo, saved);
                    }),
                repos
            );
            await p.unroute('https://api.github.com/repos/**');
            await p.reload({ waitUntil: 'domcontentloaded' });
            await resources(p);
            assert.match(await p.locator('#resource-status').innerText(), /saved resources/);
            assert.equal(
                (await p.locator('#resource-list').innerText()).match(/123 stars/g).length,
                3
            );
        });
        await test('Rate-limit reset and Retry-After stop repeat calls across refresh/reload, then allow recovery', async () => {
            for (const kind of ['reset', 'seconds', 'http-date', 'default']) {
                const rc = await context();
                const rp = await rc.newPage();
                let requests = 0,
                    limited = true;
                const now = Date.now();
                const headers =
                    kind === 'reset'
                        ? { 'x-ratelimit-reset': String(Math.floor(now / 1000) + 120) }
                        : kind === 'seconds'
                          ? { 'retry-after': '120' }
                          : kind === 'http-date'
                            ? { 'retry-after': new Date(now + 120000).toUTCString() }
                            : {};
                await rc.route('https://api.github.com/repos/**', (route) => {
                    requests++;
                    if (limited)
                        return route.fulfill({
                            status: kind === 'default' ? 403 : 429,
                            headers: {
                                ...headers,
                                'access-control-allow-origin': '*',
                                'access-control-expose-headers': 'x-ratelimit-reset, retry-after'
                            },
                            body: '{}'
                        });
                    const repo = new URL(route.request().url()).pathname.slice('/repos/'.length);
                    return route.fulfill({
                        status: 200,
                        contentType: 'application/json',
                        body: JSON.stringify(fixture(repo))
                    });
                });
                await rp.goto(base + 'study.html');
                await resources(rp);
                assert.equal(requests, 1, kind + ' must stop after the first rate-limit response');
                assert.equal(await rp.locator('.resource-card a').count(), 3);
                assert.match(await rp.locator('#resource-status').innerText(), /Try again after/);
                await rp.locator('#refresh-resources').click();
                await resources(rp);
                assert.equal(requests, 1);
                await rp.reload();
                await resources(rp);
                assert.equal(requests, 1);
                const retry = await rp.evaluate(() =>
                    CodeQuizStorage.read('resource-retry-after', 0)
                );
                assert.ok(
                    retry >= now + (kind === 'default' ? 59000 : 119000),
                    JSON.stringify({ kind, retry, now })
                );
                limited = false;
                await rp.evaluate(() =>
                    CodeQuizStorage.write('resource-retry-after', Date.now() - 1000)
                );
                await rp.locator('#refresh-resources').click();
                await resources(rp);
                assert.equal(requests, 4);
                assert.match(await rp.locator('#resource-list').innerText(), /stars/);
                await rc.close();
            }
        });
        await test('Malformed API data and corrupt cooldown never produce invented statistics or broken links', async () => {
            const mc = await context();
            const mp = await mc.newPage();
            await mc.addInitScript(() =>
                localStorage.setItem(
                    'codequiz-endterm:resource-retry-after',
                    JSON.stringify('invalid')
                )
            );
            await mc.route('https://api.github.com/repos/**', (route) =>
                route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: '{"unexpected":true}'
                })
            );
            await mp.goto(base + 'study.html');
            await resources(mp);
            assert.equal(await mp.locator('.resource-card a').count(), 3);
            assert.match(await mp.locator('#resource-list').innerText(), /unexpected response/);
            assert.doesNotMatch(await mp.locator('#resource-list').innerText(), /stars/);
            await mc.close();
        });
        assert.deepEqual(errors, []);
        fs.writeFileSync(
            path.join(__dirname, '../report/final/rubric-polish-results.json'),
            JSON.stringify(
                {
                    verifiedAt: new Date().toISOString(),
                    base,
                    browser: browser.version(),
                    apiSuccess:
                        'Explicit fixtures in this regression suite; real API checked in final-requirements-tests.cjs.',
                    passed,
                    errors
                },
                null,
                2
            )
        );
        console.log(passed.length + ' rubric polish groups passed.');
    } finally {
        await c.close();
        await browser.close();
    }
})().catch((e) => {
    console.error(e.stack);
    process.exitCode = 1;
});
