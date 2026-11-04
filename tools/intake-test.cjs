'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const context = vm.createContext({ console, document: { addEventListener() {} } });
vm.runInContext(fs.readFileSync(path.join(root, 'site/app/app.js'), 'utf8'), context);
const html = fs.readFileSync(path.join(root, 'site/app/index.html'), 'utf8');
const inline = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(s => s.trim()).join('\n');
vm.runInContext(inline.replace(/\nstart\(\);\s*$/, ''), context);
const merge = vm.runInContext('mergeIntakeRecord', context);
const normalize = value => JSON.parse(JSON.stringify(value));

test('saving intake edits preserves attachments, metadata and unknown fields', () => {
  const original = { id: 'lake-house', name: 'Lake House', files: [{ stored: 'photos.zip', size: 54 }], createdAt: '2026-10-01', customMetadata: { propertyId: '123' }, timeline: { request: '2026-10-02', futureStep: 'keep' }, listingFacts: 'Original facts' };
  const result = normalize(merge(original, [['name', ' Lake House '], ['ownerHighlights', 'Private sauna'], ['tl_request', '2026-10-02']], 'lake-house'));
  assert.deepEqual(result.files, original.files);
  assert.deepEqual(result.customMetadata, original.customMetadata);
  assert.equal(result.createdAt, original.createdAt);
  assert.equal(result.listingFacts, 'Original facts');
  assert.equal(result.timeline.futureStep, 'keep');
  assert.equal(result.ownerHighlights, 'Private sauna');
  assert.equal(original.ownerHighlights, undefined);
});

test('explicit cleared fields and timeline skips are saved without discarding other data', () => {
  const result = normalize(merge({ listingFacts: 'Old text', timeline: { request: '2026-10-01', demo: '2026-10-02', future: 'keep' } }, [['listingFacts', ''], ['sk_request', '1'], ['tl_request', '2026-10-03'], ['tl_demo', '']], 'house'));
  assert.equal(result.listingFacts, '');
  assert.equal(result.timeline.request, 'skip');
  assert.equal(result.timeline.demo, undefined);
  assert.equal(result.timeline.future, 'keep');
});

test('existing custom choice values remain selected instead of silently clearing on save', () => {
  const render = vm.runInContext('field', context);
  const output = render(['focus', 'Website focus', 'choice'], { focus: 'Multigenerational families' });
  assert.ok(output.includes('<option selected>Multigenerational families</option>'));
});

test('the complete pasted amenities text survives a save and the core fields are first', () => {
  const source = 'Outdoor\n  Private sauna\nNot included\nWasher unavailable\nDryer unavailable\n';
  assert.equal(merge({}, [['amenitiesGroups', source]], 'house').amenitiesGroups, source);
  const first = normalize(vm.runInContext('SECTIONS[0][1].map(row => row[0])', context));
  assert.deepEqual(first, ['name', 'listingUrl', 'ownerHighlights', 'amenitiesGroups']);
});

test('saving an older record does not invent its creation date', () => {
  const result = merge({ id: 'house', name: 'House' }, [['name', 'House']], 'house');
  assert.equal(result.createdAt, undefined);
  assert.ok(result.updatedAt);
});
test('proposal groups expose saved status controls and retain delivery evidence safely', () => {
 context.ClientModel=require('../site/app/client-model.js');
 vm.runInContext('records=[{id:"house",name:"House <A>"}]',context);
 const render=vm.runInContext('proposalList',context);
 const html=render({name:'Owner',proposals:[{token:'draft',date:'2026-11-04',properties:['house']},{token:'sent',date:'2026-11-03',properties:['house'],sent:'2026-11-03'},{token:'accepted',date:'2026-11-02',properties:['house'],status:'active'}]});
 for(const heading of ['Active (1)','Proposed (1)','Drafts (1)'])assert.ok(html.includes(heading));
 assert.ok(html.includes('name="proposal_status_accepted"'));
 assert.ok(html.includes('<option value="active" selected>Active</option>'));
 assert.ok(html.includes('Sent 2026-11-03'));assert.ok(html.includes('House &lt;A&gt;'));
 assert.ok(html.includes('Save proposal statuses'));
 const empty=render({name:'Owner',proposals:[]});
 assert.ok(empty.includes('Active (0)'));assert.ok(empty.includes('Proposed (0)'));
});
