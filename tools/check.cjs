const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const fail = message => { console.error(message); process.exitCode = 1; };
const pages = fs.readdirSync(root).filter(n => n.endsWith('.html'));
if (pages.length < 6 || !pages.includes('profile.html')) fail('Expected at least six connected pages, including Profile.');
for (const file of ['server.cjs', ...fs.readdirSync(path.join(root,'js')).filter(n=>n.endsWith('.js')).map(n=>'js/'+n)]) {
    const result = spawnSync(process.execPath, ['--check', path.join(root,file)], { encoding:'utf8' });
    if (result.status !== 0) fail(file + ': ' + result.stderr);
}
for (const file of fs.readdirSync(root).filter(n=>n.endsWith('.html'))) {
    const html=fs.readFileSync(path.join(root,file),'utf8');
    const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
    if (ids.length !== new Set(ids).size) fail(file+': duplicate id');
    if (!html.includes('href="profile.html"')) fail(file + ': missing Profile navigation');
    if (/<(?:input|select|textarea)\b[^>]*\s(?:required|pattern|minlength|maxlength|min|max)(?:\s|=|>)/i.test(html) || /type="email"/i.test(html)) fail(file + ': browser validation attribute');
    if ([...html.matchAll(/<form\b[^>]*>/g)].some(m => !m[0].includes('novalidate'))) fail(file + ': form needs novalidate');
    for (const [,url] of html.matchAll(/(?:src|href|data-src)="([^"]+)"/g)) {
        if (/^(?:https?:|data:|mailto:|#)/.test(url)) continue;
        if (!fs.existsSync(path.join(root,url.split('#')[0]))) fail(file+': missing asset '+url);
    }
}
const bank=JSON.parse(fs.readFileSync(path.join(root,'data/questions.json'),'utf8'));
if (bank.topics.length!==3 || bank.topics.some(t=>t.questions.length!==6)) fail('Expected three topics with six questions each.');
if (!process.exitCode) console.log('Six pages, Profile links, JavaScript syntax, JS-only forms, local assets and 18-question bank passed.');
