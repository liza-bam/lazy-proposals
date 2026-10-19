// Make proposal: a form filled from the website intake, the Lazy account and the offer; once checked,
// the short email (emails/<token>.html) and its one-page PDF (emails/<token>.pdf), both local only.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pdf } = require('./build');

const ROOT = path.resolve(__dirname, '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const settings = () => read('data/settings.json');
const intakeDir = () => path.resolve(ROOT, settings().proposal.intakeDir);

// The properties in the website intake.
function properties() {
  const dir = intakeDir();
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(dir, d.name, 'intake.json')))
    .map((d) => JSON.parse(fs.readFileSync(path.join(dir, d.name, 'intake.json'), 'utf8')))
    .map((p) => ({ id: p.id, name: p.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// The property's Lazy account, matched by property name: its website address and editor login.
async function account(name) {
  const jar = path.resolve(ROOT, settings().proposal.adminJar);
  if (!fs.existsSync(jar)) return null;
  const cookie = JSON.parse(fs.readFileSync(jar, 'utf8')).map((c) => c.name + '=' + c.value).join('; ');
  const r = await fetch('https://admin.lazy.vacations/api/admin/accounts', { headers: { cookie } });
  if (!r.ok) return null;
  const j = await r.json();
  for (const a of j.accounts || j) for (const p of a.properties || []) if (p.name === name) return { account: a, property: p };
  return null;
}

async function prefill(id) {
  const file = path.join(intakeDir(), path.basename(id), 'intake.json');
  if (!fs.existsSync(file)) throw new Error('No website intake for ' + id + '.');
  const i = JSON.parse(fs.readFileSync(file, 'utf8')), s = settings();
  const hit = await account(i.name);
  const owner = i.ownerName || '';
  return {
    property: i.name,
    owner,
    first: owner.split(/\s+/)[0] || '',
    to: i.ownerEmail || '',
    phone: i.ownerPhone || '',
    siteUrl: hit ? 'https://' + hit.property.slug + '.lazy.vacations/' : '',
    login: hit ? hit.account.username || '' : '',
    listingUrl: i.listingUrl || '',
    subject: s.proposal.subject.replace('{property}', i.name),
    intro: s.welcome.replace('{property}', i.name),
    missing: [!i.ownerEmail && 'owner email', !hit && 'website (no Lazy account with this property name)'].filter(Boolean),
  };
}

// Email clients ignore stylesheets: tables and inline styles, the colours of proposal.css.
function email(f, s) {
  const C = { ink: '#17363c', coral: '#f9426f', cream: '#fffdf6' };
  const font = "font-family:'Noto Serif',Georgia,serif;";
  const text = `${font}font-size:16px;line-height:1.6;color:${C.ink};`;
  const btn = (u, t) => `<a href="${esc(u)}" target="_blank" rel="noopener" style="display:inline-block;background:${C.coral};color:#ffffff;text-decoration:none;font-weight:600;padding:10px 22px;border-radius:8px;${font}">${esc(t)}</a>`;
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>${esc(f.subject)}</title></head>
<body style="margin:0;padding:0;background:${C.cream};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="padding-bottom:16px;"><img src="${esc(s.siteBase)}lazy-logo-email.png" width="120" alt="Lazy" style="display:block;border:0;"></td></tr>
  <tr><td style="${font}font-size:26px;font-weight:600;color:${C.ink};">Welcome, ${esc(f.first)}!</td></tr>
  <tr><td style="${text}padding-top:12px;">${esc(f.intro)}</td></tr>
  ${f.siteUrl ? `<tr><td style="padding-top:20px;">${btn(f.siteUrl, 'Visit your website')}</td></tr>` : ''}
  <tr><td style="padding-top:12px;">${btn(s.editorUrl, 'Open the editor')}</td></tr>
  ${f.login ? `<tr><td style="${text}padding-top:12px;">Your login: <strong>${esc(f.login)}</strong>. ${esc(s.editorNote)}</td></tr>` : ''}
  <tr><td style="${text}padding-top:20px;">${esc(s.proposal.attachNote)}</td></tr>
  <tr><td style="${text}padding-top:28px;white-space:pre-line;">${esc(s.signoff)}</td></tr>
</table></td></tr></table>
</body></html>
`;
}

// The logo inline: a mask image does not load when Chrome prints a local file. It paints in currentColor.
const logo = () => fs.readFileSync(path.join(ROOT, 'site', 'lazy-logo.svg'), 'utf8').replace(/<\?xml[^>]*>\s*/, '')
  .replace('<svg ', '<svg class="op__logo" role="img" aria-label="Lazy" ');

// The one-page proposal, printed on Letter.
function page(f, s) {
  const P = s.proposal, list = (items) => `<ul>${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>${esc(P.title.replace('{owner}', f.owner))}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;600;700&display=swap">
<link rel="stylesheet" href="${esc('file://' + path.join(ROOT, 'site', 'proposal.css'))}">
</head><body>
<main class="op">
  <header class="pp__top">${logo()}<span class="op__date">${esc(date)}</span></header>
  <div>
    <h1 class="op__title">${esc(P.title.replace('{owner}', f.owner))}</h1>
    <p class="op__for">${esc(f.property)}${f.siteUrl ? ` · <a href="${esc(f.siteUrl)}">${esc(f.siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</a>` : ''}</p>
  </div>
  <section class="op__card">
    <div class="op__head"><h2>${esc(P.free.heading)}</h2><div class="op__price">${esc(P.free.price)}<span>${esc(P.free.note)}</span></div></div>
    <div class="op__groups">${P.free.groups.map(([h, items]) => `<div><h3>${esc(h)}</h3>${list(items)}</div>`).join('')}</div>
  </section>
  <section class="op__card">
    <div class="op__head"><h2>${esc(P.support.heading)} <span class="op__badge">${esc(P.support.badge)}</span></h2><div class="op__price">${esc(P.support.price)}<span>${esc(P.support.note)}</span></div></div>
    ${list(P.support.items)}
    <p class="op__cancel">${esc(P.cancel)}</p>
  </section>
  <footer class="op__foot"><strong>${esc(P.start)}</strong><span>${esc(P.contact)}</span></footer>
</main>
</body></html>
`;
}

function make(f) {
  const s = settings();
  if (!String(f.to || '').trim()) throw new Error('Add the owner email.');
  if (!String(f.property || '').trim()) throw new Error('Add the property.');
  const token = crypto.randomBytes(6).toString('hex');
  const dir = path.join(ROOT, 'emails');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, token + '.html'), email(f, s));
  const pageFile = path.join(dir, token + '-proposal.html');
  fs.writeFileSync(pageFile, page(f, s));
  pdf(pageFile, path.join(dir, token + '.pdf'));
  const meta = { to: f.to.trim(), subject: f.subject, attach: token + '.pdf', attachName: s.proposal.pdfName.replace('{property}', f.property), property: f.property, owner: f.owner, made: new Date().toISOString() };
  fs.writeFileSync(path.join(dir, token + '.json'), JSON.stringify(meta, null, 2) + '\n');
  return Object.assign({ token }, meta);
}

module.exports = { properties, prefill, make };
