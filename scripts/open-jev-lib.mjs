import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync,mkdirSync,renameSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
export const ROOT=fileURLToPath(new URL('..',import.meta.url));
export const SHA40=/^[a-f0-9]{40}$/;
export const SHA64=/^[a-f0-9]{64}$/;
export const ACTION='intikhab49/open-jev-typed-decision-engine@4c3c85ee6238f24a464c9285d1786aabc51a753b';
export const MODEL_RELEASE='model-v1',STATE_LIMIT=4000,STATE_VERSION=1;
export const DIMENSIONS=['trigger_clarity','instruction_quality','correctness','safety','context_efficiency'];
export const hash=(data)=>createHash('sha256').update(data).digest('hex');
export const read=(p,otherwise=null)=>existsSync(resolve(ROOT,p))?JSON.parse(readFileSync(resolve(ROOT,p),'utf8')):otherwise;
export function writeAtomic(p,value){
 const path=resolve(ROOT,p);mkdirSync(dirname(path),{recursive:true});const tmp=path+'.'+process.pid+'.tmp';
 writeFileSync(tmp,JSON.stringify(value,null,2)+'\n');renameSync(tmp,path);
}
export const rubric=()=>read('config/open-jev-questions.json');
export function evaluator(){
 const questions=rubric();
 if(!questions||Object.keys(questions).length!==DIMENSIONS.length||
    DIMENSIONS.some(d=>questions[d]?.type!=='score'||questions[d].criteria?.length!==5))
   throw Error('Open JEV rubric requires exactly five ordered 0–4 questions');
 const fingerprint=hash(JSON.stringify({action:ACTION,model:MODEL_RELEASE,questions,
   stateLimit:STATE_LIMIT,stateVersion:STATE_VERSION,transform:'index+1,mean,informational'}));
 return {provider:'open-jev-action',action_ref:ACTION,model_release:MODEL_RELEASE,
   state_format_version:STATE_VERSION,questions_sha256:hash(JSON.stringify(questions)),
   fingerprint,ranking_calibrated:false};
}
export function sources(){
 const catalog=read('data/catalog.json'),ledger=read('data/catalog-source-ledger.json');
 if(!catalog?.catalog_id||!Array.isArray(catalog.skills)||!Array.isArray(ledger?.entries))
   throw Error('Missing canonical catalog or ledger');
 const skills=new Map(catalog.skills.map(s=>[s.id,s])), entries=new Map(ledger.entries.map(e=>[e.id,e]));
 if(skills.size!==catalog.skills.length||entries.size!==skills.size||
  [...entries].some(([id])=>!skills.has(id)))throw Error('Catalog/ledger IDs do not agree');
 return {catalog,ledger,skills,entries};
}
export function parseSource(e){
 if(e?.status!=='verified'||!SHA40.test(e.commit||''))throw Error('Source is not pinned: '+e?.id);
 const url=new URL(e.url);
 if(url.origin!=='https://github.com'||url.search||url.hash||url.username||url.password||
  /%|\\/.test(e.url)||/\/\.{1,2}(?:\/|$)/.test(url.pathname))throw Error('Unsafe pinned source URL');
 const parts=url.pathname.split('/').filter(Boolean);
 if(parts.length<5||parts[2]!=='blob'||parts[3]!==e.commit||parts.at(-1)!=='SKILL.md'||
  !parts.slice(4).every(p=>/^[A-Za-z0-9._@+()-]+$/.test(p)))
  throw Error('Invalid pinned SKILL.md source');
 const [owner,repo]=parts;const path=parts.slice(4).join('/');
 return {repository:owner+'/'+repo,path,commit:e.commit,
   rawUrl:'https://raw.githubusercontent.com/'+owner+'/'+repo+'/'+e.commit+'/'+path};
}
export const outputKey=id=>hash(id).slice(0,20);
export const report=()=>read('data/open-jev-scores.json');
export const current=(entry,source,fp)=>Boolean(entry?.status==='evaluated'&&
  entry.source?.repository?.toLowerCase()===source.repository.toLowerCase()&&
  entry.source.path===source.path&&entry.source.commit===source.commit&&entry.fingerprint===fp);
export function checkReport(doc){
 if(doc===null)return true;
 if(doc?.schema_version!==1||doc?.evaluator?.provider!=='open-jev-action'||!SHA64.test(doc.evaluator.fingerprint||'')||
  !Array.isArray(doc.entries))throw Error('Malformed Open JEV report');
 const seen=new Set();
 for(const e of doc.entries){
  if(seen.has(e.id)||e.status!=='evaluated'||!SHA40.test(e.source?.commit||'')||
    !SHA64.test(e.fingerprint||'')||!SHA64.test(e.input_sha256||'')||
    !/^\d{4}-\d{2}-\d{2}T/.test(e.evaluated_at||''))throw Error('Invalid evaluated entry '+e.id);
  seen.add(e.id);
  for(const key of DIMENSIONS){
    const s=e.scores?.[key];
    if(!s||!Number.isInteger(s.score)||s.score<1||s.score>5||
     !Number.isFinite(s.confidence)||s.confidence<0||s.confidence>1||s.mode!=='model')
     throw Error('Invalid score dimension '+key+' for '+e.id);
  }
  const mean=Math.round(DIMENSIONS.reduce((n,key)=>n+e.scores[key].score,0)/DIMENSIONS.length*10000)/10000;
  if(e.overall_score!==mean)throw Error('Inconsistent score mean '+e.id);
 }
 return true;
}
export function args(argv){
 const result={};for(let i=0;i<argv.length;i++){
  if(!argv[i].startsWith('--')||!argv[i+1]||argv[i+1].startsWith('--'))throw Error('Expected --name value');
  result[argv[i++].slice(2)]=argv[i];
 }
 return result;
}
