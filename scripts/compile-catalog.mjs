#!/usr/bin/env node
/** Compile a deterministic, quality-gated Nosey manifest from committed catalog inputs. */
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {fingerprint as qualityFingerprint} from './quality.mjs';
import {validate, load} from './catalog.mjs';
import {evaluator as openEvaluator,checkReport as checkOpenReport,current as openCurrent} from './open-jev-lib.mjs';
const ROOT=fileURLToPath(new URL('..', import.meta.url));
const SHA40=/^[a-f0-9]{40}$/;
const read=(name,optional=false)=>{
  try{return JSON.parse(readFileSync(resolve(ROOT,name),'utf8'));}
  catch(error){if(optional&&error.code==='ENOENT')return null;throw error;}
};
const unique=(xs,label)=>{if(new Set(xs).size!==xs.length)throw Error('Duplicate '+label);};
export function compile({revision,asOf}={}){
  if(!SHA40.test(revision||''))throw Error('revision must be a full commit SHA');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(asOf||'')||new Date(asOf+'T00:00:00Z').toISOString().slice(0,10)!==asOf)
    throw Error('as-of must be an actual YYYY-MM-DD calendar date');
  const {c,m,l,d}=load();validate(c,m,l,d);
  const report=read('data/quality.json');
  const waivers=read('data/quality-waivers.json');
  const scores=read('data/scores.json',true);
  checkOpenReport(scores);
  if(scores&&scores.catalog_id!==c.catalog_id)throw Error('Open JEV catalog mismatch');
  if(report.catalog_id!==c.catalog_id||!Array.isArray(report.entries)||!Array.isArray(waivers.waivers))
    throw Error('Invalid quality or waivers report');
  const expected=qualityFingerprint();
  if(report.tool?.config_sha256!==expected)throw Error('Stale quality tool fingerprint');
  const source=new Map(l.entries.map(e=>[e.id,e]));
  const entries=new Map(report.entries.map(e=>[e.id,e]));
  unique(l.entries.map(e=>e.id),'source IDs');
  unique(report.entries.map(e=>e.id),'quality IDs');
  const scoreEntries=new Map((scores?.entries||[]).map(e=>[e.id,e]));
  const waiverKeys=waivers.waivers.map(w=>w.id+'@'+w.commit);
  unique(waiverKeys,'waivers');
  for(const w of waivers.waivers){
    if(source.get(w.id)?.commit!==w.commit||!Array.isArray(w.applies_to)||
      !w.reason||!w.reviewed_by||w.expires&&!/^\d{4}-\d{2}-\d{2}$/.test(w.expires))
      throw Error('Invalid waiver '+w.id);
  }
  const skills=c.skills.map(s=>{
    const e=source.get(s.id);if(!e)throw Error('Missing source '+s.id);
    let pin=null;
    if(e.status==='verified'){
      const match=/^https:\/\/github\.com\/([^/]+\/[^/]+)\/blob\/([a-f0-9]{40})\/(.+\/)?SKILL\.md$/.exec(e.url||'');
      if(!match||match[2]!==e.commit)throw Error('Invalid pinned source '+s.id);
      pin={repository:match[1],commit:e.commit,path:(match[3]||'')+'SKILL.md',url:e.url};
    }
    const q=entries.get(s.id);
    const current=Boolean(pin&&q&&q.fingerprint===expected&&q.source?.commit===pin.commit&&q.source?.path===pin.path&&
      q.source?.repository?.toLowerCase()===pin.repository.toLowerCase());
    const freshness=!q?'missing':current?'current':'stale';
    const status=current?q.status:'not_evaluated';
    const target=status==='fail'?'fail':'not_evaluated';
    const waiver=pin&&waivers.waivers.find(w=>w.id===s.id&&w.commit===pin.commit&&w.applies_to.includes(target)&&
      (!w.expires||w.expires>=asOf));
    const eligible=Boolean(pin&&(current&&['pass','warn'].includes(status)||waiver));
    const quality={status,freshness,eligible,waiver_applied:Boolean(waiver),
      ...(!eligible?{quarantine_reasons:[!pin?'unverified_source':freshness!=='current'?'quality_'+freshness:status]}:{})};
    if(waiver)quality.waiver={reason:waiver.reason,reviewed_by:waiver.reviewed_by,commit:waiver.commit,
      applies_to:target,...(waiver.expires?{expires:waiver.expires}:{})};
    const score=scoreEntries.get(s.id);
    const currentScore=Boolean(pin&&openCurrent(score,pin,openEvaluator().fingerprint)&&score.fingerprint===scores?.evaluator?.fingerprint);
    return {id:s.id,name:s.skill_name,source:pin,recommended_for:s.recommended_for,quality,
      evaluation:{status:currentScore?'current':score?'stale':'missing',
        overall_score:currentScore?score.overall_score:null,...(currentScore?{result_kind:score.result_kind,evaluator_fingerprint:score.fingerprint}:{})},
      // Retain the v1 extension as an alias; primary consumers use evaluation.
      open_jev:{status:currentScore?'current':score?'stale':'missing',
        overall_score:currentScore?score.overall_score:null,ranking_eligible:false,
        ...(currentScore?{evaluated_at:score.evaluated_at,evaluator_fingerprint:score.fingerprint}:{})}};
  }).sort((a,b)=>a.id.localeCompare(b.id,'en'));
  const technologies=m.technologies.map(t=>({id:t.id,name:t.name,category:t.category,mapping_status:t.mapping_status,
    skill_ids:t.skill_ids})).sort((a,b)=>a.id.localeCompare(b.id,'en'));
  const combinations=m.combinations.map(x=>({id:x.id,name:x.name,requires:x.requires,skill_ids:x.skill_ids,
    ...(x.curated_primary_only===undefined?{}:{curated_primary_only:x.curated_primary_only})})).sort((a,b)=>a.id.localeCompare(b.id,'en'));
  const rules=[...d.rules].sort((a,b)=>a.technology_id.localeCompare(b.technology_id,'en'));
  const ids=new Set(skills.map(s=>s.id)),techIds=new Set(technologies.map(t=>t.id));
  unique(skills.map(s=>s.id),'skills');unique(technologies.map(t=>t.id),'technologies');
  for(const t of technologies)for(const id of t.skill_ids)if(!ids.has(id))throw Error('Unknown skill '+id);
  for(const x of combinations){
    for(const id of x.skill_ids)if(!ids.has(id))throw Error('Unknown skill '+id);
    for(const id of x.requires)if(!techIds.has(id))throw Error('Unknown technology '+id);
  }
  for(const r of rules)if(!techIds.has(r.technology_id))throw Error('Unknown rule '+r.technology_id);
  const required_capabilities=[...new Set(rules.flatMap(r=>r.signals.map(s=>s.type)))].sort();
  const counts={skills:skills.length,eligible_skills:skills.filter(s=>s.quality.eligible).length,
    quarantined_skills:skills.filter(s=>!s.quality.eligible).length,
    technologies:technologies.length,combinations:combinations.length,rules:rules.length};
  return {manifest_version:{major:1,minor:1},catalog_id:c.catalog_id,source_revision:revision,
    minimum_nosey_version:'0.5.0',required_capabilities,scan_policy:d.policy,
    repository_aliases:m.repository_aliases,mcp_scan_context:m.mcp_scan_context,
    frontend_essentials:m.frontend_essentials,skills,technologies,combinations,rules,counts};
}
function main(){
  const argv=process.argv.slice(2),arg=k=>argv[argv.indexOf(k)+1];
  const revision=arg('--revision'),asOf=arg('--as-of'),dest=resolve(ROOT,arg('--out')||'dist/manifest.json');
  const manifest=compile({revision,asOf});
  const json=JSON.stringify(manifest)+'\n';
  mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,json);
  const digest=createHash('sha256').update(json).digest('hex');
  console.log('Manifest '+digest+' '+manifest.counts.eligible_skills+'/'+manifest.counts.skills+' eligible');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
