#!/usr/bin/env node
import {readFileSync,readdirSync,existsSync,appendFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ROOT,SCORES_PATH,args,sources,parseSource,report,checkReport,checkEntry,evaluator,current,writeAtomic,buildReport} from './open-jev-lib.mjs';
export function merge(candidates,before,source,now=new Date().toISOString()){
 checkReport(before);
 if(before&&before.catalog_id!==source.catalog.catalog_id)throw Error('Prior report catalog mismatch');
 const rows=new Map((before?.entries||[]).filter(e=>source.entries.has(e.id)).map(e=>[e.id,e]));
 let accepted=0;
 for(const e of candidates){
  checkEntry(e);
  const pin=source.entries.get(e.id);
  if(!pin||pin.status!=='verified'||!current(e,parseSource(pin),evaluator().fingerprint))continue;
  const old=rows.get(e.id);
  if(old?.fingerprint===e.fingerprint&&(Date.parse(old.evaluated_at)>Date.parse(e.evaluated_at)||JSON.stringify(old)===JSON.stringify(e)))continue;
  rows.set(e.id,e);accepted++;
 }
 const next=buildReport([...rows.values()],source,{previous:before,now});
 checkReport(next,source);return {next,accepted};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const a=args(process.argv.slice(2)),dir=resolve(ROOT,a.dir??'.nosey-eval/results');
  const candidates=existsSync(dir)?readdirSync(dir).filter(n=>n.endsWith('.json')).sort().map(n=>JSON.parse(readFileSync(join(dir,n),'utf8'))):[];
  const output=a.out??SCORES_PATH,before=resolve(ROOT,output)===resolve(ROOT,SCORES_PATH)?report():
    (existsSync(resolve(ROOT,output))?JSON.parse(readFileSync(resolve(ROOT,output),'utf8')):null);
  const {next,accepted}=merge(candidates,before,sources());
  const changed=writeAtomic(output,next);
  if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,'changed='+changed+'\naccepted='+accepted+'\n');
  console.log('Open JEV merged '+accepted+' successful evaluations; changed='+changed);
 }catch(error){console.error(error.message);process.exitCode=1;}
}
