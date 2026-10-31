import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from '../scripts/catalog.mjs';
import {findDuplicateSkills} from '../scripts/check-duplicate-skills.mjs';

const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);
const source = (repo, path, commit) =>
  'https://github.com/' + repo + '/blob/' + commit + '/' + path + '/SKILL.md';

function fixture() {
  return {
    c: {skills: [
      {id: 'team/tools/alpha', repository: 'team/tools', skill_name: 'alpha'},
      {id: 'team/tools/beta', repository: 'team/tools', skill_name: 'beta'},
    ]},
    m: {repository_aliases: {}},
    l: {entries: [
      {id: 'team/tools/alpha', status: 'verified', commit: SHA_A,
        url: source('team/tools', 'skills/alpha', SHA_A)},
      {id: 'team/tools/beta', status: 'verified', commit: SHA_B,
        url: source('team/tools', 'skills/beta', SHA_B)},
    ]},
  };
}

test('current catalog contains no duplicate skill identities', () => {
  const {c, m, l} = load();
  assert.deepEqual(findDuplicateSkills(c, m, l), []);
});

test('rejects canonical IDs that differ only in case', () => {
  const {c, m, l} = fixture();
  c.skills[1].id = 'TEAM/TOOLS/ALPHA';
  assert.ok(findDuplicateSkills(c, m, l).some(x => x.kind === 'canonical ID'));
});

test('rejects the same repository/skill name under different IDs', () => {
  const {c, m, l} = fixture();
  c.skills[1].skill_name = 'ALPHA';
  assert.ok(findDuplicateSkills(c, m, l).some(x => x.kind === 'repository/skill name'));
});

test('resolves repository aliases for duplicate detection', () => {
  const {c, m, l} = fixture();
  m.repository_aliases['team/legacy'] = 'team/tools';
  c.skills[1].repository = 'team/legacy';
  c.skills[1].skill_name = 'alpha';
  assert.ok(findDuplicateSkills(c, m, l).some(x => x.kind === 'repository/skill name'));
});

test('rejects the same upstream SKILL.md at different pinned commits', () => {
  const {c, m, l} = fixture();
  l.entries[1].url = source('TEAM/TOOLS', 'skills/alpha', SHA_B);
  const duplicates = findDuplicateSkills(c, m, l);
  assert.ok(duplicates.some(x => x.kind === 'upstream SKILL.md path' &&
    x.ids.join(',') === 'team/tools/alpha,team/tools/beta'));
});

test('allows same-named skills from different repositories', () => {
  const {c, m, l} = fixture();
  c.skills[1].repository = 'other/tools';
  c.skills[1].skill_name = 'alpha';
  l.entries[1].url = source('other/tools', 'skills/alpha', SHA_B);
  assert.deepEqual(findDuplicateSkills(c, m, l), []);
});

test('rejects invalid verified source URLs rather than silently ignoring them', () => {
  const {c, m, l} = fixture();
  l.entries[1].url = source('team/tools', 'skills/beta', 'main');
  assert.throws(() => findDuplicateSkills(c, m, l), /pinned GitHub SKILL.md/);
});
