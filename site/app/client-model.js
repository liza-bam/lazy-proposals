/* Shared client/property rules for the online app and proposal CLI. */
(function (root, factory) {
  const model = factory();
  if (typeof module === 'object' && module.exports) module.exports = model;
  else root.ClientModel = model;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const CLIENT_STEPS = ['request', 'confirmation', 'deliveryDate', 'proposal', 'doneEmail', 'demo', 'billing', 'cancel'];
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
    for (const k of ['name', 'email', 'phone', 'login', 'notes', 'billingNotes']) if (Object.prototype.hasOwnProperty.call(fields, k)) out[k] = String(fields[k]).trim();
    for (const k of CLIENT_STEPS) {
      if (fields['sk_' + k] === '1') out.timeline[k] = 'skip';
      else if (fields['tl_' + k]) out.timeline[k] = fields['tl_' + k];
      else if (Object.prototype.hasOwnProperty.call(fields, 'tl_' + k)) delete out.timeline[k];
    }
    out.updatedAt = new Date().toISOString();
    if (!out.createdAt && !(existing || {}).id) out.createdAt = out.updatedAt;
    return out;
  }
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
  return { CLIENT_STEPS, PROPERTY_STEPS, propertiesForClient, clientForProperty, mergeClientRecord, supportForCount, proposalFields };
});
