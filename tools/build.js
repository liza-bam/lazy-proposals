// Builds every proposal in data/clients/*.json: the web page site/p/<token>/index.html
// and the email emails/<token>.html (local only, not published).
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const bare = (u) => String(u).replace(/^https?:\/\//, '');

function clients() {
  const dir = path.join(ROOT, 'data/clients');
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => read('data/clients/' + f));
}

function page(client, prop, pr, settings, options) {
  const cards = options.map((o) => `
      <div class="pp__card">
        <h3>${esc(o.name)}</h3>
        <p class="pp__about">${esc(o.about)}</p>
        <p><strong>Best for:</strong> ${esc(o.bestFor)}</p>
        <p><strong>With your Lazy site:</strong> ${esc(o.withLazy)}</p>
        <div class="pp__price">${esc(o.price)}</div>
        <ul>${o.services.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
        <a class="pp__btn pp__btn--ghost" href="${esc(o.url)}" target="_blank" rel="noopener">Visit ${esc(o.name)} →</a>
        <div class="pp__url">${esc(bare(o.url))}</div>
        <div class="pp__note">Approximate, checked ${esc(o.checked)} — <a href="${esc(o.source)}" target="_blank" rel="noopener">source</a></div>
      </div>`).join('');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Proposal for ${esc(client.name)} — ${esc(prop.name)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;600&display=swap">
<link rel="stylesheet" href="../../proposal.css">
</head>
<body>
<main class="pp">
  <header class="pp__top">
    <span class="pp__logo" role="img" aria-label="Lazy"></span>
    <button class="pp__btn pp__btn--ghost pp__print" onclick="window.print()">Print / save as PDF</button>
  </header>
  <div>
    <h1 class="pp__title">${esc(prop.name)}</h1>
    <p class="pp__sub">Proposal for ${esc(client.name)} · ${esc(pr.date)}</p>
  </div>
  <section class="pp__sec">
    <h2 class="pp__h">1. Your website</h2>
    <div class="pp__box"><a class="pp__value" href="${esc(pr.siteUrl)}" target="_blank" rel="noopener">${esc(pr.siteUrl)}</a></div>
  </section>
  <section class="pp__sec">
    <h2 class="pp__h">2. Try the editor</h2>
    <div class="pp__box">
      <div class="pp__row"><span class="pp__label">Editor</span><a class="pp__value" href="${esc(pr.editorUrl)}" target="_blank" rel="noopener">${esc(pr.editorUrl)}</a></div>
    </div>
  </section>
  <section class="pp__sec">
    <h2 class="pp__h">3. About Lazy</h2>
    <a class="pp__btn" href="${esc(settings.whitepaperUrl)}" target="_blank" rel="noopener">Read the whitepaper</a>
  </section>
  <section class="pp__sec">
    <h2 class="pp__h">4. Direct booking options</h2>
    <div class="pp__cards">${cards}
    </div>
  </section>
</main>
</body>
</html>
`;
}

// Email clients ignore stylesheets: tables and inline styles only, values from the brand tokens in proposal.css.
function email(client, prop, pr, settings, options, url) {
  const C = { ink: '#17363c', mute: '#8fa3a4', coral: '#f9426f', teal: '#2fa18c', line: '#d3ede6', cream: '#fffdf6', white: '#ffffff' };
  const font = "font-family:'Noto Serif',Georgia,serif;";
  const h = (t) => `<tr><td style="${font}font-size:20px;font-weight:600;color:${C.ink};padding:28px 0 10px;">${t}</td></tr>`;
  const box = (inner) => `<tr><td style="background:${C.white};border:1px solid ${C.line};border-radius:12px;padding:18px 20px;${font}font-size:16px;line-height:1.6;color:${C.ink};">${inner}</td></tr>`;
  const link = (u, t) => `<a href="${esc(u)}" style="color:${C.teal};">${esc(t || u)}</a>`;
  const btn = (u, t) => `<a href="${esc(u)}" style="display:inline-block;background:${C.coral};color:${C.white};text-decoration:none;font-weight:600;padding:10px 22px;border-radius:8px;${font}">${esc(t)}</a>`;
  const engines = options.map((o) => `
      <tr><td style="padding:0 0 12px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.white};border:1px solid ${C.line};border-radius:12px;">
        <tr><td style="padding:16px 20px;${font}font-size:15px;line-height:1.55;color:${C.ink};">
          <div style="font-size:18px;font-weight:600;">${esc(o.name)}</div>
          <div style="margin:4px 0 8px;">${esc(o.about)}</div>
          <div><strong>Best for:</strong> ${esc(o.bestFor)}</div>
          <div><strong>With your Lazy site:</strong> ${esc(o.withLazy)}</div>
          <div style="margin:8px 0;font-weight:600;">${esc(o.price)}</div>
          <div style="color:${C.mute};font-size:14px;">${o.services.map(esc).join(' · ')}</div>
          <div style="margin-top:10px;">${link(o.url, 'Visit ' + o.name + ' →')}</div>
        </td></tr></table></td></tr>`).join('');
  const subject = 'Your Lazy proposal — ' + prop.name;
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${C.cream};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="${font}font-size:26px;font-weight:600;color:${C.ink};">${esc(prop.name)}</td></tr>
  <tr><td style="${font}font-size:16px;color:${C.ink};padding-top:12px;line-height:1.6;">Hi ${esc(client.name)},<br>here is your proposal for ${esc(prop.name)}.</td></tr>
  ${h('1. Your website')}
  ${box(link(pr.siteUrl))}
  ${h('2. Try the editor')}
  ${box(`<strong>Editor:</strong> ${link(pr.editorUrl)}`)}
  ${h('3. About Lazy')}
  <tr><td>${btn(settings.whitepaperUrl, 'Read the whitepaper')}</td></tr>
  ${h('4. Direct booking options')}
  ${engines}
  <tr><td style="padding-top:16px;">${btn(url, 'See the full proposal')}</td></tr>
  <tr><td style="${font}font-size:13px;color:${C.mute};padding-top:16px;">Prices are approximate, as listed by each provider on ${esc(options[0] ? options[0].checked : '')}.</td></tr>
</table></td></tr></table>
</body></html>
`;
  return { subject, html };
}

function build(only) {
  const settings = read('data/settings.json');
  const options = read('data/booking-options.json');
  const out = [];
  fs.mkdirSync(path.join(ROOT, 'emails'), { recursive: true });
  for (const c of clients()) {
    for (const pr of c.proposals || []) {
      if (only && pr.token !== only) continue;
      const prop = (c.properties || []).find((p) => p.id === pr.property) || { name: pr.property };
      const url = settings.siteBase + 'p/' + pr.token + '/';
      const dir = path.join(ROOT, 'site/p', pr.token);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'index.html'), page(c, prop, pr, settings, options));
      const m = email(c, prop, pr, settings, options, url);
      fs.writeFileSync(path.join(ROOT, 'emails', pr.token + '.html'), m.html);
      fs.writeFileSync(path.join(ROOT, 'emails', pr.token + '.json'), JSON.stringify({ to: c.email, subject: m.subject }, null, 2) + '\n');
      out.push({ client: c.name, property: prop.name, url, email: 'emails/' + pr.token + '.html', subject: m.subject });
    }
  }
  return out;
}

module.exports = { build };
if (require.main === module) for (const r of build(process.argv[2])) console.log(r.client + ' — ' + r.property + ': ' + r.url + '  ·  email: ' + r.email);
