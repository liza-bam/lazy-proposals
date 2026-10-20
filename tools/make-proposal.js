#!/usr/bin/env node
/* MAKE PROPOSAL, no browser. A client and their selected property intakes, plus the offer
 * (data/settings.json → proposal) make the short email and the one-page PDF.
 *   node tools/make-proposal.js <client-id>           show the filled proposal, to check
 *   node tools/make-proposal.js <client-id> --make    write proposals/clients/<client-id>/<token>/ (proposal.pdf, email.html, proposal.json)
 *                                              and date the timeline's Proposal step
 * Claude then makes the Gmail draft from proposal.json, email.html and proposal.pdf (skill make-proposal). */
'use strict';
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const ROOT = path.resolve(__dirname, '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const C = { ink: '#17363c', mute: '#8fa3a4', line: '#d3ede6', tint: '#eafaf6', coral: '#f9426f', logo: '#ff6f5e', cream: '#fffdf6' };

const Model = require('../site/app/client-model.js');
function fields(id, propertyIds) {
  const all = dir => fs.readdirSync(path.join(ROOT, dir)).filter(n => n.endsWith('.json')).map(n => read(dir + '/' + n));
  const clients = all('data/clients'), websites = all('data/websites');
  const property = websites.find(p => p.id === id);
  const client = clients.find(c => c.id === id) || (property && Model.clientForProperty(property, clients));
  if (!client) throw new Error('No client or linked property ' + id + '.');
  return Model.proposalFields(client, websites, read('data/settings.json'), propertyIds);
}

// The email: tables and inline styles, as email clients need.
function email(f, S) {
  const font = "font-family:'Noto Serif',Georgia,serif;", text = font + 'font-size:16px;line-height:1.6;color:' + C.ink + ';';
  const btn = (u, t) => '<a href="' + esc(u) + '" target="_blank" rel="noopener" style="display:inline-block;background:' + C.coral + ';color:#ffffff;text-decoration:none;font-weight:600;padding:10px 22px;border-radius:8px;' + font + '">' + esc(t) + '</a>';
  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>' + esc(f.subject) + '</title></head>' +
    '<body style="margin:0;padding:0;background:' + C.cream + ';"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + C.cream + ';"><tr><td align="center" style="padding:24px 12px;">' +
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">' +
    '<tr><td style="padding-bottom:16px;"><img src="' + esc(S.siteBase) + 'lazy-logo-email.png" width="120" alt="Lazy" style="display:block;border:0;"></td></tr>' +
    '<tr><td style="' + font + 'font-size:26px;font-weight:600;color:' + C.ink + ';">Welcome, ' + esc(f.first) + '!</td></tr>' +
    '<tr><td style="' + text + 'padding-top:12px;">' + esc(f.intro) + '</td></tr>' +
    f.properties.map(p => '<tr><td style="padding-top:20px;">' + btn(p.siteUrl, f.properties.length > 1 ? p.name : 'Visit your website') + '</td></tr>').join('') +
    '<tr><td style="padding-top:12px;">' + btn(S.editorUrl, 'Open the editor') + '</td></tr>' +
    (f.login ? '<tr><td style="' + text + 'padding-top:12px;">Your login: <strong>' + esc(f.login) + '</strong>. ' + esc(S.editorNote) + '</td></tr>' : '') +
    '<tr><td style="' + text + 'padding-top:20px;">' + esc(S.proposal.attachNote) + '</td></tr>' +
    '<tr><td style="' + text + 'padding-top:28px;white-space:pre-line;">' + esc(S.signoff) + '</td></tr></table></td></tr></table></body></html>\n';
}

// The one-page proposal on Letter: the offer's two cards for this owner and property.
function pdf(f,S,out){
 const doc=new PDFDocument({size:'LETTER',margin:40,bufferPages:true,info:{Title:S.proposal.title.replace('{owner}',f.owner),Author:'Lazy'}});
 const done=new Promise((ok,no)=>{const stream=fs.createWriteStream(out);stream.on('finish',ok);stream.on('error',no);doc.on('error',no);doc.pipe(stream);});
 require('../site/app/proposal-pdf.js').draw(doc,f,S,{regular:path.join(__dirname,'fonts/NotoSerif-Regular.ttf'),bold:path.join(__dirname,'fonts/NotoSerif-Bold.ttf'),svg:fs.readFileSync(path.join(ROOT,'site/lazy-logo.svg'),'utf8')});
 doc.end();return done;
}

async function main() {
  const [id, ...args] = process.argv.slice(2);
  const flag = args.includes('--make') ? '--make' : '';
  const option = args.find(x => x.startsWith('--properties='));
  if (!id) throw new Error('Usage: node tools/make-proposal.js <client-id> [--properties=id1,id2] [--make]');
  const f = fields(id, option ? option.slice('--properties='.length).split(',') : undefined), S = read('data/settings.json');
  if (flag !== '--make') {
    for (const k of ['to', 'owner', 'first', 'property', 'siteUrl', 'login', 'subject', 'intro', 'attachName']) console.log(k.padEnd(10), f[k] || '—');
    console.log('websites  ', f.properties.length);
    console.log('support   ', f.support.price);
    if (f.missing.length) console.log('MISSING   ', f.missing.join(', '));
    return;
  }
  if (f.missing.length) throw new Error('Missing: ' + f.missing.join(', '));
  const token = Date.now().toString(36), dir = path.join(ROOT, 'proposals', 'clients', f.clientId, token);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'email.html'), email(f, S));
  await pdf(f, S, path.join(dir, 'proposal.pdf'));
  fs.writeFileSync(path.join(dir, 'proposal.json'), JSON.stringify({ id: f.clientId, clientId: f.clientId, propertyIds: f.propertyIds, properties: f.properties.map(p => ({ id: p.id, name: p.name, siteUrl: p.siteUrl })), to: f.to, subject: f.subject, attachName: f.attachName, made: new Date().toISOString() }, null, 2) + '\n');
  const rf = path.join(ROOT, 'data/clients', f.clientId + '.json'), r = JSON.parse(fs.readFileSync(rf, 'utf8'));
  r.timeline = Object.assign({}, r.timeline, { proposal: new Date().toISOString().slice(0, 10) });
  r.proposals = [...(r.proposals || []), { token, date: new Date().toISOString().slice(0, 10), properties: f.propertyIds, path: path.relative(ROOT, dir) + '/' }];
  r.updatedAt = new Date().toISOString();
  fs.writeFileSync(rf, JSON.stringify(r, null, 2) + '\n');
  console.log(path.relative(ROOT, dir));
}
module.exports = { fields, email, pdf };
if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
