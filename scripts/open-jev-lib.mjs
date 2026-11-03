import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync,mkdirSync,renameSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
export const ROOT=fileURLToPath(new URL('..',import.meta.url));
export const SCORES_PATH='data/scores.json';
export const SHA40=/^[a-f0-9]{40}$/;
export const SHA64=/^[a-f0-9]{64}$/;
export const ACTION='intikhab49/open-jev-typed-decision-engine@4c3c85ee6238f24a464c9285d1786aabc51a753b';
export const MODEL_RELEASE='model-v1',STATE_LIMIT=4000,STATE_VERSION=1;
export const DIMENSIONS=['trigger_clarity','instruction_quality','correctness','safety','context_efficiency'];
export const LIMITATION='Open JEV reviews at most the first 4,000 UTF-16 code units of SKILL.md; supporting files and runtime behavior are not assessed. Scores have no written reasons or recommendations.';
// Keep the original inference identity: moving the report must not invalidate cached answers.
const TRANSFORM='index+1,mean,informational';
export const hash=data=>createHash('sha256').update(data).digest('hex');
export const read=(p,otherwise=null)=>existsSync(resolve(ROOT,p))?JSON.parse(readFileSync(resolve(ROOT,p),'utf8')):otherwise;
export function writeAtomic(p,value){
 const path=resolve(ROOT,p),text=JSON.stringify(value,null,2)+'\n';
 if(existsSync(path)&&readFileSync(path,'utf8')===text)return false;
 mkdirSync(dirname(path),{recursive:true});const tmp=path+'.'+process.pid+'.tmp';
 writeFileSync(tmp,text);renameSync(tmp,path);return true;
}
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&
 Object.keys(value).length===keys.length&&keys.every(k=>Object.hasOwn(value,k));
const timestamp=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)&&
 Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value.replace(/Z$/,value.includes('.')?'Z':'.000Z');
export const rubric=()=>read('config/open-jev-questions.json');
const fingerprint=(config)=>hash(JSON.stringify({action:config.action_ref,model:config.model_release,questions:config.questions,
 stateLimit:config.state_limit_code_units,stateVersion:config.state_format_version,transform:TRANSFORM}));
function checkEvaluator(config){
 if(!exact(config,['provider','action_ref','model_release','state_format_version','questions_sha256','fingerprint',
   'ranking_calibrated','state_limit_code_units','questions','scope'])||config.provider!=='open-jev-action'||
   !/^[\w.-]+\/[\w.-]+@[a-f0-9]{40}$/.test(config.action_ref)||typeof config.model_release!=='string'||!config.model_release||
   !Number.isInteger(config.state_format_version)||config.state_format_version<1||
   config.state_limit_code_units!==STATE_LIMIT||config.scope!==LIMITATION||config.ranking_calibrated!==false||
   !exact(config.questions,DIMENSIONS)||DIMENSIONS.some(d=>!exact(config.questions[d],['type','criteria','instructions'])||
     config.questions[d].type!=='score'||typeof config.questions[d].instructions!=='string'||
     !Array.isArray(config.questions[d].criteria)||config.questions[d].criteria.length!==5||
     config.questions[d].criteria.some(c=>typeof c!=='string'||!c)))throw Error('Malformed Open JEV evaluator');
 if(config.questions_sha256!==hash(JSON.stringify(config.questions))||config.fingerprint!==fingerprint(config))
   throw Error('Open JEV evaluator fingerprint does not match its configuration');
}
export function evaluator(){
 const questions=rubric();
 const config={provider:'open-jev-action',action_ref:ACTION,model_release:MODEL_RELEASE,
   state_format_version:STATE_VERSION,questions_sha256:hash(JSON.stringify(questions)),
   fingerprint:'',ranking_calibrated:false,state_limit_code_units:STATE_LIMIT,questions,scope:LIMITATION};
 config.fingerprint=fingerprint(config);checkEvaluator(config);return config;
}
export function sources(){
 const catalog=read('data/catalog.json'),ledger=read('data/catalog-source-ledger.json');
 if(!catalog?.catalog_id||!Array.isArray(catalog.skills)||!Array.isArray(ledger?.entries))
   throw Error('Missing canonical catalog or ledger');
 const skills=new Map(catalog.skills.map(s=>[s.id,s])),entries=new Map(ledger.entries.map(e=>[e.id,e]));
 if(skills.size!==catalog.skills.length||entries.size!==skills.size||[...entries].some(([id])=>!skills.has(id)))
   throw Error('Catalog/ledger IDs do not agree');
 return {catalog,ledger,skills,entries};
}
export function parseSource(e){
 if(e?.status!=='verified'||!SHA40.test(e.commit||''))throw Error('Source is not pinned: '+e?.id);
 const url=new URL(e.url);
 if(url.origin!=='https://github.com'||url.search||url.hash||url.username||url.password||
   /%|\\/.test(e.url)||/\/\.{1,2}(?:\/|$)/.test(url.pathname))throw Error('Unsafe pinned source URL');
 const parts=url.pathname.split('/').filter(Boolean);
 if(parts.length<5||parts[2]!=='blob'||parts[3]!==e.commit||parts.at(-1)!=='SKILL.md'||
   !parts.every(p=>/^[A-Za-z0-9._@+()-]+$/.test(p)))throw Error('Invalid pinned SKILL.md source');
 const [owner,repo]=parts,path=parts.slice(4).join('/');
 return {repository:owner+'/'+repo,path,commit:e.commit,
   rawUrl:'https://raw.githubusercontent.com/'+owner+'/'+repo+'/'+e.commit+'/'+path};
}
const sourceUrl=source=>'https://github.com/'+source.repository+'/blob/'+source.commit+'/'+source.path;
export const outputKey=id=>hash(id).slice(0,20);
export const report=()=>read(SCORES_PATH);
export function current(entry,source,fp){
 if(entry?.status!=='evaluated'||entry.fingerprint!==fp)return false;
 try{
  const saved=parseSource({id:entry.id,status:'verified',...entry.source});
  return saved.repository.toLowerCase()===source.repository.toLowerCase()&&saved.path===source.path&&saved.commit===source.commit;
 }catch{return false;}
}
export function checkEntry(e){
 if(!exact(e,['id','status','source','input_sha256','fingerprint','evaluated_at','result_kind','evaluation','overall_score'])||
   typeof e.id!=='string'||e.id.split('/').length<3||e.status!=='evaluated'||
   !exact(e.source,['url','commit'])||!SHA64.test(e.fingerprint||'')||!SHA64.test(e.input_sha256||'')||
   !timestamp(e.evaluated_at)||e.result_kind!=='open_jev_scores'||!exact(e.evaluation,['scores'])||
   !exact(e.evaluation.scores,DIMENSIONS))throw Error('Invalid evaluated entry '+e?.id);
 parseSource({id:e.id,status:'verified',...e.source});
 for(const key of DIMENSIONS){
  const s=e.evaluation.scores[key];
  if(!exact(s,['score','confidence','mode'])||!Number.isInteger(s.score)||s.score<1||s.score>5||
    !Number.isFinite(s.confidence)||s.confidence<0||s.confidence>1||s.mode!=='model')
    throw Error('Invalid score dimension '+key+' for '+e.id);
 }
 const mean=DIMENSIONS.reduce((n,key)=>n+e.evaluation.scores[key].score,0)/DIMENSIONS.length;
 if(e.overall_score!==mean)throw Error('Inconsistent score mean '+e.id);
 return e;
}
export function fromLegacyEntry(e){
 if(!exact(e,['id','status','source','input_sha256','fingerprint','evaluated_at','scores','overall_score'])||
   !exact(e.source,['repository','path','commit']))throw Error('Invalid legacy Open JEV entry '+e?.id);
 return checkEntry({id:e.id,status:e.status,source:{url:sourceUrl(e.source),commit:e.source.commit},
   input_sha256:e.input_sha256,fingerprint:e.fingerprint,evaluated_at:e.evaluated_at,
   result_kind:'open_jev_scores',evaluation:{scores:e.scores},overall_score:e.overall_score});
}
const summary=()=>({total:0,evaluated:0,not_evaluated:0,stale:0,pending:0,unresolved:0});
const sorted=xs=>xs.sort((a,b)=>a.id.localeCompare(b.id,'en'));
const mean=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;
function repositoryMeans(entries){
 return {overall_score:mean(entries.map(e=>e.overall_score)),criterion_scores:entries.length?
   Object.fromEntries(DIMENSIONS.map(k=>[k,mean(entries.map(e=>e.evaluation.scores[k].score))])):null};
}
/** Derive current coverage from pins and inference identity; stale evidence remains inspectable. */
export function buildReport(rows,source,{config=evaluator(),previous=null,now=new Date().toISOString()}={}){
 checkEvaluator(config);
 const seen=new Set();
 for(const e of rows){checkEntry(e);if(seen.has(e.id))throw Error('Duplicate score ID '+e.id);seen.add(e.id);}
 const entries=sorted(rows.filter(e=>source.entries.has(e.id))),byId=new Map(entries.map(e=>[e.id,e]));
 const coverage=summary(),groups=new Map(),fp=evaluator().fingerprint;
 for(const skill of source.catalog.skills){
  const pin=source.entries.get(skill.id),entry=byId.get(skill.id),repository=skill.repository??skill.id.split('/').slice(0,2).join('/');
  if(!pin)throw Error('Missing source '+skill.id);
  const status=pin.status!=='verified'?'unresolved':!entry?'pending':
    current(entry,parseSource(pin),fp)&&entry.fingerprint===config.fingerprint?'evaluated':'stale';
  coverage.total++;coverage[status]++;
  if(!groups.has(repository))groups.set(repository,{summary:summary(),entries:[]});
  const group=groups.get(repository);group.summary.total++;group.summary[status]++;
  if(status==='evaluated')group.entries.push(entry);
 }
 const repositories=[...groups].sort(([a],[b])=>a.localeCompare(b,'en')).map(([repository,group])=>({repository,
   summary:group.summary,...repositoryMeans(sorted(group.entries)),scored_skill_ids:group.entries.map(e=>e.id)}));
 const next={schema_version:3,catalog_id:source.catalog.catalog_id,generated_at:now,evaluator:config,
   stopped:null,summary:coverage,entries,repositories};
 if(previous&&JSON.stringify({...next,generated_at:null})===JSON.stringify({...previous,generated_at:null}))
   next.generated_at=previous.generated_at;
 return next;
}
function checkSummary(value){
 if(!exact(value,Object.keys(summary()))||Object.values(value).some(n=>!Number.isInteger(n)||n<0)||
   value.not_evaluated!==0||Object.entries(value).filter(([k])=>k!=='total').reduce((n,[,v])=>n+v,0)!==value.total)
   throw Error('Invalid score coverage');
}
export function checkReport(doc,source){
 if(doc===null)return true;
 if(!exact(doc,['schema_version','catalog_id','generated_at','evaluator','stopped','summary','entries','repositories'])||
   doc.schema_version!==3||typeof doc.catalog_id!=='string'||!doc.catalog_id||!timestamp(doc.generated_at)||doc.stopped!==null||
   !Array.isArray(doc.entries)||!Array.isArray(doc.repositories))throw Error('Malformed canonical Open JEV report');
 checkEvaluator(doc.evaluator);checkSummary(doc.summary);
 let last=null;const entries=new Map();
 for(const e of doc.entries){
  checkEntry(e);
  if(last!==null&&last.localeCompare(e.id,'en')>=0)throw Error('Score IDs must be uniquely sorted');
  last=e.id;entries.set(e.id,e);
 }
 const totals=summary(),seen=new Set();last=null;
 for(const r of doc.repositories){
  if(!exact(r,['repository','summary','overall_score','criterion_scores','scored_skill_ids'])||
    typeof r.repository!=='string'||!r.repository||!Array.isArray(r.scored_skill_ids)||
    last!==null&&last.localeCompare(r.repository,'en')>=0)throw Error('Invalid repository order or shape');
  last=r.repository;checkSummary(r.summary);
  if(!r.summary.total||r.summary.evaluated!==r.scored_skill_ids.length)throw Error('Invalid repository coverage');
  let prior=null;
  const contributing=r.scored_skill_ids.map(id=>{
   const e=entries.get(id);
   if(!e||seen.has(id)||prior!==null&&prior.localeCompare(id,'en')>=0||
     !id.toLowerCase().startsWith(r.repository.toLowerCase()+'/')||e.fingerprint!==doc.evaluator.fingerprint)
     throw Error('Invalid contributing skill '+id);
   prior=id;seen.add(id);return e;
  });
  const expected=repositoryMeans(contributing);
  if(r.overall_score!==expected.overall_score||JSON.stringify(r.criterion_scores)!==JSON.stringify(expected.criterion_scores))
    throw Error('Repository means differ from contributing scores');
  for(const k of Object.keys(totals))totals[k]+=r.summary[k];
 }
 if(Object.keys(totals).some(k=>totals[k]!==doc.summary[k])||doc.entries.length>doc.summary.total||
   doc.summary.evaluated+doc.summary.stale>doc.entries.length)throw Error('Repository coverage differs from report summary');
 if(source){
  if(doc.catalog_id!==source.catalog.catalog_id)throw Error('Open JEV catalog mismatch');
  const fresh=buildReport(doc.entries,source,{config:doc.evaluator,previous:doc,now:doc.generated_at});
  if(JSON.stringify(fresh)!==JSON.stringify(doc))throw Error('Score coverage or aggregates are stale; run npm run sync:scores');
 }
 return true;
}
/** Only the standalone Open JEV v1 format is migratable; old-provider v2 is not a cache. */
export function importLegacy(doc,source){
 const config=evaluator();
 if(!exact(doc,['schema_version','catalog_id','generated_at','evaluator','entries'])||doc.schema_version!==1||
   doc.catalog_id!==source.catalog.catalog_id||!timestamp(doc.generated_at)||!Array.isArray(doc.entries)||
   !exact(doc.evaluator,['provider','action_ref','model_release','state_format_version','questions_sha256','fingerprint','ranking_calibrated'])||
   Object.entries(doc.evaluator).some(([k,v])=>config[k]!==v))throw Error('Not a compatible standalone Open JEV v1 report');
 return buildReport(doc.entries.map(fromLegacyEntry),source,{config,now:doc.generated_at});
}
/** Rebase checkpoint evidence onto current sources without replacing newer current base results. */
export function mergeCheckpoint(before,input,source){
 checkReport(before);
 const imported=input?.schema_version===1?importLegacy(input,source):input;
 checkReport(imported);
 if(!imported||imported.catalog_id!==source.catalog.catalog_id||before&&before.catalog_id!==source.catalog.catalog_id)
   throw Error('Checkpoint catalog mismatch');
 const rows=new Map((before?.entries??[]).map(e=>[e.id,e])),fp=evaluator().fingerprint;
 const isCurrent=entry=>{
  const pin=source.entries.get(entry.id);
  return pin?.status==='verified'&&current(entry,parseSource(pin),fp);
 };
 for(const e of imported.entries){
  const old=rows.get(e.id);
  if(!old||(!isCurrent(old)&&isCurrent(e))||isCurrent(old)===isCurrent(e)&&Date.parse(e.evaluated_at)>Date.parse(old.evaluated_at))rows.set(e.id,e);
 }
 return buildReport([...rows.values()],source,{previous:before});
}
export function args(argv){
 const result={};for(let i=0;i<argv.length;i++){
  if(!argv[i].startsWith('--')||!argv[i+1]||argv[i+1].startsWith('--'))throw Error('Expected --name value');
  result[argv[i++].slice(2)]=argv[i];
 }
 return result;
}
