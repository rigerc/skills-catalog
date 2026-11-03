#!/usr/bin/env node
/** Offline canonical maintenance and explicit standalone-v1 import. Inference runs in Actions. */
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {SCORES_PATH,read,report,sources,checkReport,buildReport,importLegacy,writeAtomic,mergeCheckpoint} from './open-jev-lib.mjs';
export function main(argv){
 if(argv.length===1&&argv[0]==='--help'){
  console.log('Open JEV canonical scores\n  --sync                 Refresh coverage/aggregates offline\n  --check                Validate canonical scores offline\n  --import PATH          Replace scores with standalone Open JEV v1\n  --import-checkpoint PATH Merge canonical v3 or standalone v1 progress\nInference: npm run evaluate:skills -- --limit 8; run nosey-open-jev.yml or nosey-open-jev-bulk.yml in Actions.');return;
 }
 const source=sources(),before=report();
 if(argv.length===1&&argv[0]==='--check'){
  if(!before)throw Error('Canonical scores are missing; run --sync');
  checkReport(before,source);console.log(JSON.stringify(before.summary));return;
 }
 let next;
 if(argv.length===1&&argv[0]==='--sync'){
  checkReport(before);
  if(before&&before.catalog_id!==source.catalog.catalog_id)throw Error('Open JEV catalog mismatch');
  next=buildReport(before?.entries??[],source,{previous:before});
 }else if(argv.length===2&&['--import','--import-checkpoint'].includes(argv[0])){
  const input=read(argv[1]);if(!input)throw Error('Missing Open JEV import '+argv[1]);
  if(argv[0]==='--import')next=importLegacy(input,source);
  else next=mergeCheckpoint(before,input,source);
 }else throw Error('Use --sync, --check, --import PATH, or --import-checkpoint PATH');
 checkReport(next,source);
 console.log((writeAtomic(SCORES_PATH,next)?'Wrote ':'No changes to ')+SCORES_PATH);
 console.log(JSON.stringify(next.summary));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{main(process.argv.slice(2));}catch(error){console.error(error.message);process.exitCode=1;}
}
