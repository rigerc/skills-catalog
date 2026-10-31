import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceLocation, findUpdates, applyUpdates, reportMarkdown, githubJson} from '../scripts/update-skill-sources.mjs';
import {load} from '../scripts/catalog.mjs';

const A = 'a'.repeat(40);
const B = 'b'.repeat(40);
const C = 'c'.repeat(40);
const D = 'd'.repeat(40);
const E = 'e'.repeat(40);
const repo = 'demo/skills';
const url = (name, commit) => 'https://github.com/' + repo + '/blob/' +
  commit + '/skills/' + name + '/SKILL.md';
const entry = (name, commit = A) => ({
  id: repo + '/' + name, status: 'verified', commit,
  checked_at: '2026-10-01T00:00:00Z', url: url(name, commit),
});
const tree = (values, truncated = false) => ({
  truncated,
  tree: Object.entries(values).map(([name, sha]) => ({
    path: 'skills/' + name + '/SKILL.md', type: 'blob',
    mode: '100644', sha, size: 150,
  })),
});
function stub({newFiles = {alpha: C, beta: D}, oldFiles = {alpha: C, beta: E},
  truncated = false, missing = false, failures = false} = {}) {
  const calls = [];
  const request = async api => {
    calls.push(api);
    if (failures) throw new Error('Rate limit exceeded');
    if (api === 'https://api.github.com/repos/demo/skills') return {default_branch: 'main'};
    if (api.endsWith('/commits/main')) return {sha: B, commit: {tree: {sha: C}}};
    if (api.endsWith('/git/trees/' + C + '?recursive=1')) return tree(newFiles, truncated);
    if (api.endsWith('/git/commits/' + A)) return {tree: {sha: D}};
    if (api.endsWith('/git/trees/' + D + '?recursive=1')) return tree(missing ? {} : oldFiles);
    throw new Error('Unexpected request: ' + api);
  };
  return {request, calls};
}

test('parses only pinned upstream skill locations', () => {
  assert.deepEqual(sourceLocation(entry('alpha')), {repo, path: 'skills/alpha/SKILL.md'});
  assert.throws(() => sourceLocation({...entry('alpha'), url: url('alpha', 'main')}));
});

test('checks all verified skills but only updates changed SKILL.md blobs', async () => {
  const api = stub();
  const result = await findUpdates([entry('alpha'), entry('beta'),
    {id: 'missing/skill', status: 'unresolved', reason: 'Needs verification'}], api);
  assert.equal(result.checked, 2);
  assert.equal(result.unresolved.length, 1);
  assert.deepEqual(result.updates.map(x => x.id), [repo + '/beta']);
  assert.equal(result.updates[0].oldCommit, A);
  assert.equal(result.updates[0].newCommit, B);
  assert.equal(api.calls.filter(x => x.endsWith('/git/commits/' + A)).length, 1);
  assert.equal(api.calls.filter(x => x.includes('/git/trees/')).length, 2);
});

test('does not repin for unrelated upstream commits', async () => {
  const result = await findUpdates([entry('alpha')], stub());
  assert.deepEqual(result.updates, []);
});

test('refuses missing latest or pinned SKILL.md instead of guessing a replacement', async () => {
  await assert.rejects(() => findUpdates([entry('beta')], stub({newFiles: {alpha: C}})),
    /Missing or empty latest/);
  await assert.rejects(() => findUpdates([entry('beta')], stub({missing: true})),
    /Missing or empty pinned/);
});

test('refuses truncated API trees and request errors', async () => {
  await assert.rejects(() => findUpdates([entry('alpha')], stub({truncated: true})), /truncated/);
  await assert.rejects(() => findUpdates([entry('alpha')], stub({failures: true})), /Rate limit/);
});

test('updates selected source pins without mutating other skills', () => {
  const old = entry('alpha'), unchanged = entry('beta');
  const {c, m, l, d} = load();
  // Apply a real fixture entry so catalog schema/mappings remain valid.
  const target = l.entries.find(x => x.status === 'verified');
  const next = 'f'.repeat(40);
  const changes = [{id: target.id, oldCommit: target.commit, newCommit: next}];
  const result = applyUpdates(c, m, l, d, changes, '2026-10-31T11:00:00.000Z');
  assert.equal(result.ledger.entries.find(x => x.id === target.id).commit, next);
  assert.equal(l.entries.find(x => x.id === target.id).commit, target.commit);
  assert.equal(result.catalog.snapshot_date, '2026-10-31');
  assert.equal(result.mappings.snapshot_date, '2026-10-31');
  assert.ok(result.ledger.entries.some(x => x.id !== target.id &&
    x.commit === l.entries.find(y => y.id === x.id).commit));
  assert.match(reportMarkdown({updates: changes.map(x => ({...x, repo, path: 'skills/alpha/SKILL.md'})),
    checked: 1, unresolved: []}), /Changed SKILL.md files: \*\*1\*\*/);
});

test('retries transient HTTP errors and rejects cross-host redirects', async () => {
  let calls = 0;
  const response = (status, data = {}, location = null) => ({
    status, ok: status === 200, json: async () => data,
    headers: {get: key => key === 'location' ? location : null},
  });
  const result = await githubJson('https://api.github.com/repos/demo/skills', {
    token: 'fake', sleep: async () => {}, fetchImpl: async () => {
      calls++;
      return calls === 1 ? response(503) : response(200, {default_branch: 'main'});
    },
  });
  assert.deepEqual(result, {default_branch: 'main'});
  assert.equal(calls, 2);
  await assert.rejects(() => githubJson('https://api.github.com/repos/demo/skills', {
    fetchImpl: async () => response(301, {}, 'https://attacker.example/repo'),
  }), /Unsafe GitHub API URL/);
});
