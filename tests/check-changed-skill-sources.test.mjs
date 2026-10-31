import test from 'node:test';
import assert from 'node:assert/strict';
import {changedSources, sourceCoordinates, checkChangedSources, apiJson} from '../scripts/check-changed-skill-sources.mjs';

const A = 'a'.repeat(40), B = 'b'.repeat(40), C = 'c'.repeat(40), D = 'd'.repeat(40);
const make = (name, commit = A, repo = 'demo/repo') => ({
  id: repo + '/' + name, status: 'verified', commit,
  url: 'https://github.com/' + repo + '/blob/' + commit + '/skills/' + name + '/SKILL.md',
  checked_at: '2026-01-01',
});
const tree = files => ({truncated: false, tree: Object.entries(files).map(([path, size]) => (
  {path, type: 'blob', size, sha: C}))});
const fake = (options = {}) => {
  const calls = [];
  const request = async url => {
    calls.push(url);
    if (url.endsWith('/git/commits/' + A)) return {tree: {sha: B}};
    if (url.endsWith('/git/commits/' + D)) return {tree: {sha: B}};
    if (url.endsWith('/git/trees/' + B + '?recursive=1')) return options.tree ??
      tree({'skills/alpha/SKILL.md': 12, 'skills/beta/SKILL.md': 26, 'skills/gamma/SKILL.md': 0});
    if (url.endsWith('/git/trees/' + B)) return {truncated: false, tree: [{path: 'skills', type: 'tree', sha: C}]};
    if (url.endsWith('/git/trees/' + C)) return {truncated: false, tree: [
      {path: 'alpha', type: 'tree', sha: D}, {path: 'beta', type: 'tree', sha: D}]};
    if (url.endsWith('/git/trees/' + D)) return {truncated: false, tree: [{path: 'SKILL.md', type: 'blob', size: 50}]};
    throw Error('Unexpected request: ' + url);
  };
  return {request, calls};
};

test('checks new or changed source pins, not timestamp-only edits', () => {
  const old = [make('alpha'), make('beta')];
  const current = [{...old[0], checked_at: 'later'}, make('beta', D), make('new')];
  assert.deepEqual(changedSources(current, old).map(x => x.id), ['demo/repo/beta', 'demo/repo/new']);
  assert.deepEqual(changedSources([make('alpha')], [{...make('alpha'), status: 'unresolved'}])
    .map(x => x.id), ['demo/repo/alpha']);
  assert.deepEqual(changedSources([{...old[0], url: make('beta').url}], old)
    .map(x => x.id), ['demo/repo/alpha']);
});

test('derives repository and file path from pinned URLs', () => {
  assert.deepEqual(sourceCoordinates(make('alpha')), {repo: 'demo/repo', path: 'skills/alpha/SKILL.md'});
});

test('checks four skills in one repository/commit with only two API requests', async () => {
  const f = fake();
  const r = await checkChangedSources([make('alpha'), make('beta'), make('gamma'), make('absent')], f);
  assert.equal(r.requests, 2);
  assert.equal(f.calls.length, 2);
  assert.deepEqual(r.results.map(x => x.status), ['verified', 'verified', 'invalid', 'missing']);
});

test('uses separate trees for distinct immutable commits', async () => {
  const f = fake();
  const r = await checkChangedSources([make('alpha'), make('beta', D)], f);
  assert.equal(r.groups, 2);
  assert.equal(r.requests, 4);
  assert.ok(r.results.every(x => x.status === 'verified'));
});

test('handles truncated recursive trees with targeted non-recursive traversal', async () => {
  const f = fake({tree: {truncated: true, tree: []}});
  const r = await checkChangedSources([make('alpha')], f);
  assert.equal(r.results[0].status, 'verified');
  assert.equal(r.requests, 5);
});

test('reports GitHub failures without marking sources verified', async () => {
  const r = await checkChangedSources([make('alpha'), make('beta')], {
    request: async () => { throw Error('rate limit exhausted'); },
  });
  assert.deepEqual(r.results.map(x => x.status), ['error', 'error']);
});

test('stops immediately on reported rate-limit exhaustion', async () => {
  let calls = 0;
  await assert.rejects(() => apiJson('https://api.github.com/repos/x/y', {
    fetchImpl: async () => {
      calls++;
      return {status: 403, ok: false,
        headers: {get: k => k === 'x-ratelimit-remaining' ? '0' : null}};
    },
    sleep: async () => {},
  }), /rate limit exhausted/);
  assert.equal(calls, 1);
});
