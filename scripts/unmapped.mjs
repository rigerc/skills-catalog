#!/usr/bin/env node
/** Generate the deterministic index of catalog skills without any forward mapping. */
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const outputPath = resolve(root, 'data/unmapped.json');

/** Canonicalize repository aliases as catalog validation does, ignoring case. */
export function canonicalSkillId(id, aliases = {}) {
  if (typeof id !== 'string' || !id) throw new Error('Expected a skill ID');
  const keys = Object.keys(aliases).sort((a, b) => b.length - a.length);
  const seen = new Set();
  let current = id;
  while (true) {
    const normalized = current.toLowerCase();
    if (seen.has(normalized)) throw new Error('Cyclic repository alias for ' + id);
    seen.add(normalized);
    const alias = keys.find(key => normalized.startsWith(key.toLowerCase() + '/'));
    if (!alias) return normalized;
    current = aliases[alias] + current.slice(alias.length);
  }
}

/** Forward mapping references are authoritative, not optional recommended_for backlinks. */
export function findUnmappedSkills(catalog, mappings) {
  const aliases = mappings.repository_aliases ?? {};
  const mapped = new Set();
  const add = id => mapped.add(canonicalSkillId(id, aliases));
  for (const technology of mappings.technologies) {
    for (const id of technology.skill_ids ?? []) add(id);
  }
  for (const combination of mappings.combinations) {
    for (const id of combination.skill_ids ?? []) add(id);
  }
  for (const id of mappings.frontend_essentials?.skill_ids ?? []) add(id);

  return catalog.skills.filter(skill => !mapped.has(canonicalSkillId(skill.id, aliases)))
    .map(({id, repository, skill_name}) => ({id, repository, skill_name}))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function renderUnmapped(catalog, mappings) {
  const skills = findUnmappedSkills(catalog, mappings);
  return JSON.stringify({
    schema_version: 1,
    catalog_id: catalog.catalog_id,
    snapshot_date: catalog.snapshot_date,
    count: skills.length,
    skills,
  }, null, 2) + '\n';
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [mode, ...extra] = process.argv.slice(2);
  if (extra.length || !['--check', '--write'].includes(mode)) {
    console.error('Usage: node scripts/unmapped.mjs --check|--write');
    process.exitCode = 2;
  } else {
    try {
      const catalog = JSON.parse(readFileSync(resolve(root, 'data/catalog.json'), 'utf8'));
      const mappings = JSON.parse(readFileSync(resolve(root, 'data/mappings.json'), 'utf8'));
      const expected = renderUnmapped(catalog, mappings);
      if (mode === '--write') writeFileSync(outputPath, expected);
      else {
        let actual;
        try {actual = readFileSync(outputPath, 'utf8');} catch {actual = null;}
        if (actual !== expected) throw new Error('data/unmapped.json is stale; run node scripts/catalog.mjs --write');
      }
      console.log('Unmapped skills: ' + findUnmappedSkills(catalog, mappings).length);
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  }
}
