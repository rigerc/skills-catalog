#!/usr/bin/env node
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ROOT,args,DIMENSIONS,SHA40,SHA64,evaluator} from './open-jev-lib.mjs';
export function normalize(meta,raw,date='1970-01-01T00:00:00Z'){
 if(!meta?.id||!SHA40.test(meta.source?.commit||'')||!SHA64.test(meta.input_sha256||'')||
   meta.fingerprint!==evaluator().fingerprint)throw Error('Invalid evaluation metadata');
 if(raw?.workflow!==null||!raw.decisions||Object.keys(raw.decisions).length!==DIMENSIONS.length)
   throw Error('Unexpected action response');
 const scores={};
 for(const key of DIMENSIONS){
  const d=raw.decisions[key],answer=Number(d?.answer);
  if(d?.type!=='score'||d.mode!=='model'||!Number.isInteger(answer)||answer<0||answer>4||
    !Number.isFinite(d.confidence)||d.confidence<0||d.confidence>1||!d.distribution||
    Object.keys(d.distribution).length!==5)throw Error('Invalid typed answer '+key);
  const probabilities=Object.values(d.distribution);
  if(probabilities.some(v=>typeof v!=='number'||!Number.isFinite(v)||v<0||v>1)||
    Math.abs(probabilities.reduce((a,b)=>a+b,0)-1)>0.02)throw Error('Invalid probabilities '+key);
  scores[key]={score:answer+1,confidence:d.confidence,mode:'model'};
 }
 const overall_score=Math.round(DIMENSIONS.reduce((n,key)=>n+scores[key].score,0)/DIMENSIONS.length*10000)/10000;
 return {id:meta.id,status:'evaluated',source:meta.source,input_sha256:meta.input_sha256,
   fingerprint:meta.fingerprint,evaluated_at:date,scores,overall_score};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const a=args(process.argv.slice(2));
  if(!a.meta||!a.result||!a.out)throw Error('Required --meta --result --out');
  const meta=JSON.parse(readFileSync(resolve(ROOT,a.meta),'utf8'));
  const raw=JSON.parse(readFileSync(resolve(ROOT,a.result),'utf8'));
  const value=normalize(meta,raw,new Date().toISOString().replace(/\.\d+Z$/,'Z'));
  const path=resolve(ROOT,a.out);mkdirSync(dirname(path),{recursive:true});
  writeFileSync(path,JSON.stringify(value,null,2)+'\n');
  console.log('Recorded experimental score for '+value.id);
 }catch(error){console.error(error);process.exitCode=1;}
}