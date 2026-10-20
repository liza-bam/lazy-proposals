/* Clients own property intakes. GitHub stores both, using the browser's existing connection. */
'use strict';
const REPO = 'liza-bam/lazy-proposals';
const API = 'https://api.github.com/repos/' + REPO + '/contents/';
const TOKEN_KEY = 'lazy-proposals-token';

const token = () => { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } };
const setToken = (t) => { try { localStorage.setItem(TOKEN_KEY, t.trim()); } catch (e) { /* private window */ } };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const b64 = (text) => btoa(unescape(encodeURIComponent(text)));
const unb64 = (data) => decodeURIComponent(escape(atob(data.replace(/\n/g, ''))));

async function gh(path, opts) {
  const r = await fetch(API + path, Object.assign({ cache: 'no-store' }, opts, {
    headers: Object.assign({ Authorization: 'Bearer ' + token(), Accept: 'application/vnd.github+json' }, (opts || {}).headers) }));
  if (r.status === 401) throw new Error('The GitHub token was refused. Paste a new one.');
  if (!r.ok && r.status !== 404) throw new Error('GitHub: ' + r.status + ' ' + (await r.text()).slice(0, 120));
  return r.status === 404 ? null : r.json();
}
// A JSON file and its version (sha), or null.
async function readJson(path) {
  const f = await gh(path);
  return f ? { data: JSON.parse(unb64(f.content)), sha: f.sha } : null;
}
// Save text (or base64 with raw=true); sha is the version read, so a newer save is never overwritten.
async function save(path, body, sha, message, raw) {
  const res = await gh(path, { method: 'PUT', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message, content: raw ? body : b64(body), sha: sha || undefined }) });
  return res.content.sha;
}
async function list(dir) { return (await gh(dir)) || []; }

// The online intake is the handoff for website content. Keep the three source essentials first.
const SECTIONS = [
  ['Website essentials', [['name', 'Property name'], ['listingUrl', 'Airbnb listing URL'],
    ['ownerHighlights', 'What does the owner want guests to notice?', 'area'], ['amenitiesGroups', 'Full amenities list', 'tall']]],
  ['Photos, reviews & property details', [['imageLink', 'Photo collection link'], ['approximateLocation', 'Approximate public location'],
    ['reviews', 'Guest reviews to import', 'area'], ['listingFacts', 'Listing text & practical details', 'tall'], ['mapNotes', 'Location notes', 'area']]],
  ['Website', [['siteUrl', 'Existing website'], ['login', 'Property editor login']]],
  ['Design preferences', [['propertyType', 'Property type', 'choice'], ['setting', 'Setting', 'choice'], ['propertyStyle', 'Property style', 'choice'],
    ['websiteStyle', 'Website style', 'choice'], ['focus', 'Website focus', 'choice']]],
  ['Host story & local tips', [['hostStory', 'Host introduction & property story', 'area'], ['hostTips', 'Host recommendations & local tips', 'area']]],
  ['Page plan — internal', [['homeContent', 'Home content & sources', 'area'], ['pageOneName', 'Stay page name'],
    ['pageOneContent', 'Stay content & sources', 'area'], ['pageTwoName', 'Experience page name'],
    ['pageTwoContent', 'Experience content & sources', 'area'], ['guidebookContent', 'Guidebook notes', 'area'],
    ['additionalIdeas', 'Article & itinerary ideas', 'area'], ['additionalSources', 'Other source links & file references', 'area'],
    ['missing', 'Missing information & questions', 'area']]]];
const FIELD_HELP = {
  listingUrl: 'Paste the Airbnb room link. We use it to verify the property, description, sleeping arrangements and house rules.',
  ownerHighlights: 'In the owner’s words: what makes this stay special, who it suits and what to feature first. A few bullets are enough.',
  amenitiesGroups: 'Paste the complete Airbnb amenities list with its category headings, descriptions and “Not included” items. We keep the full source, remove duplicates and feature the useful benefits on Stay. Skip obvious basics such as hot water in guest-facing copy.',
  imageLink: 'Link to the actual photo collection or this property’s Lazy photo library. Filenames and a local folder path alone are not an online collection.',
  reviews: 'Paste genuine reviews, including guest name, rating, date and full review text, or link to the review file. Do not invent dates or testimonials.',
  listingFacts: 'Paste the listing description and practical details: capacity, bedrooms, beds, bathrooms, check-in, rules and any limitations. No need to rewrite them.',
  approximateLocation: 'Town or general area for the public website. Keep private arrival instructions out of this field.',
  focus: 'Optional direction, such as family stays. This complements the owner’s selling points above.',
  guidebookContent: 'Record the intended audience and useful local tips. Preserve an existing Guidebook unless changes are specifically requested.',
  additionalSources: 'Keep retrievable links and file references with this property. Never paste passwords or session tokens.',
  missing: 'Track gaps here. Missing design preferences do not prevent source collection.'
};

// Merge visible edits into the version that was opened. Preserve attachments, metadata and future fields.
function mergeIntakeRecord(existing, entries, id) {
  const fields = Object.fromEntries(entries);
  const r = Object.assign({}, existing || {}, { id, timeline: Object.assign({}, (existing || {}).timeline) });
  for (const [, rows] of SECTIONS) for (const [key, , kind] of rows) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) r[key] = ['area', 'tall'].includes(kind) ? String(fields[key]) : String(fields[key]).trim();
  }
  for (const [key] of TIMELINE) {
    if (!Object.prototype.hasOwnProperty.call(fields, 'sk_' + key) && !Object.prototype.hasOwnProperty.call(fields, 'tl_' + key)) continue;
    if (fields['sk_' + key] === '1') r.timeline[key] = 'skip';
    else if (fields['tl_' + key]) r.timeline[key] = fields['tl_' + key];
    else delete r.timeline[key];
  }
  r.updatedAt = new Date().toISOString();
  if (!r.createdAt && !(existing || {}).id) r.createdAt = r.updatedAt;
  return r;
}
const CHOICES = {
  propertyType: ['Lake house', 'Beach house', 'Bungalow', 'Cottage', 'Cabin', 'Chalet', 'Farmhouse', 'Country house', 'Villa', 'Townhouse', 'Brownstone', 'Apartment', 'Luxury apartment or penthouse', 'Loft', 'Studio', 'Guesthouse', 'Tiny house', 'Converted space', 'Unusual stay'],
  setting: ['City center', 'Residential city neighborhood', 'Suburbs', 'Small town or village', 'Countryside', 'Remote wilderness', 'Lakefront or riverside', 'Beachfront or coastal', 'Mountains', 'Forest', 'Desert', 'Tropical garden or jungle'],
  propertyStyle: ['Modern', 'Traditional', 'Rustic', 'Coastal or tropical', 'Retro', 'Eclectic', 'Luxury'],
  websiteStyle: ['Minimalist', 'Editorial', 'Classic', 'Rustic', 'Tropical', 'Retro', 'Playful', 'Elegant or luxury'],
  focus: ['Property and features', 'Views and surroundings', 'Activities and adventures', 'Rest and relaxation', 'Family stays', 'Romantic getaways', 'Luxury and comfort', 'Local culture and experiences', 'Convenient location', 'Work and extended stays'] };

// The client's timeline, in order; a client can start at any step.
const TIMELINE = [
  ['request', 'Request received', 'Free, no credit card to start'],
  ['confirmation', 'Confirmation email sent', ''],
  ['deliveryDate', 'Delivery date given', 'Within 1 business day'],
  ['built', 'Website built', 'Usually 3–4 business days · design and setup free during launch'],
  ['intake', 'Intake filled', ''],
  ['proposal', 'Proposal prepared', 'Email and PDF saved for this client'],
  ['doneEmail', 'Done email sent', 'With the demo invite'],
  ['demo', 'Demo and training session', ''],
  ['integration', 'Integration session', 'If booked · integration is free'],
  ['launch', 'Launch', 'First month of hosting and support free'],
  ['billing', 'Billing starts', '$50 per month · $25 per additional property'],
  ['cancel', 'Cancelled', 'Took the site, or kept as a portfolio piece']];

// The token box, shown until a token is saved.
function needToken(el, then) {
  if (token()) return false;
  el.innerHTML = '<form class="box" id="tok"><strong>Connect to GitHub</strong>' +
    '<p class="muted">Paste a GitHub token with read and write access to Contents of ' + REPO + '. It stays in this browser.</p>' +
    '<label>Token<input name="t" type="password" autocomplete="off" required></label><button class="go">Connect</button></form>';
  el.querySelector('#tok').onsubmit = (e) => { e.preventDefault(); setToken(e.target.t.value); then(); };
  return true;
}
