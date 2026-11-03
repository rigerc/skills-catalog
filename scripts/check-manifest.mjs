#!/usr/bin/env node
/** Validate compiled runtime semantics in addition to JSON Schema. */
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const args=process.argv.slice(2);
const v=k=>args[args.indexOf(k)+1];
const path=resolve(root,args.includes('--manifest')?v('--manifest'):'dist/manifest.json');
const manifest=JSON.parse(readFileSync(path,'utf8'));
const schema=JSON.parse(readFileSync(resolve(root,'schemas/manifest.schema.json'),'utf8'));
const ajv=new Ajv2020({allErrors:true,strict:false,validateFormats:false});
const check=ajv.compile(schema);
if(!check(manifest))throw Error(ajv.errorsText(check.errors));
const fail=message=>{throw Error('Manifest semantic error: '+message);};
const ids=new Set(manifest.skills.map(s=>s.id));
const techIds=new Set(manifest.technologies.map(t=>t.id));
if(ids.size!==manifest.skills.length||techIds.size!==manifest.technologies.length)fail('duplicate identities');
const eligible=manifest.skills.filter(s=>s.quality.eligible);
if(manifest.counts.skills!==manifest.skills.length||
 manifest.counts.eligible_skills!==eligible.length||
 manifest.counts.quarantined_skills!==manifest.skills.length-eligible.length||
 manifest.counts.technologies!==manifest.technologies.length||
 manifest.counts.combinations!==manifest.combinations.length||
 manifest.counts.rules!==manifest.rules.length)fail('declared counts disagree');
for(const skill of manifest.skills){
 const source=skill.source,quality=skill.quality;
 if(quality.eligible&&!source)fail('unverified eligible skill '+skill.id);
 if(quality.eligible&&quality.status!=='pass'&&quality.status!=='warn'&&!quality.waiver_applied)
   fail('quality gating bypass '+skill.id);
 if(quality.eligible&&quality.freshness!=='current'&&!quality.waiver_applied)
   fail('stale eligible skill '+skill.id);
 if(!quality.eligible&&(!Array.isArray(quality.quarantine_reasons)||!quality.quarantine_reasons.length))
   fail('quarantine missing reasons '+skill.id);
 if(manifest.manifest_version.minor>=1){
   const evaluation=skill.evaluation,alias=skill.open_jev;
   if((evaluation.status==='current')!==(evaluation.overall_score!==null))fail('evaluation status/score mismatch '+skill.id);
   if(evaluation.status==='current'&&(evaluation.result_kind!=='open_jev_scores'||!evaluation.evaluator_fingerprint))
     fail('invalid primary Open JEV evaluation '+skill.id);
   if(alias&&(alias.status!==evaluation.status||alias.overall_score!==evaluation.overall_score||
     alias.evaluator_fingerprint!==evaluation.evaluator_fingerprint))fail('Open JEV compatibility alias differs '+skill.id);
 }
 if(source&&(!source.url.includes('/blob/'+source.commit+'/')||!(source.path==='SKILL.md'||source.path.endsWith('/SKILL.md'))))
   fail('source pin mismatch '+skill.id);
}
for(const tech of manifest.technologies)
 for(const id of tech.skill_ids)if(!ids.has(id))fail('unknown skill reference '+id);
for(const combo of manifest.combinations){
 for(const id of combo.skill_ids)if(!ids.has(id))fail('unknown combination skill '+id);
 for(const id of combo.requires)if(!techIds.has(id))fail('unknown required technology '+id);
}
for(const r of manifest.rules)if(!techIds.has(r.technology_id))fail('unknown detection rule');
const threshold=args.includes('--minimum-eligible-ratio')?Number(v('--minimum-eligible-ratio')):null;
if(threshold!==null&&(!Number.isFinite(threshold)||threshold<0||threshold>1||
 eligible.length/Math.max(1,ids.size)<threshold))
 fail('quality coverage below required threshold '+threshold);
if(args.includes('--site')){
 const target=resolve(root,v('--site'));
 const pointer=JSON.parse(readFileSync(resolve(target,'latest.json'),'utf8'));
 const sha=createHash('sha256').update(readFileSync(path)).digest('hex');
 const file=pointer?.artifact?.path;
 if(file!=='manifests/sha256-'+sha+'.json'||pointer.artifact.sha256!==sha||
 pointer.artifact.size_bytes!==readFileSync(path).length||
 pointer.catalog_id!==manifest.catalog_id||pointer.source_revision!==manifest.source_revision)
   fail('pointer mismatch');
 if(!readFileSync(resolve(target,file)).equals(readFileSync(path)))fail('staged artifact mismatch');
}
console.log('Valid runtime manifest: '+ids.size+' skills, '+eligible.length+' quality-eligible');
