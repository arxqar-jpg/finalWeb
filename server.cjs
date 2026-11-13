// A small local HTTP server. No packages or installation are required.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const port = Number(process.env.PORT || 4173);
const types = { '.svg':'image/svg+xml; charset=utf-8', '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.png':'image/png', '.jpg':'image/jpeg', '.wav':'audio/wav', '.ttf':'font/ttf', '.md':'text/plain; charset=utf-8', '.pdf':'application/pdf' };

const server = http.createServer((request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) {
        response.writeHead(405, { Allow:'GET, HEAD' }); response.end(); return;
    }
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
    catch (_) { response.writeHead(400); response.end('Invalid URL'); return; }
    if (pathname === '/api/health') {
        response.writeHead(200, { 'Content-Type':types['.json'], 'Cache-Control':'no-store' });
        response.end(JSON.stringify({ status:'ok', project:'CodeQuiz' })); return;
    }
    // The API and the static-host fallback share exactly the same question source.
    const relative = pathname === '/api/questions' ? 'data/questions.json' : (pathname === '/' ? 'index.html' : pathname.slice(1));
    const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep) || relative.split(/[\\/]/).some(part => part.startsWith('.')) || file.endsWith('.cjs')) {
        response.writeHead(403); response.end('Forbidden'); return;
    }
    fs.stat(file, (error, stat) => {
        if (error || !stat.isFile()) { response.writeHead(404); response.end('Not found'); return; }
        response.writeHead(200, { 'Content-Type':types[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' });
        if (request.method === 'HEAD') { response.end(); return; }
        fs.createReadStream(file).on('error', () => response.destroy()).pipe(response);
    });
});
server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `Port ${port} is in use. Set PORT to another port.` : error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`CodeQuiz: http://127.0.0.1:${port}`));
