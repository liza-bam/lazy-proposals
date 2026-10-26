'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const M=require('../site/app/client-model.js');
const root=path.join(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const clients=fs.readdirSync(path.join(root,'data/clients')).filter(n=>n.endsWith('.json')).map(n=>read('data/clients/'+n));
const properties=fs.readdirSync(path.join(root,'data/websites')).filter(n=>n.endsWith('.json')).map(n=>read('data/websites/'+n));
const S=read('data/settings.json');
test('every existing property belongs to exactly one client and retains its photo collection',()=>{
 for(const p of properties){assert(p.clientId);assert.equal(clients.filter(c=>M.propertiesForClient(c,properties).some(x=>x.id===p.id)).length,1);assert.equal(M.clientForProperty(p,clients).id,p.clientId);if(p.photoRepository)assert(p.photoRepository.url);if(p.files)assert(Array.isArray(p.files));}
});
test('Carson has one proposal covering two websites, with the configured additional-property price',()=>{
 const c=clients.find(c=>c.id==='carson'),f=M.proposalFields(c,properties,S);assert.equal(f.properties.length,2);assert.deepEqual(new Set(f.propertyIds),new Set(['saddleback-lodge','saddleback-ski-lodge-lazy-vacations']));assert.equal(f.support.price,'$75 per month');assert.match(f.subject,/websites/);assert.equal(f.clientId,'carson');
});
test('a proposal can select one property but cannot include another client’s property',()=>{
 const c=clients.find(c=>c.id==='carson');assert.equal(M.proposalFields(c,properties,S,['saddleback-lodge']).support.price,'$50 per month');assert.throws(()=>M.proposalFields(c,properties,S,['augusta-lake']),/another client/);assert.throws(()=>M.proposalFields(c,properties,S,[]),/at least one/);
});
test('client edits preserve properties, attachments, proposal history and unknown timeline values',()=>{
 const c={id:'client',name:'Before',properties:[{id:'house'}],proposals:[{token:'prior'}],files:[{name:'source'}],custom:{keep:1},timeline:{built:'2026-10-01',future:'keep',doneEmail:'2026-10-02'}};
 const result=M.mergeClientRecord(c,[['name',' After '],['email',' a@example.com '],['sk_doneEmail','1']],'client');assert.equal(result.name,'After');assert.equal(result.email,'a@example.com');for(const k of ['properties','proposals','files','custom'])assert.deepEqual(result[k],c[k]);assert.equal(result.timeline.future,'keep');assert.equal(result.timeline.built,'2026-10-01');assert.equal(result.timeline.doneEmail,'skip');assert.equal(c.name,'Before');
});
test('explicit property ownership takes priority over a stale client summary',()=>{
 const p={id:'house',name:'House',clientId:'new'};assert.equal(M.propertiesForClient({id:'old',properties:[{id:'house'}]},[p]).length,0);assert.equal(M.propertiesForClient({id:'new'},[p]).length,1);
});
test('legacy property links resolve to the same grouped proposal as the client CLI',()=>{
 const {fields,email}=require('./make-proposal.js'),a=fields('carson'),b=fields('saddleback-lodge');assert.deepEqual(a.propertyIds,b.propertyIds);const html=email(a,S);for(const p of a.properties)assert(html.includes(p.siteUrl));assert(!html.includes('Becky'));
});
test('an other client keeps its loose fields and is told apart from Lazy clients',()=>{
 const r=M.mergeClientRecord({name:'',kind:'other'},[['kind','other'],['name',' Oliver '],['business','HTMKR'],['platform','Shopify'],['status',''],['driveUrl','https://drive.google.com/x'],['siteUrl','']],'oliver');
 assert.equal(r.name,'Oliver');assert.equal(r.business,'HTMKR');assert.equal(r.platform,'Shopify');assert.equal(r.driveUrl,'https://drive.google.com/x');assert(M.isOther(r));assert(!M.isOther(clients.find(c=>c.id==='carson')));assert(M.isOther(clients.find(c=>c.id==='oliver')));
});
test('the website ready email carries the offer line only when the PDF goes with it',()=>{
 const t=require('fs').readFileSync(require('path').join(__dirname,'../data/templates/done-email.html'),'utf8'),c=clients.find(c=>c.id==='carson'),f=M.proposalFields(c,properties,S);
 const on=M.websiteReadyEmail(t,f,S,true),off=M.websiteReadyEmail(t,f,S,false);
 assert.ok(on.includes(S.proposal.attachNote.replace(/'/g,'&#39;').slice(0,20)));assert.ok(!off.includes('{{'));assert.ok(!on.includes('{{'));assert.ok(!off.includes(S.proposal.attachNote.replace(/'/g,'&#39;').slice(0,20)));
 for(const p of f.properties)assert.ok(on.includes(p.siteUrl));
});
