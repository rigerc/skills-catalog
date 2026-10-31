import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {load, render} from '../scripts/catalog.mjs';
import {canonicalSkillId, findUnmappedSkills, renderUnmapped} from '../scripts/unmapped.mjs';

const skill = id => ({
  id, repository: id.split('/').slice(0, 2).join('/'),
  skill_name: id.split('/').at(-1),
  recommended_for: {technology_ids: [], combination_ids: [], frontend_essential: false},
});

test('unmapped means no technology, combination, or frontend-essential forward mapping', () => {
  const catalog = {schema_version: 1, catalog_id: 'sample', snapshot_date: '2026-10-31', skills: [
    skill('org/skills/technology'),
    skill('org/skills/combination'),
    skill('org/skills/frontend'),
    skill('org/skills/alias'),
    skill('org/skills/unmapped'),
  ]};
  // A stale reverse backlink must never hide a genuinely unmapped skill.
  catalog.skills.at(-1).recommended_for.technology_ids.push('not-a-forward-mapping');
  const mappings = {
    repository_aliases: {'legacy/skills': 'org/skills'},
    technologies: [{skill_ids: ['ORG/SKILLS/technology']}],
    combinations: [{skill_ids: ['org/skills/combination', 'legacy/skills/alias']}],
    frontend_essentials: {skill_ids: ['org/skills/frontend']},
  };
  assert.deepEqual(findUnmappedSkills(catalog, mappings), [{
    id: 'org/skills/unmapped', repository: 'org/skills', skill_name: 'unmapped',
  }]);
  assert.equal(JSON.parse(renderUnmapped(catalog, mappings)).count, 1);
});

test('index is deterministic, sorted, and preserves original skill identity', () => {
  const catalog = {
    catalog_id: 'sample', snapshot_date: '2026-10-31',
    skills: [skill('z/repo/zeta'), skill('a/repo/alpha'), skill('m/repo/middle')],
  };
  const mappings = {technologies: [], combinations: [], frontend_essentials: {skill_ids: []}};
  const first = renderUnmapped(catalog, mappings);
  const second = renderUnmapped(catalog, mappings);
  assert.equal(first, second);
  assert.deepEqual(JSON.parse(first).skills.map(s => s.id),
    ['a/repo/alpha', 'm/repo/middle', 'z/repo/zeta']);
  assert.equal(JSON.parse(first).snapshot_date, catalog.snapshot_date);
  assert.ok(first.endsWith('\n'));
});

test('canonicalize aliases and reject cyclic aliases', () => {
  assert.equal(canonicalSkillId('Legacy/SKILLS/Foo',
    {'legacy/skills': 'org/skills'}), 'org/skills/foo');
  assert.throws(() => canonicalSkillId('a/repo/foo', {
    'a/repo': 'b/repo', 'b/repo': 'a/repo',
  }), /Cyclic repository alias/);
});

test('committed unmapped.json matches canonical catalog and combined generator', () => {
  const {c, m, l, d} = load();
  const expected = renderUnmapped(c, m);
  const existing = readFileSync(new URL('../data/unmapped.json', import.meta.url), 'utf8');
  assert.equal(existing, expected);
  assert.equal(render(c, m, l, d)['data/unmapped.json'], expected);
  const parsed = JSON.parse(existing);
  assert.equal(parsed.schema_version, 1);
  assert.equal(parsed.catalog_id, c.catalog_id);
  assert.equal(parsed.snapshot_date, c.snapshot_date);
  assert.equal(parsed.count, parsed.skills.length);
  const referenced = new Set([
    ...m.technologies.flatMap(t => t.skill_ids),
    ...m.combinations.flatMap(x => x.skill_ids),
    ...m.frontend_essentials.skill_ids,
  ].map(id => canonicalSkillId(id, m.repository_aliases)));
  for (const s of parsed.skills) {
    assert.ok(!referenced.has(canonicalSkillId(s.id, m.repository_aliases)), s.id);
  }
});
