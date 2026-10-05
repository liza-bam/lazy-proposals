// Builds the proposal emails (emails/<token>.html, local only) from data/clients/*.json, and the
// shared whitepaper site/direct-booking-options.pdf that each email carries as its attachment.
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PAPER = 'direct-booking-options';   // the shared options whitepaper, site/<PAPER>.pdf
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function clients() {
  const dir = path.join(ROOT, 'data/clients');
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => read('data/clients/' + f));
}

// One booking card in the whitepaper.
const card = (o) => `
      <article class="pp__card">
        <header class="pp__cardhead">
          <h3>${esc(o.name)}</h3>
          <span class="pp__price">${esc(o.price)}</span>
        </header>
        <p class="pp__about">${esc(o.about)}</p>
        <ul class="pp__chips">${o.services.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
        <footer class="pp__cardfoot">
          <a class="pp__btn pp__btn--ghost" href="${esc(o.url)}" target="_blank" rel="noopener">Visit ${esc(o.name)} →</a>
          <span class="pp__note">Approximate price, checked ${esc(o.checked)}</span>
        </footer>
      </article>`;

// The whitepaper: direct payment first, then the platforms, two cards to a row on Letter pages.
function paper(settings, options) {
  const pay = options.filter((o) => o.kind === 'payments').map(card).join('');
  const platforms = options.filter((o) => o.kind !== 'payments').map(card).join('');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(settings.bookingPaperTitle)} — Lazy</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;600&display=swap">
<link rel="stylesheet" href="proposal.css">
</head>
<body>
<main class="pp">
  <header class="pp__top"><span class="pp__logo" role="img" aria-label="Lazy"></span></header>
  <h1 class="pp__title">${esc(settings.bookingPaperTitle)}</h1>
  <h3 class="pp__subh">${esc(settings.paymentsHeading)}</h3>
  <p class="pp__intro">${esc(settings.paymentsNote)}</p>
  <div class="pp__cards">${pay}
  </div>
  <h3 class="pp__subh">${esc(settings.platformsHeading)}</h3>
  <p class="pp__intro">${esc(settings.bookingIntro)}</p>
  <div class="pp__cards">${platforms}
  </div>
</main>
</body>
</html>
`;
}

// Email clients ignore stylesheets: tables and inline styles only, values from the brand tokens in proposal.css.
function email(client, prop, pr, settings) {
  const C = { ink: '#17363c', coral: '#f9426f', cream: '#fffdf6' };
  const font = "font-family:'Noto Serif',Georgia,serif;";
  const text = `${font}font-size:16px;line-height:1.6;color:${C.ink};`;
  const first = String(client.name || '').trim().split(/\s+/)[0] || client.name;
  const h = (t) => `<tr><td style="${font}font-size:20px;font-weight:600;color:${C.ink};padding:28px 0 10px;">${t}</td></tr>`;
  const btn = (u, t) => `<a href="${esc(u)}" target="_blank" rel="noopener" style="display:inline-block;background:${C.coral};color:#ffffff;text-decoration:none;font-weight:600;padding:10px 22px;border-radius:8px;${font}">${esc(t)}</a>`;
  const subject = 'Welcome to Lazy — your proposal for ' + prop.name;
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${C.cream};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="padding-bottom:16px;"><img src="${esc(settings.siteBase)}lazy-logo-email.png" width="120" alt="Lazy" style="display:block;border:0;"></td></tr>
  <tr><td style="${font}font-size:26px;font-weight:600;color:${C.ink};">Welcome, ${esc(first)}!</td></tr>
  <tr><td style="${text}padding-top:12px;">${esc(settings.welcome.replace('{property}', prop.name))}</td></tr>
  ${h('1. Your website')}
  <tr><td>${btn(pr.siteUrl, 'Visit your website')}</td></tr>
  ${h('2. Try the editor')}
  <tr><td>${btn(pr.editorUrl, 'Open the editor')}</td></tr>
  ${pr.login ? `<tr><td style="${text}padding-top:12px;">Your login: <strong>${esc(pr.login)}</strong>. ${esc(settings.editorNote)}</td></tr>` : ''}
  ${h('3. About Lazy')}
  <tr><td>${btn(settings.whitepaperUrl, 'Read the whitepaper')}</td></tr>
  ${h('4. Direct booking options')}
  <tr><td style="${text}padding:0 0 14px;">${esc(settings.emailBookingNote)}</td></tr>
  <tr><td>${btn(settings.siteBase + PAPER + '.pdf', 'Direct booking options')}</td></tr>
  <tr><td style="${text}padding-top:28px;white-space:pre-line;">${esc(settings.signoff)}</td></tr>
</table></td></tr></table>
</body></html>
`;
  return { subject, html };
}

const pause = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

// Chrome prints the whitepaper in about a second but never exits on its own, so it is stopped
// as soon as the PDF stops growing; its throwaway profile and any process left on it go with it.
function pdf(htmlFile, pdfFile) {
  const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'lazy-proposals-chrome-'));
  fs.rmSync(pdfFile, { force: true });
  const child = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-pdf-header-footer',
    '--user-data-dir=' + profile, '--print-to-pdf=' + pdfFile, 'file://' + htmlFile], { stdio: 'ignore', detached: true });
  try {
    let last = -1;
    for (let waited = 0; waited < 45000; waited += 500) {
      pause(500);
      const size = fs.existsSync(pdfFile) ? fs.statSync(pdfFile).size : 0;
      if (size > 0 && size === last) break;
      last = size;
    }
  } finally {
    try { process.kill(-child.pid, 'SIGKILL'); } catch (e) { /* already gone */ }
    spawnSync('pkill', ['-9', '-f', profile]);
    fs.rmSync(profile, { recursive: true, force: true });
  }
  if (!fs.existsSync(pdfFile) || !fs.statSync(pdfFile).size) throw new Error('The whitepaper PDF was not written.');
}

function build(only) {
  const settings = read('data/settings.json');
  const options = read('data/booking-options.json');
  const out = [];
  fs.mkdirSync(path.join(ROOT, 'emails'), { recursive: true });
  const paperHtml = path.join(ROOT, 'site', PAPER + '.html');
  fs.writeFileSync(paperHtml, paper(settings, options));
  pdf(paperHtml, path.join(ROOT, 'site', PAPER + '.pdf'));
  for (const c of clients()) {
    for (const pr of c.proposals || []) {
      if (only && pr.token !== only) continue;
      const prop = (c.properties || []).find((p) => p.id === pr.property) || { name: pr.property };
      const m = email(c, prop, pr, settings);
      fs.writeFileSync(path.join(ROOT, 'emails', pr.token + '.html'), m.html);
      fs.writeFileSync(path.join(ROOT, 'emails', pr.token + '.json'), JSON.stringify({ to: c.email, subject: m.subject, attach: PAPER + '.pdf' }, null, 2) + '\n');
      out.push({ client: c.name, property: prop.name, email: 'emails/' + pr.token + '.html', subject: m.subject });
    }
  }
  return out;
}

module.exports = { build };
if (require.main === module) for (const r of build(process.argv[2])) console.log(r.client + ' — ' + r.property + ': ' + r.email + '  ·  ' + r.subject);
