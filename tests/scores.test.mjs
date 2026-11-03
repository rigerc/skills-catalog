import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,cpSync,rmSync,symlinkSync,statSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync,spawnSync} from 'node:child_process';
import {DIMENSIONS,evaluator,buildReport,checkReport,checkEntry,importLegacy,mergeCheckpoint,parseSource,current} from '../scripts/open-jev-lib.mjs';
import {normalize} from '../scripts/open-jev-normalize.mjs';
import {merge} from '../scripts/open-jev-merge.mjs';
const NOW='2026-11-02T00:00:00Z',SHA='a'.repeat(40);
const pin=(name,repository='acme/skills')=>({id:repository+'/'+name,status:'verified',commit:SHA,
 url:'https://github.com/'+repository+'/blob/'+SHA+'/skills/'+name+'/SKILL.md'});
const source=(pins=[pin('one'),pin('two')])=>({catalog:{catalog_id:'test',skills:pins.map(p=>({id:p.id,repository:p.id.split('/').slice(0,2).join('/')}))},entries:new Map(pins.map(p=>[p.id,p]))});
const raw=score=>({workflow:null,decisions:Object.fromEntries(DIMENSIONS.map(k=>[k,{type:'score',mode:'model',answer:score,confidence:0.7,
 distribution:{0:0.2,1:0.2,2:0.2,3:0.2,4:0.2}}]))});
const entry=(p=pin('one'),score=3)=>normalize({id:p.id,source:{repository:parseSource(p).repository,path:parseSource(p).path,commit:p.commit},
 input_sha256:'b'.repeat(64),fingerprint:evaluator().fingerprint},raw(score),NOW);
const legacy=rows=>{
 const {state_limit_code_units,questions,scope,...config}=evaluator();
 return {schema_version:1,catalog_id:'test',generated_at:NOW,evaluator:config,entries:rows.map(e=>({id:e.id,status:e.status,
 source:((p)=>({repository:p.repository,path:p.path,commit:p.commit}))(parseSource({status:'verified',...e.source})),
 input_sha256:e.input_sha256,fingerprint:e.fingerprint,evaluated_at:e.evaluated_at,scores:e.evaluation.scores,overall_score:e.overall_score}))};
};
const doc=(rows=[entry()],src=source())=>buildReport(rows,src,{now:NOW});
let validate;
try{
 const {default:Ajv}=await import('ajv/dist/2020.js');
 validate=new Ajv({strict:true,allErrors:true,strictRequired:false}).compile(JSON.parse(readFileSync('schemas/scores.schema.json')));
}catch(error){if(error.code!=='ERR_MODULE_NOT_FOUND')throw error;}

test('canonical v3 schema accepts Open JEV and rejects legacy providers and fabricated payloads',{skip:!validate},()=>{
 assert.equal(validate(doc()),true,JSON.stringify(validate.errors));
 assert.equal(validate(doc([])),true);
 for(const mutate of [d=>{d.schema_version=2;},d=>{d.evaluator.provider='jev';},d=>{delete d.entries[0].result_kind;},
  d=>{d.entries[0].evaluation.summary='Invented';},d=>{d.entries[0].evaluation.scores.safety.score=2.5;},
  d=>{d.entries[0].evaluation.scores.safety.mode='fallback';},d=>{delete d.entries[0].source;},
  d=>{d.entries[0].evaluation.scores.safety.confidence=2;},d=>{delete d.entries[0].evaluation.scores.safety;}]){
  const d=doc();mutate(d);assert.equal(validate(d),false,mutate.toString());
 }
 assert.equal(validate(JSON.parse(readFileSync('data/scores.json'))),true,JSON.stringify(validate.errors));
});

test('standalone import replaces scores without changing inference identity or values',()=>{
 const row=entry(),migrated=importLegacy(legacy([row]),source());
 assert.equal(migrated.schema_version,3);assert.deepEqual(migrated.entries,[row]);
 assert.deepEqual(migrated.summary,{total:2,evaluated:1,not_evaluated:0,stale:0,pending:1,unresolved:0});
 assert.equal(migrated.generated_at,NOW);
 assert.equal(migrated.evaluator.fingerprint,'947999d07f3b653df55434a69d2be731eac1d5e79fcec332b8988b1767a26b17');
 checkReport(migrated,source());
 for(const mutate of [d=>{d.schema_version=2;},d=>{d.evaluator.provider='jev';},d=>{d.catalog_id='other';},
  d=>{d.evaluator.questions_sha256='c'.repeat(64);},d=>{d.entries.push(d.entries[0]);}]){
  const d=legacy([row]);mutate(d);assert.throws(()=>importLegacy(d,source()));
 }
});

test('freshness uses exact pinned source and evaluator while catalog and source repositories may differ',()=>{
 const row=entry(),p=pin('one'),parsed=parseSource(p),fp=evaluator().fingerprint;
 assert.equal(current(row,parsed,fp),true);
 assert.equal(current(row,{...parsed,repository:'ACME/SKILLS'},fp),true);
 for(const delta of [{path:'elsewhere/SKILL.md'},{commit:'c'.repeat(40)},{repository:'other/repo'}])assert.equal(current(row,{...parsed,...delta},fp),false);
 assert.equal(current(row,parsed,'c'.repeat(64)),false);
 const alias={...row,source:{...row.source,url:row.source.url.replace('acme/skills','upstream/skills')}};
 assert.doesNotThrow(()=>checkEntry(alias),'catalog IDs need not equal source fork coordinates');
});

test('coverage and means exclude stale, unresolved and retired skills with nulls for empty repositories',()=>{
 const pins=[pin('one'),pin('two'),pin('pending'),{...pin('unresolved'),status:'unresolved'},pin('empty','other/skills')];
 const src=source(pins),rows=[entry(),entry(pin('two'),1),entry(pin('unresolved')),entry(pin('retired'))];
 rows[1].fingerprint='c'.repeat(64);
 const d=doc(rows,src);checkReport(d,src);
 assert.equal(d.entries.length,3);
 assert.deepEqual(d.summary,{total:5,evaluated:1,not_evaluated:0,stale:1,pending:2,unresolved:1});
 assert.equal(d.repositories[0].overall_score,4);assert.deepEqual(d.repositories[0].scored_skill_ids,['acme/skills/one']);
 assert.equal(d.repositories[1].overall_score,null);assert.equal(d.repositories[1].criterion_scores,null);
 const both=doc([entry(),entry(pin('two'),1)]);assert.equal(both.repositories[0].overall_score,3);
 assert.deepEqual(both.repositories[0].criterion_scores,Object.fromEntries(DIMENSIONS.map(k=>[k,3])));
});

test('checks reject malformed metadata, ordering, means and current-catalog drift',()=>{
 for(const mutate of [d=>{d.evaluator.questions.safety.instructions='changed';},d=>{d.evaluator.ranking_calibrated=true;},
  d=>{d.summary.pending++;},d=>{d.repositories[0].overall_score=2;},d=>{d.repositories[0].scored_skill_ids=['acme/skills/two'];},
  d=>{d.repositories=[];},d=>{d.entries.push(d.entries[0]);},d=>{d.entries[0].evaluated_at='2026-02-30T00:00:00Z';},
  d=>{d.entries[0].evaluation.scores.extra=d.entries[0].evaluation.scores.safety;},
  d=>{d.entries[0].source.url=d.entries[0].source.url.replace(SHA,'main');},d=>{d.entries[0].overall_score=2;}]){
  const d=doc();mutate(d);assert.throws(()=>checkReport(d,source()),mutate.toString());
 }
 const d=doc(),updated=source([{...pin('one'),commit:'c'.repeat(40),url:pin('one').url.replace(SHA,'c'.repeat(40))},pin('two')]);
 checkReport(d);assert.throws(()=>checkReport(d,updated),/stale/);
});

test('merge accepts current successes only and preserves no-op timestamps',()=>{
 const before=doc();
 assert.deepEqual(merge([entry()],before,source()).next,before);
 assert.equal(merge([entry()],before,source()).accepted,0);
 const stale={...entry(),fingerprint:'c'.repeat(64)};
 assert.equal(merge([stale],before,source()).accepted,0);
 const next=merge([entry(pin('two'))],before,source()).next;
 assert.equal(next.summary.evaluated,2);checkReport(next,source());
});

test('checkpoint migration retains current base scores, merges missing evidence and rejects old-provider checkpoints',()=>{
 const newer={...entry(),evaluated_at:'2026-11-03T00:00:00Z'};
 const base=doc([newer]),input=legacy([entry(),entry(pin('two'))]);
 const next=mergeCheckpoint(base,input,source());
 assert.equal(next.summary.evaluated,2);assert.equal(next.entries[0].evaluated_at,newer.evaluated_at);
 const stale=doc([{...entry(),source:{...entry().source,url:entry().source.url.replace(SHA,'c'.repeat(40)),commit:'c'.repeat(40)},evaluated_at:'2026-11-04T00:00:00Z'}]);
 assert.deepEqual(mergeCheckpoint(base,stale,source()).entries,base.entries);
 assert.throws(()=>mergeCheckpoint(base,{schema_version:2,entries:[]},source()));
 assert.deepEqual(mergeCheckpoint(next,next,source()),next);
});

test('canonical maintenance stays offline, imports explicitly, detects drift and blocks legacy overwrites',()=>{
 const dir=mkdtempSync(join(tmpdir(),'canonical-scores-'));
 try{
  for(const name of ['scripts','config'])cpSync(resolve(name),join(dir,name),{recursive:true});
  mkdirSync(join(dir,'data'));mkdirSync(join(dir,'results'));
  const src=source(),write=(path,value)=>writeFileSync(join(dir,path),JSON.stringify(value));
  write('data/catalog.json',src.catalog);write('data/catalog-source-ledger.json',{entries:[...src.entries.values()]});
  write('results/open-jev-v1.json',legacy([entry()]));
  write('data/scores.json',{schema_version:2,evaluator:{provider:'jev'},entries:[]});
  const cli=(script,...args)=>execFileSync(process.execPath,[join(dir,'scripts',script),...args],{encoding:'utf8',stdio:['ignore','pipe','pipe'],env:{...process.env,OPENAI_API_KEY:'',OPENCODE_API_KEY:''}});
  assert.throws(()=>cli('open-jev-scores.mjs','--sync'));
  cli('open-jev-scores.mjs','--import',join(dir,'results/open-jev-v1.json'));
  const output=join(dir,'data/scores.json'),before=readFileSync(output,'utf8'),modified=statSync(output).mtimeMs;
  assert.match(cli('open-jev-scores.mjs','--sync'),/No changes/);assert.equal(statSync(output).mtimeMs,modified);
  cli('open-jev-scores.mjs','--check');cli('open-jev-check.mjs');
  for(const args of [[],['--sync'],['--force'],['--dry-run'],['--check']]){
   assert.throws(()=>cli('evaluate-skills.mjs',...args,'--output',output));
  }
  const alias=join(dir,'results/canonical-alias.json');symlinkSync(output,alias);
  assert.throws(()=>cli('evaluate-skills.mjs','--sync','--output',alias));
  assert.equal(readFileSync(output,'utf8'),before);
  assert.throws(()=>cli('evaluate-skills.mjs','--sync'));
  write('data/catalog.json',{...src.catalog,skills:[src.catalog.skills[0]]});
  write('data/catalog-source-ledger.json',{entries:[pin('one')]});
  assert.throws(()=>cli('open-jev-scores.mjs','--check'),/Command failed/);
  cli('open-jev-scores.mjs','--sync');cli('open-jev-scores.mjs','--check');
  assert.equal(JSON.parse(readFileSync(output)).summary.total,1);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
