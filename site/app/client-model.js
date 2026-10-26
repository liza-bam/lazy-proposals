/* Shared client/property rules for the online app and proposal CLI. */
(function (root, factory) {
  const model = factory();
  if (typeof module === 'object' && module.exports) module.exports = model;
  else root.ClientModel = model;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const CLIENT_STEPS = ['request', 'confirmation', 'doneEmail', 'demoScheduled', 'demo', 'billing', 'cancel'];
  const PROPERTY_STEPS = ['built', 'intake', 'integration', 'launch'];
  function propertiesForClient(client, websites) {
    return websites.filter(p => p.clientId ? p.clientId === client.id : (client.properties || []).some(x => x.id === p.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  function clientForProperty(property, clients) {
    return clients.find(c => property.clientId ? c.id === property.clientId : (c.properties || []).some(p => p.id === property.id)) || null;
  }
  function mergeClientRecord(existing, entries, id) {
    const fields = Object.fromEntries(entries), out = Object.assign({}, existing || {}, { id, timeline: Object.assign({}, (existing || {}).timeline) });
    for (const k of ['name', 'email', 'phone', 'login', 'notes', 'billingNotes', 'kind', 'business', 'platform', 'status', 'siteUrl', 'driveUrl']) if (Object.prototype.hasOwnProperty.call(fields, k)) out[k] = String(fields[k]).trim();
    for (const k of CLIENT_STEPS) {
      if (fields['sk_' + k] === '1') out.timeline[k] = 'skip';
      else if (fields['tl_' + k]) out.timeline[k] = fields['tl_' + k];
      else if (Object.prototype.hasOwnProperty.call(fields, 'tl_' + k)) delete out.timeline[k];
    }
    out.updatedAt = new Date().toISOString();
    if (!out.createdAt && !(existing || {}).id) out.createdAt = out.updatedAt;
    return out;
  }
  // Other clients: anyone who is not a Lazy website client, e.g. a Shopify store.
  const isOther = c => (c || {}).kind === 'other';
  function supportForCount(settings, count) {
    const s = settings.proposal.support, base = s.price.match(/\$([\d.]+)/), extra = s.note.match(/\$([\d.]+)/);
    if (count > 1 && base && extra) return Object.assign({}, s, { price: '$' + (Number(base[1]) + Number(extra[1]) * (count - 1)) + ' per month', note: 'For ' + count + ' websites · ' + s.price + ' for the first, ' + s.note.toLowerCase() });
    return Object.assign({}, s);
  }
  function proposalFields(client, websites, settings, ids) {
    const owned = propertiesForClient(client, websites);
    if (ids && ids.some(id => !owned.some(p => p.id === id))) throw new Error('The proposal contains a property belonging to another client.');
    const properties = ids ? owned.filter(p => ids.includes(p.id)) : owned;
    if (!properties.length) throw new Error('Select at least one property for this client.');
    const names = properties.map(p => p.name), joined = names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names[0];
    const many = properties.length > 1, owner = client.name || '';
    return { id: client.id, clientId: client.id, to: client.email || '', owner,
      first: /&| and /.test(owner) ? owner : owner.split(/\s+/)[0], property: joined, properties,
      propertyIds: properties.map(p => p.id), siteUrl: properties[0].siteUrl || '', login: client.login || '',
      subject: settings.proposal.subject.replace('{property}', joined).replace('Your website ', many ? 'Your websites ' : 'Your website ').replace(' is ready', many ? ' are ready' : ' is ready'),
      intro: settings.welcome.replace('{property}', joined).replace('Your new website ', many ? 'Your new websites ' : 'Your new website ').replace(' is ready', many ? ' are ready' : ' is ready'),
      attachName: settings.proposal.pdfName.replace('{property}', joined), support: supportForCount(settings, properties.length),
      missing: [!client.email && 'client email', ...properties.filter(p => !p.siteUrl).map(p => 'website for ' + p.name), !owner && 'client name'].filter(Boolean) };
  }
  // The website ready email: data/templates/done-email.html filled from the proposal fields; the offer line only with the PDF.
  const escHtml = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const FONT = "Georgia,'Noto Serif','Times New Roman',serif", TEXT = 'font-family:' + FONT + ';font-size:15px;line-height:1.55;color:#17363c;';
  // The LAZY email button (rentals-marketing tools/intake/Code.gs button()), in the site's primary green.
  const emailButton = (u, label) => '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 0;"><tr><td style="background:#057d7b;border-radius:8px;"><a href="' + escHtml(u) + '" style="display:inline-block;padding:13px 24px;font-family:' + FONT + ';font-size:15px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#ffffff;text-decoration:none;">' + escHtml(label) + '</a></td></tr></table>';
  // Sandy's signature in every email: the closing, the LAZY logo, her name large, how to reach her.
  function signature(settings) {
    const g = settings.signature, lines = String(settings.signoff || '').split('\n'), closing = lines.slice(0, -1).join(' ') || 'Talk soon!';
    return '<p style="margin:0 0 14px;font-family:' + FONT + ';font-size:16px;line-height:1.5;color:#17363c;">' + escHtml(closing) + '</p>' +
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>' +
      '<td valign="middle" style="padding-right:16px;"><img src="' + escHtml(g.logo) + '" width="72" alt="Lazy" style="display:block;border:0;width:72px;height:auto;"></td>' +
      '<td valign="middle" style="font-family:' + FONT + ';">' +
      '<div style="font-style:italic;font-weight:700;font-size:26px;line-height:1.1;color:#17363c;">' + escHtml(g.name) + '</div>' +
      '<div style="font-size:14px;line-height:1.5;color:#068b88;padding-top:2px;">' + escHtml(g.title) + '</div>' +
      '<div style="font-size:14px;line-height:1.5;padding-top:2px;"><a href="mailto:' + escHtml(settings.senderEmail) + '" style="color:#17363c;text-decoration:none;">' + escHtml(settings.senderEmail) + '</a> &middot; <a href="tel:' + escHtml(g.phone.replace(/[^\d+]/g, '')) + '" style="color:#17363c;text-decoration:none;">' + escHtml(g.phone) + '</a></div>' +
      '</td></tr></table>';
  }
  function websiteReadyEmail(template, f, settings, attach) {
    const fill = { subject: escHtml(f.subject), greeting: escHtml(f.first), marketingUrl: escHtml(settings.marketingUrl), facebookUrl: escHtml(settings.facebookUrl), signature: signature(settings),
      websiteButtons: f.properties.map(p => emailButton(p.siteUrl, f.properties.length > 1 ? p.name : 'Visit your website')).join(''),
      loginLine: f.login ? '<p style="margin:12px 0 0;' + TEXT + '">Your login: <strong>' + escHtml(f.login) + '</strong></p>' : '',
      offerLine: attach ? '<p style="margin:0 0 18px;' + TEXT + '">' + escHtml(settings.proposal.attachNote) + '</p>' : '' };
    return template.replace(/\{\{button:(\w+):([^}]+)\}\}/g, (m, k, label) => settings[k] ? emailButton(settings[k], label) : '')
      .replace(/\{\{(\w+)\}\}/g, (m, k) => fill[k] == null ? m : fill[k]);
  }
  // A date n business days (Monday to Friday) after a YYYY-MM-DD day.
  function addBusinessDays(day, n) {
    const d = new Date(day + 'T12:00:00');
    while (n > 0) { d.setDate(d.getDate() + 1); if (d.getDay() % 6) n--; }
    return d;
  }
  // The confirmation email: data/templates/confirmation-email.html, ready for review 2 business days after the intake.
  function confirmationEmail(template, client, websites, settings, today) {
    const intake = propertiesForClient(client, websites).map(p => (p.timeline || {}).intake).filter(v => v && v !== 'skip').sort().pop();
    const request = (client.timeline || {}).request, from = intake || (request && request !== 'skip' ? request : today);
    const owner = client.name || '', first = /&| and /.test(owner) ? owner : owner.split(/\s+/)[0];
    const readyDate = addBusinessDays(from, 2).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const subject = 'Thank you — your LAZY website is on its way';
    const fill = { subject: escHtml(subject), greeting: escHtml(first), readyDate: escHtml(readyDate), signature: signature(settings) };
    return { subject, readyDate, html: template.replace(/\{\{(\w+)\}\}/g, (m, k) => fill[k] == null ? m : fill[k]) };
  }
  return { CLIENT_STEPS, PROPERTY_STEPS, isOther, propertiesForClient, clientForProperty, mergeClientRecord, supportForCount, proposalFields, websiteReadyEmail, addBusinessDays, confirmationEmail };
});
