import test from 'node:test';
import assert from 'node:assert/strict';
import {checkSource, parseVerifiedSource, checkEntries, formatReport} from '../scripts/check-skill-existence.mjs';

const good = {
  id: 'sample/skills/my-skill', status: 'verified',
  commit: 'a'.repeat(40),
  url: 'https://github.com/sample/skills/blob/' + 'a'.repeat(40) + '/skills/my-skill/SKILL.md',
};
const fake = (status, body = {}, headers = {}) => async () => ({
  status, ok: status >= 200 && status < 300,
  json: async () => body,
  headers: {get: name => headers[name] ?? null},
});

test('parses only exact, commit-pinned GitHub skill documents', () => {
  const result = parseVerifiedSource(good);
  assert.equal(result.apiUrl,
    'https://api.github.com/repos/sample/skills/contents/skills/my-skill/SKILL.md?ref=' + good.commit);
  assert.equal(parseVerifiedSource({
    ...good, url: 'https://github.com/sample/skills/blob/' + good.commit + '/SKILL.md',
  }).apiUrl, 'https://api.github.com/repos/sample/skills/contents/SKILL.md?ref=' + good.commit);
  for (const url of [
    good.url.replace('github.com', 'evil.example'),
    good.url.replace('https:', 'http:'),
    good.url.replace(good.commit, 'main'),
    good.url.replace('/SKILL.md', '/README.md'),
    good.url + '?token=secret',
    good.url.replace('/skills/my-skill/', '/skills/%2e%2e/'),
  ]) assert.throws(() => parseVerifiedSource({...good, url}));
});

test('accepts safe literal parentheses in pinned source directories', () => {
  const url = 'https://github.com/eduardo-sl/go-agent-skills/blob/' + good.commit +
    '/skills/(architecture)/go-api-design/SKILL.md';
  const parsed = parseVerifiedSource({...good, id: 'go-api-design', url});
  assert.equal(parsed.apiUrl,
    'https://api.github.com/repos/eduardo-sl/go-agent-skills/contents/' +
    'skills/(architecture)/go-api-design/SKILL.md?ref=' + good.commit);
  for (const bad of [
    url.replace('(architecture)', '%28architecture%29'),
    url.replace('(architecture)', '..'),
    url.replace('(architecture)', '<script>'),
  ]) assert.throws(() => parseVerifiedSource({...good, url: bad}));
});

test('accepts a regular nonempty SKILL.md', async () => {
  let requested;
  const result = await checkSource(good, {
    fetchImpl: async (url, init) => {
      requested = {url, init};
      return fake(200, {type: 'file', name: 'SKILL.md', size: 64})();
    },
    token: 'token-not-logged',
  });
  assert.equal(result.status, 'verified');
  assert.equal(result.bytes, 64);
  assert.match(requested.url, /api.github.com/);
  assert.equal(requested.init.headers.Authorization, 'Bearer token-not-logged');
});

test('rejects missing, zero-byte, directory, and inaccessible sources', async () => {
  assert.equal((await checkSource(good, {fetchImpl: fake(404)})).status, 'missing');
  assert.equal((await checkSource(good, {fetchImpl: fake(200,
    {type: 'file', name: 'SKILL.md', size: 0})})).status, 'invalid');
  assert.equal((await checkSource(good, {fetchImpl: fake(200, [])})).status, 'invalid');
  const forbidden = await checkSource(good, {fetchImpl: fake(403)});
  assert.equal(forbidden.status, 'error');
  assert.doesNotMatch(forbidden.reason, /missing/i);
});

test('allows GitHub same-file redirects for renamed repositories only', async () => {
  const calls = [];
  const target = 'https://api.github.com/repositories/123456/contents/skills/my-skill/SKILL.md?ref=' + good.commit;
  const result = await checkSource(good, {
    fetchImpl: async (url) => {
      calls.push(url);
      if (calls.length === 1) return fake(301, {}, {location: target})();
      return fake(200, {type: 'file', name: 'SKILL.md', size: 1})();
    },
  });
  assert.equal(result.status, 'verified');
  assert.equal(calls.length, 2);
  assert.equal(calls[1], target);
  const unsafe = await checkSource(good, {
    fetchImpl: fake(301, {}, {location: 'https://attacker.example/steal'}),
  });
  assert.equal(unsafe.status, 'error');
  assert.match(unsafe.reason, /Unexpected GitHub API redirect/);
});

test('retries transient responses before succeeding', async () => {
  let calls = 0;
  const result = await checkSource(good, {
    fetchImpl: async () => {
      calls++;
      return calls === 1 ? fake(503)() : fake(200,
        {type: 'file', name: 'SKILL.md', size: 10})();
    },
    sleep: async () => {},
  });
  assert.equal(result.status, 'verified');
  assert.equal(calls, 2);
});

test('all verified entries are checked; unresolved entries are reported separately', async () => {
  const another = {...good, id: 'sample/skills/other'};
  const unknown = {id: 'other/skills/todo', status: 'unresolved', reason: 'Needs review'};
  let hits = 0;
  const report = await checkEntries([good, another, unknown], {
    fetchImpl: async () => {
      hits++;
      return fake(200, {type: 'file', name: 'SKILL.md', size: 22})();
    },
    concurrency: 2,
  });
  assert.equal(hits, 2);
  assert.equal(report.unresolved.length, 1);
  const summary = formatReport(report);
  assert.equal(summary.counts.verified, 2);
  assert.equal(summary.counts.unresolved, 1);
  assert.match(summary.markdown, /Previously unresolved/);
});
