#!/usr/bin/env node
/** Validate and render Nosey's canonical, offline-consumable built-in catalog. */
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
export const load=()=>Object.fromEntries([
 ['c','catalog.json'],['m','mappings.json'],['l','catalog-source-ledger.json'],['d','technology-detection-rules.json']
].map(([key,name])=>[key,JSON.parse(readFileSync(resolve(root,'data',name),'utf8'))]));
export const validate=function validate(c,m,l,d){
  const err=[],fail=s=>err.push(s);
  const arr=(x,n)=>{if(!Array.isArray(x)){fail(n+" not an array");return[]}return x};
  for(const [n,x] of Object.entries({catalog:c,mappings:m,ledger:l,detection:d}))if(x.schema_version!==1)fail(n+" schema_version != 1");
  if(c.catalog_id!==m.catalog_id||d.catalog_id!==c.catalog_id)fail("catalog IDs disagree");
  if(c.snapshot_date!==m.snapshot_date)fail("snapshot dates disagree");
  const skills=arr(c.skills,"skills"),technologies=arr(m.technologies,"technologies"),combinations=arr(m.combinations,"combinations"),rules=arr(d.rules,"rules"),entries=arr(l.entries,"ledger");
  const aliases=m.repository_aliases??{};
  function canonical(id){
    if(typeof id!=="string")return "";
    const seen=new Set();let cur=id;
    while(true){if(seen.has(cur)){fail("cyclic alias "+id);return cur}seen.add(cur);
      const prefix=Object.keys(aliases).filter(k=>cur.startsWith(k+"/")).sort((a,b)=>b.length-a.length)[0];
      if(!prefix)return cur;cur=aliases[prefix]+cur.slice(prefix.length)}
  }
  function IDs(items,label){const set=new Set();for(const id of items){if(!id||set.has(id.toLowerCase()))fail(label+": duplicate/empty "+id);set.add((id??"").toLowerCase())}return set}
  const skillsIDs=IDs(skills.map(x=>canonical(x.id)),"skills"),techIDs=IDs(technologies.map(x=>x.id),"technologies"),
    comboIDs=IDs(combinations.map(x=>x.id),"combinations"),ruleIDs=IDs(rules.map(x=>x.technology_id),"rules"),ledgerIDs=IDs(entries.map(x=>canonical(x.id)),"ledger");
  function checkSkill(id,context){if(!skillsIDs.has(canonical(id).toLowerCase()))fail(context+": unknown skill "+id)}
  const mapped=technologies.filter(x=>x.mapping_status==="mapped"),unmapped=technologies.filter(x=>x.mapping_status==="detect_only");
  const expected={"catalog skills":[c.counts?.distinct_skills,skills.length],"mapped technologies":[c.counts?.technologies_with_skills,mapped.length],
    "detect only":[c.counts?.technologies_detect_only,unmapped.length],"combinations":[c.counts?.technology_combinations,combinations.length],
    "frontend essentials":[c.counts?.frontend_essential_skills,m.frontend_essentials?.skill_ids?.length],
    "all technologies":[m.counts?.technologies,technologies.length],"mappings mapped":[m.counts?.mapped_technologies,mapped.length],
    "mappings detect":[m.counts?.detect_only_technologies,unmapped.length],"mappings combinations":[m.counts?.combinations,combinations.length],
    "mappings referenced":[m.counts?.distinct_referenced_skills,skills.length]};
  for(const [n,[actual,want]] of Object.entries(expected))if(actual!==want)fail(n+": declared "+actual+", actual "+want);
  for(const t of technologies){if((t.skill_ids?.length>0)!==(t.mapping_status==="mapped"))fail("mapping status mismatch "+t.id);
    for(const id of t.skill_ids??[])checkSkill(id,"technology "+t.id)}
  for(const x of combinations){if(x.requires?.length<2)fail("combination requires < 2 "+x.id);
    for(const id of x.requires??[])if(!techIDs.has(id.toLowerCase()))fail("unknown required technology "+id);
    for(const id of x.skill_ids??[])checkSkill(id,"combination "+x.id)}
  for(const id of m.frontend_essentials?.skill_ids??[])checkSkill(id,"frontend essentials");
  for(const s of skills){if(!s.id||!s.repository||!s.skill_name)fail("incomplete skill identity");
    for(const id of s.recommended_for?.technology_ids??[])if(!techIDs.has(id.toLowerCase()))fail("unknown technology backlink "+id);
    for(const id of s.recommended_for?.combination_ids??[])if(!comboIDs.has(id.toLowerCase()))fail("unknown combination backlink "+id)}
  for(const id of skillsIDs)if(!ledgerIDs.has(id))fail("missing ledger entry "+id);
  for(const id of ledgerIDs)if(!skillsIDs.has(id))fail("extraneous ledger entry "+id);
  for(const e of entries){if(e.status==="verified"){if(!/^[a-f0-9]{40}$/.test(e.commit??"")||typeof e.url!=="string"||!e.url.startsWith("https://github.com/")||!e.url.includes("/blob/"+e.commit+"/")||!e.url.endsWith("/SKILL.md"))fail("bad verified source "+e.id)}
    else if(e.status==="unresolved"){if(!e.reason)fail("missing unresolved reason "+e.id)}
    else fail("unknown ledger status "+e.id)}
  const unresolved=entries.filter(x=>x.status==="unresolved").length,verified=entries.length-unresolved;
  if(unresolved!==l.unresolved_count)fail("unresolved count mismatch");
  for(const r of rules){const t=technologies.find(t=>t.id===r.technology_id);
    if(!t||t.mapping_status!==r.mapping_status)fail("detection status/technology mismatch "+r.technology_id);
    if(r.logic!=="any"||!r.signals?.length)fail("invalid detection rule "+r.technology_id);
    for(const s of r.signals??[]){if(!["dependency","path","glob","extension","content","mcp_package"].includes(s.type))fail("unknown signal "+s.type);
      if(s.type==="content"&&(typeof s.regex!=="string"||s.regex.length>512))fail("invalid content signal "+r.technology_id)}}
  for(const id of techIDs)if(!ruleIDs.has(id))fail("missing detection rule "+id);
  if(err.length)throw Error("Catalog validation failed:\n"+err.slice(0,20).join("\n")+(err.length>20?"\n...more":""));
  return{skills:skills.length,technologies:technologies.length,mapped:mapped.length,detect_only:unmapped.length,combinations:combinations.length,verified,unresolved};
};
export const render=function render(c,m,l,d){
 const stats=validate(c,m,l,d),esc=x=>String(x??"").replace(/\|/g,"\\|").replace(/\r?\n/g," "),code=x=>"`"+String(x).replace(/`/g,"")+"`";
 const cats=new Map(),provenance=new Map(l.entries.map(x=>[x.id,x]));
 for(const t of m.technologies){const x=cats.get(t.category)??{all:0,mapped:0};x.all++;if(t.mapping_status==="mapped")x.mapped++;cats.set(t.category,x)}
 const sortedCats=[...cats.keys()].sort((a,b)=>a.localeCompare(b));
 const categoryRows=sortedCats.map(x=>`| ${esc(x)} | ${cats.get(x).all} | ${cats.get(x).mapped} | ${cats.get(x).all-cats.get(x).mapped} |`).join("\n");
 const README=`# Nosey skills catalog

**Canonical data source for the built-in catalog and technology mappings in [Nosey](https://github.com/rigerc/nosey-5).**

Nosey synchronizes a commit-pinned copy from this repository into its packaged backend, keeping scans and recommendations offline-first. Make changes **here**, not in Nosey's generated copies.

> Generated from \`data/\`. Edit the JSON source files, then run \`node scripts/catalog.mjs --write\`.

## Snapshot

| Metric | Total |
| --- | ---: |
| Skills | **${stats.skills}** |
| Mapped technologies | **${stats.mapped}** |
| Detect-only technologies | **${stats.detect_only}** |
| Combinations | **${stats.combinations}** |
| Verified skill sources | **${stats.verified}** |
| Unresolved sources | **${stats.unresolved}** |

Snapshot date: **${esc(c.snapshot_date)}**. Source verification is historical evidence, **not** a live availability, compatibility, licensing, or security guarantee. Unresolved sources are not considered installable.

## Browse the data

- [All skills and source verification](SKILLS.md)
- [Technology mappings and combinations](TECHNOLOGIES.md)
- [Skill registry](data/catalog.json)
- [Skill map](data/mappings.json)
- [Scanner detection rules](data/technology-detection-rules.json)
- [Provenance and unresolved-source ledger](data/catalog-source-ledger.json)

## Technology coverage

| Category | Technologies | Mapped | Detect-only |
| --- | ---: | ---: | ---: |
${categoryRows}

## Authoring and validation

Start with [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow, including [adding skills](docs/adding-skills.md), [adding technologies](docs/adding-technologies.md), and [adding mappings](docs/adding-mappings.md).

Requires Node.js 22+; no npm dependencies.

\`\`\`sh
node scripts/catalog.mjs --validate
node scripts/catalog.mjs --write
node scripts/catalog.mjs --check
node --test tests/*.test.mjs
\`\`\`

CI enforces schema versions, canonical skill IDs, mapping references, count consistency, detection rules, provenance records, and generated documentation. A separate workflow proposes documentation regeneration PRs. Nosey's scheduled workflow proposes PRs to synchronize updates to its pinned, locally packaged snapshot.

The four \`data/*.json\` files are one versioned source snapshot. Keep skill identities, recommendation back-references, technology detection rules, and verified source identities aligned. Never invent installation URLs for unresolved entries. This built-in format is **not** Nosey's separate additive custom \`registry.json\` format.
`;
 const SKILLS=`# Skills

Generated from [catalog.json](data/catalog.json) and [source ledger](data/catalog-source-ledger.json). **Verified** identifies a skill file at the recorded commit; it does not constitute a safety audit or guarantee of availability.

| Canonical skill ID | Repository | Skill | Source | Technology mappings | Combinations |
| --- | --- | --- | --- | ---: | ---: |
${c.skills.slice().sort((a,b)=>a.id.localeCompare(b.id)).map(s=>{const e=provenance.get(s.id);const status=e?.status==="verified"?`[Verified source](${e.url})`:"Unresolved";return `| ${code(s.id)} | ${esc(s.repository)} | ${esc(s.skill_name)} | ${status} | ${s.recommended_for.technology_ids.length} | ${s.recommended_for.combination_ids.length} |`}).join("\n")}

**${stats.skills} skills** · ${stats.verified} verified · ${stats.unresolved} unresolved.
`;
 const groups=sortedCats.map(cat=>`## ${esc(cat)}

| Technology | ID | Status | Recommended skill IDs |
| --- | --- | --- | --- |
${m.technologies.filter(t=>t.category===cat).sort((a,b)=>a.id.localeCompare(b.id)).map(t=>`| ${esc(t.name)} | ${code(t.id)} | ${t.mapping_status==="mapped"?"Mapped":"Detect-only"} | ${t.skill_ids.map(code).join(", ")||"—"} |`).join("\n")}`).join("\n\n");
 const TECHNOLOGIES=`# Technology mappings

Generated from [mappings.json](data/mappings.json). Actual scanner signals are in [detection rules](data/technology-detection-rules.json); detect-only technologies have no recommended skills.

${groups}

## Combinations

Requires are evaluated together using Nosey's normal scope policy.

| Name | ID | Requires | Skills |
| --- | --- | --- | --- |
${m.combinations.slice().sort((a,b)=>a.id.localeCompare(b.id)).map(x=>`| ${esc(x.name)} | ${code(x.id)} | ${x.requires.map(code).join(" + ")} | ${x.skill_ids.map(code).join(", ")} |`).join("\n")}

## Frontend essentials

${m.frontend_essentials.skill_ids.map(code).join(", ")}
`;
 return{"README.md":README,"SKILLS.md":SKILLS,"TECHNOLOGIES.md":TECHNOLOGIES};
};
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [cmd,...extra]=process.argv.slice(2);
 if(extra.length||!['--check','--write','--validate'].includes(cmd)){console.error('Usage: node scripts/catalog.mjs --check|--write|--validate');process.exitCode=2}
 else try{
  const {c,m,l,d}=load();const result=validate(c,m,l,d);
  if(cmd!=='--validate'){const docs=render(c,m,l,d);const stale=[];
   for(const [name,output] of Object.entries(docs)){const path=resolve(root,name);
    if(cmd==='--write')writeFileSync(path,output,'utf8');
    else {let old;try{old=readFileSync(path,'utf8')}catch{old=null}if(old!==output)stale.push(name)}}
   if(stale.length)throw Error('Generated documents out of date: '+stale.join(', ')+'. Run node scripts/catalog.mjs --write.')}
  console.log('Catalog valid: '+JSON.stringify(result));
 }catch(e){console.error(e.message);process.exitCode=1}
}
