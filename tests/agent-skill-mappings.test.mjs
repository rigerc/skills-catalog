import test from 'node:test';
import assert from 'node:assert/strict';
import {load, validate} from '../scripts/catalog.mjs';
import {findUnmappedSkills} from '../scripts/unmapped.mjs';

const guardrail = 'mattpocock/skills/git-guardrails-claude-code';
const cursorNext = 'Mindrally/skills/nextjs-react-redux-typescript-cursor-rules';
const cursorOdoo = 'Mindrally/skills/python-odoo-cursor-rules';

test('Claude Code has an agent-specific skill and matching scanner status', () => {
  const {c,m,l,d} = load();
  const technology = m.technologies.find(t => t.id === 'claude-code');
  const rule = d.rules.find(r => r.technology_id === 'claude-code');
  const skill = c.skills.find(s => s.id === guardrail);
  assert.equal(technology.mapping_status, 'mapped');
  assert.equal(rule.mapping_status, 'mapped');
  assert.deepEqual(technology.skill_ids, [guardrail]);
  assert.deepEqual(skill.recommended_for.technology_ids, ['claude-code']);
  assert.equal(l.entries.find(e => e.id === guardrail).status, 'verified');
});

test('Cursor stack skills require their full combinations, not Cursor alone', () => {
  const {c,m,d} = load();
  const cursor = m.technologies.find(t => t.id === 'cursor');
  assert.equal(cursor.mapping_status, 'detect_only');
  assert.deepEqual(cursor.skill_ids, []);
  assert.equal(d.rules.find(r => r.technology_id === 'cursor').mapping_status, 'detect_only');
  for (const [id, requires, skillId] of [
    ['cursor-nextjs-redux-typescript', ['cursor','nextjs','redux','typescript'], cursorNext],
    ['cursor-odoo', ['cursor','odoo'], cursorOdoo],
  ]) {
    const combination = m.combinations.find(x => x.id === id);
    assert.ok(combination, id + ' missing');
    assert.deepEqual(combination.requires, requires);
    assert.deepEqual(combination.skill_ids, [skillId]);
    const skill = c.skills.find(s => s.id === skillId);
    assert.deepEqual(skill.recommended_for.combination_ids, [id]);
    assert.deepEqual(skill.recommended_for.technology_ids, []);
  }
});

test('all three skills leave the unmapped index and catalog remains valid', () => {
  const {c,m,l,d} = load();
  assert.equal(validate(c,m,l,d).combinations, m.counts.combinations);
  const unmapped = new Set(findUnmappedSkills(c,m).map(s => s.id));
  for (const id of [guardrail,cursorNext,cursorOdoo]) assert.equal(unmapped.has(id),false,id);
  assert.equal(m.counts.combinations,35);
  assert.equal(m.counts.mapped_technologies,214);
  assert.equal(m.counts.detect_only_technologies,66);
});
