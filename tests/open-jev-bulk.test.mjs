import {test} from 'node:test';
import assert from 'node:assert/strict';
import {evaluator,DIMENSIONS} from '../scripts/open-jev-lib.mjs';
import {normalize} from '../scripts/open-jev-normalize.mjs';
import {MAX_BATCHES,summarize} from '../scripts/open-jev-bulk-status.mjs';
const pin=(id)=>({id,status:'verified',commit:'b'.repeat(40),
  url:'https://github.com/acme/skills/blob/'+('b'.repeat(40))+'/'+id+'/SKILL.md'});
const fake=(ids)=>({catalog:{catalog_id:'nosey-built-in'},
  entries:new Map(ids.map(id=>[id,pin(id)]))});
const meta=(id)=>({id,source:{repository:'acme/skills',path:id+'/SKILL.md',
  commit:'b'.repeat(40)},input_sha256:'c'.repeat(64),fingerprint:evaluator().fingerprint});
const raw=()=>({workflow:null,decisions:Object.fromEntries(DIMENSIONS.map(d=>[d,{
  type:'score',mode:'model',answer:3,confidence:0.9,
  distribution:{0:0.02,1:0.04,2:0.08,3:0.8,4:0.06}}]))});
const doc=(rows)=>({schema_version:1,catalog_id:'nosey-built-in',
  generated_at:'2026-11-02T00:00:00Z',evaluator:evaluator(),entries:rows});
test('bulk evaluator continues from a pin-current partial report',()=>{
 const a=normalize(meta('one'),raw()),p=summarize({
  source:fake(['one','two']),results:doc([a]),accepted:1,prior:{completed_batches:3},runId:'run42'});
 assert.equal(p.progress.current_evaluations,1);
 assert.equal(p.progress.remaining,1);
 assert.equal(p.progress.completed_batches,4);
 assert.equal(p.should_dispatch,true);
 assert.equal(p.should_open_pr,false);
});
test('bulk evaluator finishes when all pins are current',()=>{
 const rows=['one','two'].map(id=>normalize(meta(id),raw()));
 const x=summarize({source:fake(['one','two']),results:doc(rows),accepted:2});
 assert.equal(x.progress.status,'completed');
 assert.equal(x.should_open_pr,true);
});
test('bulk evaluator stops on zero progress and on bounded batch cap',()=>{
 const data=doc([normalize(meta('one'),raw())]),source=fake(['one','two']);
 const stopped=summarize({source,results:data,accepted:0});
 assert.equal(stopped.progress.status,'no_accepted_results');
 assert.equal(stopped.should_dispatch,false);
 const budget=summarize({source,results:data,accepted:1,
   prior:{completed_batches:MAX_BATCHES-1}});
 assert.equal(budget.progress.status,'batch_budget_exhausted');
 assert.equal(budget.should_dispatch,false);
 assert.throws(()=>summarize({source,results:data,accepted:1,
   prior:{completed_batches:MAX_BATCHES}}),/budget exhausted/);
});
test('bulk status refuses unvalidated score report',()=>{
 assert.throws(()=>summarize({source:fake(['one']),results:doc([{id:'one'}]),accepted:1}),/Invalid evaluated entry/);
 assert.throws(()=>summarize({source:fake(['one']),results:doc([]),accepted:-1}),/Invalid accepted/);
});
