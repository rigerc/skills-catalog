import test from 'node:test';
import assert from 'node:assert/strict';
import {
  changedSources, sourceCoordinates, rawSourceUrl, checkRawSource, checkChangedSources,
} from '../scripts/check-changed-skill-sources.mjs';

const A = 'a'.repeat(40);
const B = 'b'.repeat(40);
const make = (name, commit = A, repository = 'demo/repo') => ({
  id: repository + '/' + name,
  status: 'verified',
  commit,
  url: 'https://github.com/' + repository + '/blob/' + commit +
    '/skills/' + name + '/SKILL.md',
  checked_at: '2026-01-01',
});
const response = (body, status = 200) => new Response(body, {status});

test('only new, newly verified or repinned skills need a remote existence check', () => {
  const old = [make('alpha'), make('beta')];
  const current = [
    {...old[0], checked_at: '2026-11-01'}, make('beta', B),
    make('new'), {id: 'unresolved', status: 'unresolved', reason: 'Unknown'},
  ];
  assert.deepEqual(changedSources(current, old).map(e => e.id),
    ['demo/repo/beta', 'demo/repo/new']);
  assert.deepEqual(changedSources([make('alpha')], [
    {...make('alpha'), status: 'unresolved'},
  ]).map(e => e.id), ['demo/repo/alpha']);
  assert.deepEqual(changedSources([{
    ...old[0], url: make('beta').url,
  }], old).map(e => e.id), ['demo/repo/alpha']);
});

test('raw URL uses the exact immutable file location, not a REST endpoint', () => {
  assert.deepEqual(sourceCoordinates(make('alpha')), {
    repo: 'demo/repo', path: 'skills/alpha/SKILL.md',
  });
  assert.equal(rawSourceUrl(make('alpha')),
    'https://raw.githubusercontent.com/demo/repo/' + A + '/skills/alpha/SKILL.md');
  assert.match(rawSourceUrl(make('my-skill')), /^https:\/\/raw\.githubusercontent\.com/);
  assert.throws(() => rawSourceUrl({...make('alpha'),
    url: make('alpha').url.replace(A, 'main')}), /pinned GitHub SKILL.md/);
  assert.throws(() => rawSourceUrl({...make('alpha'),
    url: 'https://evil.example/' + A + '/SKILL.md'}));
});

test('reads a nonempty pinned SKILL.md without using GitHub REST', async () => {
  let calls = 0;
  const result = await checkRawSource(make('alpha'), {
    fetchImpl: async (url, options) => {
      calls++;
      assert.equal(url, rawSourceUrl(make('alpha')));
      assert.equal(options.redirect, 'manual');
      assert.equal(options.headers.Authorization, undefined);
      return response('---\nname: alpha\n---\n');
    },
  });
  assert.deepEqual(result, {id: 'demo/repo/alpha', status: 'verified', bytes: 20});
  assert.equal(calls, 1);
});

test('missing and empty files fail without false positives', async () => {
  for (const status of [404, 410]) {
    const result = await checkRawSource(make('alpha'), {
      fetchImpl: async () => response('Missing', status),
    });
    assert.equal(result.status, 'missing');
  }
  const empty = await checkRawSource(make('alpha'), {
    fetchImpl: async () => response(''),
  });
  assert.equal(empty.status, 'invalid');
  assert.match(empty.reason, /empty/);
});

test('refuses oversized files and never executes their content', async () => {
  const result = await checkRawSource(make('alpha'), {
    maxBytes: 4,
    fetchImpl: async () => response('0123456789'),
  });
  assert.equal(result.status, 'invalid');
  assert.match(result.reason, /size limit/);
});

test('deduplicates identical pinned URLs and retains skill-specific results', async () => {
  const copy = {...make('alpha'), id: 'alias/repo/alpha'};
  let calls = 0;
  const result = await checkChangedSources([make('alpha'), copy, make('beta')], {
    fetchImpl: async () => {
      calls++;
      return response('valid skill\n');
    },
  });
  assert.equal(result.rawRequests, 2);
  assert.equal(calls, 2);
  assert.equal(result.apiRequests, 0);
  assert.equal(result.uniqueSources, 2);
  assert.deepEqual(result.results.map(r => r.id),
    ['demo/repo/alpha', 'alias/repo/alpha', 'demo/repo/beta']);
  assert.ok(result.results.every(r => r.status === 'verified'));
});

test('catalog-only edits with no repinned sources cause no network calls', async () => {
  const result = await checkChangedSources([], {
    fetchImpl: async () => {throw Error('Network call was not expected');},
  });
  assert.equal(result.rawRequests, 0);
  assert.equal(result.apiRequests, 0);
  assert.deepEqual(result.results, []);
});

test('raw-host throttling stops dispatching remaining sources', async () => {
  let calls = 0;
  const result = await checkChangedSources([make('alpha'), make('beta'), make('gamma')], {
    concurrency: 1,
    fetchImpl: async () => {
      calls++;
      return response('Rate limit', 429);
    },
  });
  assert.equal(calls, 1);
  assert.equal(result.apiRequests, 0);
  assert.deepEqual(result.results.map(r => r.status), ['error', 'error', 'error']);
  assert.match(result.results[1].reason, /halted/);
});

test('retries transient server errors but not redirects or forbidden responses', async () => {
  let calls = 0;
  const success = await checkRawSource(make('alpha'), {
    sleep: async () => {},
    fetchImpl: async () => {
      calls++;
      return calls === 1 ? response('Unavailable', 503) : response('ok');
    },
  });
  assert.equal(success.status, 'verified');
  assert.equal(calls, 2);
  for (const status of [301, 403]) {
    const failed = await checkRawSource(make('alpha'), {
      fetchImpl: async () => response('Refused', status),
    });
    assert.equal(failed.status, 'error');
  }
});
