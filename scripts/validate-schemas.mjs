#!/usr/bin/env node
/** JSON Schema shape validation; cross-file invariants remain in catalog.mjs. */
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

const root=fileURLToPath(new URL('..',import.meta.url));
const pairs=[
  ['catalog.json','catalog.schema.json'],
  ['mappings.json','mappings.schema.json'],
  ['technology-detection-rules.json','technology-detection-rules.schema.json'],
  ['catalog-source-ledger.json','catalog-source-ledger.schema.json'],
  ['quality.json','quality.schema.json'],
  ['quality-waivers.json','quality-waivers.schema.json'],
  ['scores.json','scores.schema.json'],
  ['unmapped.json','unmapped.schema.json']
].filter(([file])=>file!=='unmapped.json'||!process.argv.includes('--skip-unmapped'));
const ajv=new Ajv2020({allErrors:true,strict:true,strictRequired:false});
const validators=new Map();
for(const [file,schemaName] of pairs){
  const schema=JSON.parse(readFileSync(resolve(root,'schemas',schemaName),'utf8'));
  validators.set(file,ajv.compile(schema));
}
let failures=0;
for(const [file] of pairs){
  const data=JSON.parse(readFileSync(resolve(root,'data',file),'utf8'));
  const validate=validators.get(file);
  if(!validate(data)){
    console.error(file+': '+ajv.errorsText(validate.errors,{separator:'; '}));
    failures++;
  }else console.log(file+': valid');
}
if(process.argv.includes('--self-test')){
  const samples=[
    ['catalog.json',d=>{delete d.skills[0].repository},'missing skill identity'],
    ['mappings.json',d=>{d.technologies[0].mapping_status='unknown'},'invalid mapping status'],
    ['technology-detection-rules.json',d=>{d.rules[0].signals=[{type:'dependency',ecosystem:'npm'}]},'incomplete dependency signal'],
    ['technology-detection-rules.json',d=>{d.policy.source_code_execution=true},'unsafe scanner policy'],
    ['catalog-source-ledger.json',d=>{d.entries[0].commit='main'},'unpinned verified source'],
    ['catalog-source-ledger.json',d=>{d.entries[0]={id:d.entries[0].id,status:'unresolved'}},'unresolved entry without reason'],
    ['catalog-source-ledger.json',d=>{d.entries[0].reason='stale status'},'verified source carrying unresolved reason'],
    ['catalog.json',d=>{d.skills[0].id='not-a-canonical-id'},'malformed canonical skill ID'],
    ['mappings.json',d=>{d.technologies.find(t=>t.mapping_status==='mapped').skill_ids=[]},'mapped technology without recommendations'],
    ['technology-detection-rules.json',d=>{d.rules[0].signals=[{type:'path',path:'../private'}]},'unsafe scanner path'],
    ['quality.json',d=>{d.tool.checks.push('links')},'live link checking in quality results'],
    ['quality.json',d=>{d.schema_version=2},'unknown quality schema version'],
    ['scores.json',d=>{d.schema_version=2},'legacy scores in canonical artifact'],
    ['scores.json',d=>{d.summary.pending=-1},'negative score coverage'],
    ['scores.json',d=>{d.evaluator.fingerprint='invalid'},'invalid score fingerprint'],
    ['scores.json',d=>{d.evaluator.provider='jev'},'old provider in canonical scores'],
    ['scores.json',d=>{delete d.entries[0].evaluation.scores.safety},'missing Open JEV dimension'],
    ['scores.json',d=>{d.entries[0].evaluation.scores.safety.mode='fallback'},'fallback score'],
    ['scores.json',d=>{d.entries[0].evaluation.scores.safety.score=2.5},'fractional class score'],
    ['scores.json',d=>{d.entries=[{id:'a/b/c',status:'evaluated'}]},'score without provenance or rubric'],
    ['quality-waivers.json',d=>{d.waivers=[{id:'a/b/c',commit:'main',applies_to:['fail'],reason:'too short',reviewed_by:'x'}]},'unpinned waiver'],
    ['unmapped.json',d=>{d.skills[0].id='invalid'},'malformed unmapped skill ID'],
    ['unmapped.json',d=>{delete d.skills[0].skill_name},'incomplete unmapped entry'],
    ['unmapped.json',d=>{d.skills.push({...d.skills[0]})},'duplicated unmapped skill entry']
  ];
  for(const [file,mutate,label] of samples){
    if(!validators.has(file))continue;
    const data=JSON.parse(readFileSync(resolve(root,'data',file),'utf8'));
    // Negative cases need an entry even when the generated index is empty.
    if(file==='unmapped.json'){
      data.skills=[{id:'example/skills/example',repository:'example/skills',skill_name:'example'}];
      data.count=data.skills.length;
    }
    mutate(data);
    if(validators.get(file)(data)){console.error('Schema accepted '+label);failures++;}
  }
  if(!failures)console.log('Schema negative cases: valid');
}
if(failures)process.exitCode=1;
