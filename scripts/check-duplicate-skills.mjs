#!/usr/bin/env node
/** Reject catalog entries that identify the same skill more than once. */
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {load} from './catalog.mjs';
import {parseVerifiedSource} from './check-skill-existence.mjs';

/**
 * Compare canonical IDs, repository/skill names, and immutable source locations.
 * Source commits are intentionally ignored: two revisions of one SKILL.md are
 * not two distinct skills. Same-named skills in different repos are allowed.
 */
export function findDuplicateSkills(catalog, mappings, ledger) {
  const aliases = new Map(Object.entries(mappings.repository_aliases ?? {})
    .map(([from, to]) => [from.toLowerCase(), to.toLowerCase()]));

  function canonicalRepo(repository) {
    let name = repository.toLowerCase();
    const visited = new Set();
    while (aliases.has(name)) {
      if (visited.has(name)) throw new Error('Cyclic repository alias: ' + repository);
      visited.add(name);
      name = aliases.get(name);
    }
    return name;
  }

  const duplicates = [];
  const seen = new Map();
  function check(kind, identity, id) {
    const key = kind + '\0' + identity;
    if (seen.has(key)) {
      duplicates.push({kind, identity, ids: [seen.get(key), id]});
    } else {
      seen.set(key, id);
    }
  }

  for (const skill of catalog.skills) {
    const [owner, repo, ...rest] = skill.id.split('/');
    if (owner && repo && rest.length) {
      check('canonical ID', canonicalRepo(owner + '/' + repo) + '/' +
        rest.join('/').toLowerCase(), skill.id);
    }
    check('repository/skill name',
      canonicalRepo(skill.repository) + '/' + skill.skill_name.toLowerCase(), skill.id);
  }

  for (const entry of ledger.entries) {
    if (entry.status !== 'verified') continue;
    // Reuse the strict parser so malformed/unpinned URLs fail, not get skipped.
    const {apiUrl} = parseVerifiedSource(entry);
    const parts = new URL(apiUrl).pathname.split('/');
    const identity = canonicalRepo(parts[2] + '/' + parts[3]) +
      '/' + parts.slice(5).join('/');
    check('upstream SKILL.md path', identity, entry.id);
  }
  return duplicates;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const {c, m, l} = load();
    const duplicates = findDuplicateSkills(c, m, l);
    if (duplicates.length) {
      for (const duplicate of duplicates) {
        console.error('Duplicate ' + duplicate.kind + ' (' + duplicate.identity +
          '): ' + duplicate.ids.join(' and '));
      }
      process.exitCode = 1;
    } else {
      console.log('No duplicate skills (' + c.skills.length + ' catalog entries checked).');
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
