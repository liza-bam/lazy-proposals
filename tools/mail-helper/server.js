// The Mail helper: the Clients app's email buttons post here, and this opens the email in Mail,
// formatted, from the sender, ready to read and send. Never sends. Once Sandy sends it, the helper sees it
// in Sent and ticks the client's Timeline step in this repo (commit and push). Runs in Terminal, which holds the
// Accessibility and Automation permissions the paste needs. Start: node tools/mail-helper/server.js
const http = require('http'), fs = require('fs'), os = require('os'), path = require('path'), { execFile } = require('child_process');
const PORT = 47317, ORIGINS = ['https://liza-bam.github.io'];
const run = (cmd, args) => new Promise((ok, no) => execFile(cmd, args, (e, out, err) => e ? no(Error(err || e.message)) : ok(out)));

async function compose({ from, to, subject, html, plain, attachment, attachmentName }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mail-helper-'));
  fs.writeFileSync(path.join(dir, 'm.html'), html);
  fs.writeFileSync(path.join(dir, 'm.txt'), plain || '');
  // The attachment stays on disk: Mail reads it while the message is open. The folder is the system's temporary one.
  const file = attachment ? path.join(dir, path.basename(attachmentName || 'attachment.pdf')) : '';
  if (file) fs.writeFileSync(file, Buffer.from(attachment, 'base64'));
  await run('osascript', ['-l', 'JavaScript', path.join(__dirname, 'clipboard.js'), path.join(dir, 'm.html'), path.join(dir, 'm.txt')]);
  await run('osascript', [path.join(__dirname, 'compose.applescript'), from, to || '', subject, file, path.join(__dirname, 'clipboard.js')]);
}

// Emails waiting to be sent, kept across restarts; each is checked against Mail's Sent mailbox.
const PENDING = path.join(os.homedir(), '.lazy-mail-helper-pending.json'), REPO = path.resolve(__dirname, '..', '..');
const loadPending = () => { try { return JSON.parse(fs.readFileSync(PENDING, 'utf8')); } catch (e) { return []; } };
const savePending = (list) => fs.writeFileSync(PENDING, JSON.stringify(list, null, 2));
let checking = false;
async function checkSent() {
  if (checking) return; checking = true;
  try {
    const now = Date.now(), list = loadPending().filter(p => now - p.since < 14 * 864e5);
    for (const p of [...list]) {
      const day = (await run('osascript', [path.join(__dirname, 'sent.applescript'), p.subject, p.to, String(Math.ceil((now - p.since) / 1000) + 60)])).trim();
      if (!day) continue;
      await record(p, day);
      list.splice(list.indexOf(p), 1);
      console.log('Sent ' + day + ': ' + p.step + ' for ' + p.clientId);
    }
    savePending(list);
  } catch (e) { console.log('Sent check: ' + e.message); } finally { checking = false; }
}
// The send ticks the step with its day and, for a website ready email, marks that email sent.
async function record(p, day) {
  const git = (...a) => run('git', ['-C', REPO, ...a]), rel = 'data/clients/' + p.clientId + '.json', file = path.join(REPO, rel);
  await git('pull', '-q', '--ff-only', 'origin', 'main');
  const c = JSON.parse(fs.readFileSync(file, 'utf8'));
  c.timeline = Object.assign({}, c.timeline, { [p.step]: day });
  if (p.token) (c.proposals || []).forEach(x => { if (x.token === p.token) x.sent = day; });
  c.updatedAt = new Date().toISOString();
  fs.writeFileSync(file, JSON.stringify(c, null, 2) + '\n');
  await git('commit', '-q', '-m', 'Sent ' + day + ': ' + p.step + ', ' + (c.name || p.clientId), '--', rel);
  await git('push', '-q', 'origin', 'main');
}
setInterval(checkSent, 30000);

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
      if (m.track && m.track.clientId && m.track.step && m.to) savePending([...loadPending(), { clientId: m.track.clientId, step: m.track.step, token: m.track.token || '', subject: m.subject, to: m.to, since: Date.now() }]);
      res.end(JSON.stringify({ ok: true }));
    } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ ok: false, error: e.message })); }
  });
}).listen(PORT, '127.0.0.1', () => console.log('Mail helper on http://127.0.0.1:' + PORT));
