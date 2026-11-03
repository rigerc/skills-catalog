#!/usr/bin/env node
import {mkdirSync,writeFileSync,appendFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ROOT,args,sources,parseSource,report,checkReport,evaluator,current,outputKey} from './open-jev-lib.mjs';
export function plan({limit=8}={}){
 if(!Number.isInteger(limit)||limit<0||limit>64)throw Error('Limit must be 0..64');
 const {catalog,entries}=sources(),before=report();checkReport(before);
 if(before&&before.catalog_id!==catalog.catalog_id)throw Error('Report catalog mismatch');
 const saved=new Map((before?.entries||[]).map(e=>[e.id,e])),fp=evaluator().fingerprint,all=[];
 for(const e of [...entries.values()].sort((a,b)=>a.id.localeCompare(b.id,'en'))){
  if(e.status!=='verified')continue;
  const src=parseSource(e);
  if(!current(saved.get(e.id),src,fp))all.push({id:e.id,key:outputKey(e.id),commit:e.commit});
 }
 return {catalog_id:catalog.catalog_id,fingerprint:fp,count:Math.min(limit,all.length),
   remaining:Math.max(0,all.length-limit),include:all.slice(0,limit)};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.includes('--help')){console.log('Open JEV offline planner: --limit 0..64 --out PATH. Run nosey-open-jev.yml or nosey-open-jev-bulk.yml in Actions to evaluate the plan.');process.exit(0);}
  const a=args(process.argv.slice(2));
  for(const key of Object.keys(a))if(!['limit','out'].includes(key))throw Error('Unknown planner option --'+key);
  const result=plan({limit:Number(a.limit??8)});
  const path=resolve(ROOT,a.out??'.nosey-eval/plan.json');mkdirSync(dirname(path),{recursive:true});
  writeFileSync(path,JSON.stringify(result,null,2)+'\n');
  if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,'matrix='+JSON.stringify({include:result.include})+'\ncount='+result.count+'\n');
  console.log('Open JEV: '+result.count+' new pins planned, '+result.remaining+' pending');
 }catch(error){console.error(error);process.exitCode=1;}
}