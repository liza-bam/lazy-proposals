/* CLIENTS, ONLINE. The records are JSON files in this repo (data/websites/<id>.json), read and saved
   through GitHub with the token kept in this browser only. Shared by the clients page and Make proposal. */
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

// The website intake's fields, its sections and choices (lazy-project/Website maker/tools/intake-assets/index.html).
const SECTIONS = [
  ['Owner and website', [['name', 'Property name'], ['ownerName', "Owner's name"], ['ownerPhone', "Owner's phone"], ['ownerEmail', "Owner's email"],
    ['siteUrl', 'Website'], ['login', 'Editor login'], ['listingUrl', 'Airbnb listing URL']]],
  ['1. Source materials', [['listingFacts', 'Full listing fact inventory', 'tall'], ['amenitiesGroups', 'Amenities — groups and exact items', 'tall'],
    ['approximateLocation', 'Approximate public location'], ['mapNotes', 'Map screenshot / location notes', 'area'], ['reviews', 'Reviews to import', 'area'],
    ['imageLink', 'Image collection link']]],
  ['2. Designer direction', [['propertyType', 'Property type', 'choice'], ['setting', 'Setting', 'choice'], ['propertyStyle', 'Property style', 'choice'],
    ['websiteStyle', 'Website style', 'choice'], ['focus', 'Website focus', 'choice']]],
  ['3. Page plan', [['homeContent', 'Home: content, images, reviews and source assignments', 'area'], ['pageOneName', 'Custom page 1 name'],
    ['pageOneContent', 'Custom page 1: content, images, reviews and sources', 'area'], ['pageTwoName', 'Custom page 2 name'],
    ['pageTwoContent', 'Custom page 2: content, images, reviews and sources', 'area'], ['guidebookContent', 'Guidebook: directory and approximate map plan', 'area']]],
  ['4. Additional content', [['hostStory', 'Host introduction and property story', 'area'], ['hostTips', 'Host recommendations and local tips', 'area'],
    ['additionalIdeas', 'Article, card and itinerary ideas', 'area'], ['additionalSources', 'Supporting images and verified sources', 'area'],
    ['missing', 'Missing source material and unresolved choices', 'area']]]];
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
  ['proposal', 'Proposal sent', 'Website and one-page PDF with the offer'],
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
