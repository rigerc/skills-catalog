import test from 'node:test';
import assert from 'node:assert/strict';
import {newlyRecommendedSkills, selectTargets} from '../scripts/quality.mjs';

const pin = 'a'.repeat(40);
const entry = id => ({id, status: 'verified', commit: pin,
  url: 'https://github.com/' + id.split('/').slice(0, 2).join('/') +
    '/blob/' + pin + '/skills/' + id.split('/').at(-1) + '/SKILL.md'});
const previous = {
  technologies: [
    {id: 'claude-code', skill_ids: []},
    {id: 'python', skill_ids: ['o/r/existing']},
  ],
  combinations: [{id: 'cursor-stack', skill_ids: []}],
};

test('mapping-only changes select previously verified skills with unchanged pins', () => {
  const next = {
    technologies: [
      {id: 'claude-code', skill_ids: ['mattpocock/skills/git-guardrails-claude-code']},
      {id: 'python', skill_ids: ['o/r/existing']},
    ],
    combinations: [
      {id: 'cursor-stack', skill_ids: ['Mindrally/skills/nextjs-react-redux-typescript-cursor-rules']},
      {id: 'cursor-odoo', skill_ids: ['Mindrally/skills/python-odoo-cursor-rules']},
    ],
  };
  const added = newlyRecommendedSkills(next, previous);
  const ids = [
    'mattpocock/skills/git-guardrails-claude-code',
    'Mindrally/skills/nextjs-react-redux-typescript-cursor-rules',
    'Mindrally/skills/python-odoo-cursor-rules',
  ];
  assert.deepEqual([...added].sort(), [...ids].sort());
  assert.deepEqual(selectTargets(ids.map(entry), new Map(), {all: true, only: added}).map(s => s.id), ids);
});

test('unchanged and reordered recommendations require no validation', () => {
  const current = {
    technologies: [
      {id: 'python', skill_ids: ['o/r/existing']},
      {id: 'claude-code', skill_ids: []},
    ],
    combinations: [{id: 'cursor-stack', skill_ids: []}],
  };
  assert.deepEqual([...newlyRecommendedSkills(current, previous)], []);
});

test('removal of a recommendation does not trigger quality checks', () => {
  assert.equal(newlyRecommendedSkills({
    technologies: [{id: 'python', skill_ids: []}],
    combinations: [],
  }, previous).size, 0);
});

test('recommendations in multiple mappings are validated only once', () => {
  const shared = 'o/r/skill';
  const next = {
    technologies: [{id: 'python', skill_ids: ['o/r/existing', shared]}],
    combinations: [
      {id: 'cursor-stack', skill_ids: [shared]},
      {id: 'new-stack', skill_ids: [shared]},
    ],
  };
  assert.deepEqual([...newlyRecommendedSkills(next, previous)], [shared]);
});
