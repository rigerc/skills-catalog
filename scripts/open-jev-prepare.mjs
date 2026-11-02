#!/usr/bin/env node
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ROOT,args,sources,parseSource,hash,evaluator,STATE_LIMIT,outputKey} from './open-jev-lib.mjs';
export async function prepare(e,{fetchImpl=fetch}={}){
 const src=parseSource(e);
 const response=await fetchImpl(src.rawUrl,{redirect:'manual',signal:AbortSignal.timeout(20000)});
 if(response.status!==200||!response.body)throw Error('Pinned source HTTP '+response.status);
 if(Number(response.headers.get('content-length')||'0')>262144)throw Error('Source too large');
 const parts=[];let total=0;
 for await(const chunk of response.body){total+=chunk.length;if(total>262144)throw Error('Source too large');parts.push(chunk);}
 if(!total)throw Error('Empty source');
 const bytes=Buffer.concat(parts),text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
 return {state:{skill_id:e.id,repository:src.repository,source_commit:src.commit,
   source_path:src.path,document_kind:'SKILL.md',document_excerpt:text.slice(0,STATE_LIMIT),is_truncated:text.length>STATE_LIMIT},
   meta:{id:e.id,key:outputKey(e.id),source:{repository:src.repository,path:src.path,commit:src.commit},
     fingerprint:evaluator().fingerprint,input_sha256:hash(bytes)}};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const a=args(process.argv.slice(2)),e=sources().entries.get(a.id);
  if(!e)throw Error('Unknown verified skill');
  const {state,meta}=await prepare(e);
  for(const [file,doc] of [[a.out??'.nosey-eval/state.json',state],[a.meta??'.nosey-eval/meta.json',meta]]){
   const path=resolve(ROOT,file);mkdirSync(dirname(path),{recursive:true});
   writeFileSync(path,JSON.stringify(doc,null,2)+'\n');
  }
  console.log('Prepared inert, pinned skill '+e.id);
 }catch(error){console.error(error);process.exitCode=1;}
}