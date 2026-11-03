import {test} from 'node:test';
import assert from 'node:assert/strict';
import {evaluator,outputKey,DIMENSIONS} from '../scripts/open-jev-lib.mjs';
import {plan} from '../scripts/open-jev-plan.mjs';
import {normalize} from '../scripts/open-jev-normalize.mjs';
import {merge} from '../scripts/open-jev-merge.mjs';
const sha=n=>n.repeat(64);
const meta={id:'example/skills/foo',source:{repository:'example/skills',path:'foo/SKILL.md',
 commit:'a'.repeat(40)},input_sha256:sha('b'),fingerprint:evaluator().fingerprint};
const raw=()=>({workflow:null,decisions:Object.fromEntries(DIMENSIONS.map(k=>[k,{
 type:'score',mode:'model',answer:'2',confidence:0.7,
 distribution:{0:0.1,1:0.2,2:0.4,3:0.2,4:0.1}}]))});
test('Open JEV rubric and fingerprint are deterministic',()=>{
 const a=evaluator(),b=evaluator();
 assert.equal(a.fingerprint,b.fingerprint);
 assert.equal(a.ranking_calibrated,false);
 assert.equal(DIMENSIONS.length,5);
 assert.equal(outputKey('a'),outputKey('a'));
});
test('Open JEV normalizes all five dimensions from 0–4 to 1–5',()=>{
 const row=normalize(meta,raw());
 assert.equal(row.overall_score,3);
 assert.equal(row.status,'evaluated');
 assert.equal(row.evaluation.scores.safety.score,3);
});
test('Open JEV refuses malformed, absent or non-model answers',()=>{
 const missing=raw();delete missing.decisions.safety;
 assert.throws(()=>normalize(meta,missing),/action response/);
 const wrong=raw();wrong.decisions.safety.mode='ensemble';
 assert.throws(()=>normalize(meta,wrong),/Invalid typed answer/);
 const inconsistent=raw();inconsistent.decisions.safety.distribution['0']=0.9;
 assert.throws(()=>normalize(meta,inconsistent),/Invalid probabilities/);
 assert.throws(()=>normalize({...meta,fingerprint:sha('f')},raw()),/Invalid evaluation metadata/);
});
test('Incremental planning can inspect the canonical index without HTTP or model invocation',()=>{
 assert.equal(plan({limit:0}).count,0);
 assert.throws(()=>plan({limit:65}),/Limit must be/);
});
test('Only current, verified pins enter merged report',()=>{
 const catalog={catalog_id:'nosey-built-in',skills:[{id:meta.id}]},valid=normalize(meta,raw());
 const source={catalog,entries:new Map([[meta.id,{id:meta.id,status:'verified',
  commit:meta.source.commit,url:'https://github.com/example/skills/blob/'+meta.source.commit+'/foo/SKILL.md'}]])};
 const result=merge([valid],null,source);
 assert.equal(result.accepted,1);
 assert.equal(result.next.entries.length,1);
 assert.equal(result.next.evaluator.ranking_calibrated,false);
 const bad=merge([{...valid,source:{...valid.source,url:valid.source.url.replace(meta.source.commit,'f'.repeat(40)),commit:'f'.repeat(40)}}],null,source);
 assert.equal(bad.accepted,0);
});
