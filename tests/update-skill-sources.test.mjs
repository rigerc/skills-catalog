import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceLocation, findUpdates, applyUpdates, reportMarkdown, githubJson, remoteHead, rawSkillUrl, readRawSkill, gitBlobHash, findUpdatesWithoutApi} from '../scripts/update-skill-sources.mjs';
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


test('Git blob hashes match immutable Git object hashes', () => {
  assert.equal(gitBlobHash(Buffer.from('hello\n')), 'ce013625030ba8dba906f756967f9e9ca394464a');
  assert.equal(gitBlobHash(Buffer.from('hello\n')), gitBlobHash(new Uint8Array(Buffer.from('hello\n'))));
});

test('findUpdatesWithoutApi skips downloads for up-to-date upstream repositories', async () => {
  let heads = 0;
  const result = await findUpdatesWithoutApi([entry('alpha'), entry('beta')], {
    resolveHead: async () => {heads++; return A;},
    readSkill: async () => {throw Error('Unexpected raw download');},
  });
  assert.equal(heads, 1);
  assert.equal(result.rawDownloads, 0);
  assert.equal(result.apiRequests, 0);
  assert.deepEqual(result.updates, []);
  assert.equal(result.checked, 2);
});

test('findUpdatesWithoutApi compares actual file bytes and only proposes changed skills', async () => {
  const hits = [];
  const raw = {
    [A + '/skills/alpha/SKILL.md']: 'same',
    [B + '/skills/alpha/SKILL.md']: 'same',
    [A + '/skills/beta/SKILL.md']: 'old',
    [B + '/skills/beta/SKILL.md']: 'new',
  };
  const result = await findUpdatesWithoutApi([entry('beta'), entry('alpha'),
    {id: 'unresolved/skill', status: 'unresolved', reason: 'Unknown source'}], {
    resolveHead: async r => {assert.equal(r, repo); return B;},
    readSkill: async (r, sha, path) => {
      hits.push(sha + '/' + path);
      return Buffer.from(raw[sha + '/' + path]);
    },
  });
  assert.equal(result.repositories, 1);
  assert.equal(result.headLookups, 1);
  assert.equal(result.rawDownloads, 4);
  assert.equal(result.apiRequests, 0);
  assert.equal(result.unresolved.length, 1);
  assert.deepEqual(result.updates.map(x => x.id), [repo + '/beta']);
  assert.equal(result.updates[0].newCommit, B);
  assert.equal(result.updates[0].oldBlob, gitBlobHash(Buffer.from('old')));
  assert.equal(new Set(hits).size, 4);
});

test('upstream raw request failure stops updates instead of publishing partial results', async () => {
  await assert.rejects(() => findUpdatesWithoutApi([entry('alpha'), entry('beta')], {
    concurrency: 1,
    resolveHead: async () => B,
    readSkill: async () => {throw Error('HTTP 429 rate limited');},
  }), /HTTP 429/);
});

test('raw source paths are commit-pinned and reject unsafe locations', () => {
  assert.equal(rawSkillUrl('demo/skills', A, 'skills/my-skill/SKILL.md'),
    'https://raw.githubusercontent.com/demo/skills/' + A + '/skills/my-skill/SKILL.md');
  assert.throws(() => rawSkillUrl('demo/skills', 'main', 'skills/my-skill/SKILL.md'));
  assert.throws(() => rawSkillUrl('demo/skills', A, '../SKILL.md'));
  assert.throws(() => rawSkillUrl('bad/skills/extra', A, 'SKILL.md'));
});

test('raw file download rejects HTTP rate limit responses without retrying', async () => {
  let calls = 0;
  await assert.rejects(() => readRawSkill('demo/skills', A, 'skills/alpha/SKILL.md', {
    fetchImpl: async () => {
      calls++;
      return {ok: false, status: 429, headers: {get: () => null}};
    },
    sleep: async () => {},
  }), /rate limit/);
  assert.equal(calls, 1);
});

test('raw file download reads bytes and refuses empty responses', async () => {
  const makeResponse = bytes => ({
    ok: true, status: 200,
    headers: {get: () => null},
    body: new ReadableStream({start(controller) {
      if (bytes.length) controller.enqueue(new Uint8Array(bytes));
      controller.close();
    }}),
  });
  const result = await readRawSkill('demo/skills', A, 'SKILL.md', {
    fetchImpl: async () => makeResponse(Buffer.from('A skill\n')),
  });
  assert.deepEqual(result, Buffer.from('A skill\n'));
  await assert.rejects(() => readRawSkill('demo/skills', A, 'SKILL.md', {
    fetchImpl: async () => makeResponse(Buffer.alloc(0)),
  }), /Empty upstream/);
});

test('upstream git HEAD is validated without calling the GitHub API', async () => {
  const head = await remoteHead('demo/skills', {exec: async (name, args) => {
    assert.equal(name, 'git');
    assert.ok(args.includes('https://github.com/demo/skills.git'));
    return {stdout: B + '\tHEAD\n'};
  }});
  assert.equal(head, B);
  await assert.rejects(() => remoteHead('demo/skills', {
    exec: async () => ({stdout: 'invalid\tHEAD\n'}),
  }), /Invalid or missing/);
});
