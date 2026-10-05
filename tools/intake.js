// Local intake: http://localhost:4317 — add clients, properties and proposals; saves data/clients/*.json and builds.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { build } = require('./build');

const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'data/clients');
const PORT = 4317;
const slug = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'client';

function all() {
  return fs.readdirSync(DIR).filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')))
    .sort((a, b) => a.name.localeCompare(b.name));
}
function save(c) { fs.writeFileSync(path.join(DIR, c.id + '.json'), JSON.stringify(c, null, 2) + '\n'); }
function body(req) {
  return new Promise((ok, no) => { let b = ''; req.on('data', (d) => { b += d; }); req.on('end', () => { try { ok(JSON.parse(b || '{}')); } catch (e) { no(e); } }); });
}
function send(res, code, data) { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(data)); }

http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(fs.readFileSync(path.join(__dirname, 'intake.html')));
    }
    if (req.method === 'GET' && req.url === '/api/clients') return send(res, 200, all());
    const em = req.method === 'GET' && req.url.match(/^\/email\/([a-f0-9]+)$/);
    if (em) {   // the email, with its subject and a Copy button for pasting into Gmail
      const base = path.join(ROOT, 'emails', em[1]);
      if (!fs.existsSync(base + '.html')) return send(res, 404, { error: 'No email for that proposal.' });
      const meta = JSON.parse(fs.readFileSync(base + '.json', 'utf8'));
      const html = fs.readFileSync(base + '.html', 'utf8');
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(fs.readFileSync(path.join(__dirname, 'email.html'), 'utf8')
        .replace('__META__', () => JSON.stringify(meta).replace(/</g, '\\u003c'))
        .replace('__HTML__', () => JSON.stringify(html).replace(/</g, '\\u003c')));
    }
    if (req.method === 'GET') {   // the built site, so the page link opens here too
      const rel = decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html');
      const file = path.join(ROOT, 'site', path.normalize(rel));
      if (file.startsWith(path.join(ROOT, 'site')) && fs.existsSync(file) && fs.statSync(file).isFile()) {
        const type = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.pdf': 'application/pdf' }[path.extname(file)] || 'application/octet-stream';
        res.writeHead(200, { 'content-type': type });
        return res.end(fs.readFileSync(file));
      }
    }
    if (req.method === 'POST' && req.url === '/api/client') {
      const b = await body(req);
      if (!String(b.name || '').trim()) return send(res, 400, { error: 'Client name is required.' });
      let id = slug(b.name), n = 2;
      while (fs.existsSync(path.join(DIR, id + '.json'))) id = slug(b.name) + '-' + n++;
      const c = { id, name: b.name.trim(), email: (b.email || '').trim(), properties: [], proposals: [] };
      save(c); return send(res, 200, c);
    }
    if (req.method === 'POST' && req.url === '/api/property') {
      const b = await body(req), c = all().find((x) => x.id === b.client);
      if (!c || !String(b.name || '').trim()) return send(res, 400, { error: 'Pick a client and give the property a name.' });
      let id = slug(b.name), n = 2;
      while (c.properties.some((p) => p.id === id)) id = slug(b.name) + '-' + n++;
      c.properties.push({ id, name: b.name.trim() });
      save(c); return send(res, 200, c);
    }
    if (req.method === 'POST' && req.url === '/api/proposal') {
      const b = await body(req), c = all().find((x) => x.id === b.client);
      const need = ['property', 'siteUrl', 'editorUrl'];
      if (!c || need.some((k) => !String(b[k] || '').trim())) return send(res, 400, { error: 'Every field is required.' });
      const pr = { token: crypto.randomBytes(6).toString('hex'), property: b.property, siteUrl: b.siteUrl.trim(),
        editorUrl: b.editorUrl.trim(), date: new Date().toISOString().slice(0, 10) };
      c.proposals.push(pr); save(c);
      const built = build(pr.token);
      return send(res, 200, { client: c, built });
    }
    send(res, 404, { error: 'Not found' });
  } catch (e) { send(res, 500, { error: e.message }); }
}).listen(PORT, '127.0.0.1', () => console.log('Intake: http://localhost:' + PORT));
