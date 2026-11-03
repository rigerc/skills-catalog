#!/usr/bin/env node
/** Restore report data only; never check out scripts or catalog files from an old progress branch. */
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ROOT,SCORES_PATH,read,report,sources,mergeCheckpoint,writeAtomic,args} from './open-jev-lib.mjs';
import {PROGRESS_PATH,MAX_BATCHES} from './open-jev-bulk-status.mjs';
export function restore(ref,{git=(...argv)=>execFileSync('git',argv,{cwd:ROOT,encoding:'utf8',maxBuffer:16*1024*1024,stdio:['ignore','pipe','pipe']})}={}){
 if(!/^refs\/remotes\/origin\/[A-Za-z0-9._/-]+$/.test(ref)||ref.includes('..'))throw Error('Expected an origin remote branch ref');
 const get=path=>{
  const spec=ref+':'+path;
  try{git('cat-file','-e',spec);}catch(error){if(error.status===128)return null;throw error;}
  return JSON.parse(git('show',spec));
 };
 let checkpoint=get(SCORES_PATH);
 // Progress branches created before the replacement have v2 primary scores plus standalone v1 Open JEV.
 if(checkpoint?.schema_version!==3)checkpoint=get('data/open-jev-scores.json');
 if(!checkpoint)throw Error('Progress branch has no usable Open JEV checkpoint');
 const progress=get(PROGRESS_PATH);
 if(progress&&(progress.schema_version!==1||!Number.isInteger(progress.completed_batches)||progress.completed_batches<0||progress.completed_batches>MAX_BATCHES))
   throw Error('Invalid bulk checkpoint budget');
 const next=mergeCheckpoint(report(),checkpoint,sources());
 writeAtomic(SCORES_PATH,next);
 if(progress)writeAtomic(PROGRESS_PATH,progress);
 console.log('Restored Open JEV evidence onto current catalog: '+next.summary.evaluated+' current scores');
 return {next,progress};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const a=args(process.argv.slice(2));if(!a.ref)throw Error('Required --ref');
  restore(a.ref);
  if(a['require-budget']==='true'&&(read(PROGRESS_PATH)?.completed_batches??0)>=MAX_BATCHES&&report().summary.pending+report().summary.stale>0)
    throw Error('Bulk batch budget exhausted; review the progress PR before starting another run');
 }catch(error){console.error(error.message);process.exitCode=1;}
}
