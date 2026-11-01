#!/usr/bin/env node
import {readFileSync,readdirSync,existsSync,appendFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ROOT,args,sources,parseSource,report,checkReport,evaluator,current,writeAtomic} from './open-jev-lib.mjs';
export function merge(candidates,before,source,now='1970-01-01T00:00:00Z'){
 checkReport(before);
 if(before&&before.catalog_id!==source.catalog.catalog_id)throw Error('Prior report catalog mismatch');
 const rows=new Map((before?.entries||[]).filter(e=>source.entries.has(e.id)).map(e=>[e.id,e]));
 let accepted=0;
 for(const e of candidates){
  checkReport({schema_version:1,catalog_id:source.catalog.catalog_id,evaluator:evaluator(),entries:[e]});
  const pin=source.entries.get(e.id);
  if(!pin||pin.status!=='verified'||!current(e,parseSource(pin),evaluator().fingerprint))continue;
  const old=rows.get(e.id);
  if(old&&old.evaluated_at>e.evaluated_at&&old.fingerprint===e.fingerprint)continue;
  rows.set(e.id,e);accepted++;
 }
 const next={schema_version:1,catalog_id:source.catalog.catalog_id,
   generated_at:accepted||!before?now:before.generated_at,evaluator:evaluator(),
   entries:[...rows.values()].sort((a,b)=>a.id.localeCompare(b.id,'en'))};
 checkReport(next);
 return {next,accepted};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const a=args(process.argv.slice(2)),dir=resolve(ROOT,a.dir??'.nosey-eval/results');
  const candidates=existsSync(dir)?readdirSync(dir).filter(n=>n.endsWith('.json')).map(n=>JSON.parse(readFileSync(join(dir,n),'utf8'))):[];
  const before=report();
  if(!candidates.length&&!before){console.log('No model data to merge');process.exit(0);}
  const {next,accepted}=merge(candidates,before,sources(),new Date().toISOString().replace(/\.\d+Z$/,'Z'));
  const changed=JSON.stringify(next)!==JSON.stringify(before);
  if(changed)writeAtomic(a.out??'data/open-jev-scores.json',next);
  if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,'changed='+changed+'\naccepted='+accepted+'\n');
  console.log('Open JEV merged '+accepted+' successful evaluations; changed='+changed);
 }catch(error){console.error(error);process.exitCode=1;}
}