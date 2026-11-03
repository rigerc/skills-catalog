import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,cpSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createContext,runInContext} from 'node:vm';
import {compile} from '../scripts/compile-catalog.mjs';
import {buildReport,sources} from '../scripts/open-jev-lib.mjs';
const read=name=>JSON.parse(readFileSync('data/'+name+'.json'));
const catalog=read('catalog'),mappings=read('mappings'),ledger=read('catalog-source-ledger'),scores=read('scores');
function site(report=scores,sourceLedger=ledger){
 const nodes=new Map();
 const document={querySelector:key=>{
  if(!nodes.has(key))nodes.set(key,{innerHTML:'',textContent:'',hidden:false,closest:()=>({hidden:false})});
  return nodes.get(key);
 },querySelectorAll:()=>[]};
 const script=readFileSync('site/index.html','utf8').split('<script>')[1].split("document.addEventListener('click'")[0];
 const context=createContext({document,URLSearchParams,location:{search:'',pathname:'/'},fixture:[catalog,mappings,sourceLedger,null,report]});
 runInContext(script,context);runInContext('prep(...fixture)',context);
 return {context,nodes,run:code=>runInContext(code,context)};
}
test('main site displays Open JEV confidence and scope and uses scores for filters and sorting',()=>{
 const ui=site();
 assert.equal(ui.run('nScored'),scores.summary.evaluated);
 assert.match(ui.nodes.get('#ssum').textContent,/Open JEV \(model-v1\).*4,000 UTF-16/);
 assert.match(ui.run('scoreHtml(skills.find(s=>s.sc))'),/Model confidence/);
 assert.match(ui.run('scoreHtml(skills.find(s=>s.sc))'),/Reviewed \d{4}-\d{2}-\d{2} by Open JEV model-v1/);
 assert.doesNotMatch(ui.run('scoreHtml(skills.find(s=>s.sc))'),/undefined|NaN/);
 ui.run("S.min='4'");assert.equal(ui.run('skills.filter(match).every(s=>s.sc.o>=4)'),true);
 ui.run("S.sort='score'");assert.equal(ui.run('skills.slice().sort(sorter())[0].sc.o'),Math.max(...scores.entries.map(e=>e.overall_score)));
 assert.equal(ui.run('REPOS.filter(r=>r.rx?.overall_score!=null).length'),scores.repositories.filter(r=>r.overall_score!=null).length);
});
test('site excludes stale scores from current counts, filters and ordering and handles empty/legacy reports',()=>{
 const changed=structuredClone(ledger),id=scores.entries[0].id;
 changed.entries.find(e=>e.id===id).url=changed.entries.find(e=>e.id===id).url.replace('/SKILL.md','/moved/SKILL.md');
 const ui=site(scores,changed);assert.equal(ui.run('nScored'),scores.summary.evaluated-1);
 assert.match(ui.run('scoreHtml(skills.find(s=>s.sc?.stale))'),/Stale: the source or evaluator changed/);
 ui.run("S.min='1'");assert.equal(ui.run('skills.filter(match).some(s=>s.sc.stale)'),false);
 ui.run("S.sort='score'");assert.equal(ui.run('skills.slice().sort(sorter())[0].sc.stale'),false);
 for(const data of [null,{schema_version:2,evaluator:{provider:'jev'},entries:[]},buildReport([],sources())]){
  const empty=site(data);assert.equal(empty.run('nScored'),0);assert.match(empty.run('scoreHtml(skills[0])'),/Not scored yet/);
 }
});
test('manifest main evaluation and compatibility alias use the same canonical result deterministically',()=>{
 const options={revision:'a'.repeat(40),asOf:'2026-11-03'},manifest=compile(options);
 assert.deepEqual(compile(options),manifest);assert.deepEqual(manifest.manifest_version,{major:1,minor:1});
 assert.equal(manifest.skills.filter(s=>s.evaluation.status==='current').length,scores.summary.evaluated);
 for(const e of scores.entries){
  const skill=manifest.skills.find(s=>s.id===e.id);
  assert.equal(skill.evaluation.overall_score,e.overall_score);
  assert.equal(skill.evaluation.result_kind,'open_jev_scores');
  assert.equal(skill.open_jev.overall_score,skill.evaluation.overall_score);
  assert.equal(skill.open_jev.evaluator_fingerprint,skill.evaluation.evaluator_fingerprint);
 }
});
test('resume imports old branch evidence without replacing current scripts, catalog or batch accounting',()=>{
 const dir=mkdtempSync(join(tmpdir(),'open-jev-resume-'));
 try{
  for(const name of ['scripts','config','data'])cpSync(resolve(name),join(dir,name),{recursive:true});
  mkdirSync(join(dir,'.github'),{recursive:true});
  const git=(...argv)=>execFileSync('git',argv,{cwd:dir,encoding:'utf8',stdio:['ignore','pipe','pipe']});
  git('init','-b','main');git('config','user.email','test@example.com');git('config','user.name','Test');
  const catalogBefore=readFileSync(join(dir,'data/catalog.json'),'utf8');
  const config={...scores.evaluator};for(const key of ['state_limit_code_units','questions','scope'])delete config[key];
  const rows=scores.entries.map(e=>{const parts=new URL(e.source.url).pathname.split('/');return {id:e.id,status:e.status,
   source:{repository:parts.slice(1,3).join('/'),commit:e.source.commit,path:parts.slice(5).join('/')},
   input_sha256:e.input_sha256,fingerprint:e.fingerprint,evaluated_at:e.evaluated_at,scores:e.evaluation.scores,overall_score:e.overall_score};});
  writeFileSync(join(dir,'data/open-jev-scores.json'),JSON.stringify({schema_version:1,catalog_id:scores.catalog_id,
   generated_at:scores.generated_at,evaluator:config,entries:rows}));
  writeFileSync(join(dir,'data/scores.json'),JSON.stringify({schema_version:2,evaluator:{provider:'jev'},entries:[]}));
  const progress={schema_version:1,completed_batches:3};
  writeFileSync(join(dir,'.github/open-jev-bulk-progress.json'),JSON.stringify(progress));
  git('add','.');git('commit','-m','legacy progress');const old=git('rev-parse','HEAD').trim();
  git('update-ref','refs/remotes/origin/automation/open-jev-full-evaluation',old);
  writeFileSync(join(dir,'data/scores.json'),JSON.stringify(buildReport([],sources())));
  writeFileSync(join(dir,'scripts/current-base.txt'),'current scripts');
  execFileSync(process.execPath,[join(dir,'scripts/open-jev-resume.mjs'),'--ref','refs/remotes/origin/automation/open-jev-full-evaluation'],{cwd:dir,stdio:'pipe'});
  assert.equal(JSON.parse(readFileSync(join(dir,'data/scores.json'))).summary.evaluated,scores.summary.evaluated);
  assert.deepEqual(JSON.parse(readFileSync(join(dir,'.github/open-jev-bulk-progress.json'))),progress);
  assert.equal(readFileSync(join(dir,'data/catalog.json'),'utf8'),catalogBefore);
  assert.equal(readFileSync(join(dir,'scripts/current-base.txt'),'utf8'),'current scripts');
  const canonical=readFileSync(join(dir,'data/scores.json'),'utf8');
  // A fully populated report can exceed child_process's default 1 MiB capture limit.
  writeFileSync(join(dir,'data/scores.json'),canonical+' '.repeat(1024*1024));
  git('add','.');git('commit','-m','canonical progress');
  git('update-ref','refs/remotes/origin/automation/open-jev-full-evaluation',git('rev-parse','HEAD').trim());
  execFileSync(process.execPath,[join(dir,'scripts/open-jev-resume.mjs'),'--ref','refs/remotes/origin/automation/open-jev-full-evaluation'],{cwd:dir,stdio:'pipe'});
  assert.equal(readFileSync(join(dir,'data/scores.json'),'utf8'),canonical);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
