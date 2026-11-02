#!/usr/bin/env node
/** Bounded, resumable Open JEV bulk orchestration on an isolated branch.
 *  Never changes canonical scores in main or promotes model scores to ranking.
 */
import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ROOT,args,sources,parseSource,report,checkReport,evaluator,current,writeAtomic} from './open-jev-lib.mjs';

export const PROGRESS_PATH='.github/open-jev-bulk-progress.json';
export const MAX_BATCHES=20;
export function summarize({source,results,prior={completed_batches:0},accepted=0,runId='unknown',now=new Date().toISOString()}){
  checkReport(results);
  if(!results || results.catalog_id!==source.catalog.catalog_id)throw Error('Missing canonical Open JEV report');
  if(!Number.isInteger(accepted)||accepted<0)throw Error('Invalid accepted result count');
  if(!Number.isInteger(prior.completed_batches)||prior.completed_batches<0||
     prior.completed_batches>=MAX_BATCHES)throw Error('Bulk batch budget exhausted');
  const seen=new Map(results.entries.map(e=>[e.id,e]));
  const fingerprint=evaluator().fingerprint;
  let total=0,done=0;
  for(const skill of source.entries.values()){
    if(skill.status!=='verified')continue;
    total++;
    if(current(seen.get(skill.id),parseSource(skill),fingerprint))done++;
  }
  const remaining=total-done,batches=prior.completed_batches+1;
  const should_dispatch=remaining>0&&accepted>0&&batches<MAX_BATCHES;
  const reason=remaining===0?'completed':accepted===0?'no_accepted_results':
    batches>=MAX_BATCHES?'batch_budget_exhausted':'continuing';
  return {progress:{schema_version:1,completed_batches:batches,current_evaluations:done,
    verified_skills:total,remaining,accepted_last_batch:accepted,run_id:runId,
    updated_at:now,status:reason},
    should_dispatch,should_open_pr:!should_dispatch};
}
function writeOutput(name,value){
  if(process.env.GITHUB_OUTPUT)import('node:fs').then(({appendFileSync})=>
    appendFileSync(process.env.GITHUB_OUTPUT,name+'='+value+'\n'));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try {
  const a=args(process.argv.slice(2)),p=resolve(ROOT,PROGRESS_PATH);
  const prior=existsSync(p)?JSON.parse(readFileSync(p,'utf8')):undefined;
  const {progress,should_dispatch,should_open_pr}=summarize({
    source:sources(),results:report(),prior,accepted:Number(a.accepted),
    runId:process.env.GITHUB_RUN_ID||'manual'
  });
  writeAtomic(PROGRESS_PATH,progress);
  if(process.env.GITHUB_OUTPUT){
    const {appendFileSync}=await import('node:fs');
    appendFileSync(process.env.GITHUB_OUTPUT,
      'continue='+should_dispatch+'\nfinish='+should_open_pr+'\nremaining='+progress.remaining+
      '\ncompleted='+progress.current_evaluations+'\nstatus='+progress.status+'\n');
  }
  console.log(JSON.stringify(progress));
 }catch(error){console.error(error);process.exitCode=1;}
}
