// The Mail helper: the Clients app's "Send done email" posts here, and this opens the email in Mail,
// formatted, from the sender, ready to read and send. Never sends. Runs in Terminal, which holds the
// Accessibility and Automation permissions the paste needs. Start: node tools/mail-helper/server.js
const http = require('http'), fs = require('fs'), os = require('os'), path = require('path'), { execFile } = require('child_process');
const PORT = 47317, ORIGINS = ['https://liza-bam.github.io'];
const run = (cmd, args) => new Promise((ok, no) => execFile(cmd, args, (e, out, err) => e ? no(Error(err || e.message)) : ok(out)));

async function compose({ from, to, subject, html, plain }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mail-helper-'));
  try {
    fs.writeFileSync(path.join(dir, 'm.html'), html);
    fs.writeFileSync(path.join(dir, 'm.txt'), plain || '');
    await run('osascript', ['-l', 'JavaScript', path.join(__dirname, 'clipboard.js'), path.join(dir, 'm.html'), path.join(dir, 'm.txt')]);
    await run('osascript', [path.join(__dirname, 'compose.applescript'), from, to || '', subject]);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

http.createServer((req, res) => {
  const origin = req.headers.origin;
  if (ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'content-type');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
  }
  if (req.method === 'OPTIONS') return res.end();
  if (req.method !== 'POST' || req.url !== '/compose' || !ORIGINS.includes(origin)) { res.statusCode = 404; return res.end(); }
  let body = '';
  req.on('data', (c) => { body += c; if (body.length > 2e6) req.destroy(); });
  req.on('end', async () => {
    try {
      const m = JSON.parse(body);
      if (!m.from || !m.subject || !m.html) throw Error('from, subject and html are needed');
      await compose(m);
      res.end(JSON.stringify({ ok: true }));
    } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ ok: false, error: e.message })); }
  });
}).listen(PORT, '127.0.0.1', () => console.log('Mail helper on http://127.0.0.1:' + PORT));
