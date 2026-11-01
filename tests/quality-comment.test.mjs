import test from 'node:test';
import assert from 'node:assert/strict';
import {MARKER, formatComment, upsertComment} from '../scripts/post-quality-comment.mjs';
import {reportMarkdown} from '../scripts/quality.mjs';

const repo = 'rigerc/skills-catalog';
const sha = 'a'.repeat(40);

test('PR comment reports no work clearly and links to the workflow', () => {
  const comment = formatComment({targets: '0', repo, runId: '123', sha});
  assert.ok(comment.startsWith(MARKER));
  assert.match(comment, /No newly added or repinned/);
  assert.match(comment, /github.com\/rigerc\/skills-catalog\/actions\/runs\/123/);
  assert.match(comment, /aaaaaaaaaaaa/);
});

test('PR comment includes all verdicts including passing skills', () => {
  const entries = [
    {id: 'a/b/pass', status: 'pass', counts: {errors: 0, warnings: 0, infos: 0}, findings: []},
    {id: 'a/b/warn', status: 'warn', counts: {errors: 0, warnings: 1, infos: 0},
      findings: [{level: 'warning', message: 'Review frontmatter'}]},
    {id: 'a/b/fail', status: 'fail', counts: {errors: 1, warnings: 0, infos: 0},
      findings: [{level: 'error', message: 'Missing description'}]},
    {id: 'a/b/not-evaluated', status: 'not_evaluated',
      not_evaluated: {code: 'timeout', message: 'Deadline reached'}},
  ];
  const summary = reportMarkdown(entries, {includePassed: true});
  const comment = formatComment({report: summary, targets: '4', repo, runId: '123', sha});
  for (const id of entries.map(e => e.id)) assert.ok(comment.includes(id), id);
  for (const value of ['pass', 'warn', 'fail', 'not_evaluated', 'timeout']) assert.ok(comment.includes(value), value);
  assert.ok(comment.includes('Report-only validation'));
});

test('comment API creates only one marked bot comment', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({url, options});
    return {ok: true, json: async () => options.method === 'GET' ? [] : {id: 99}};
  };
  const body = formatComment({targets: '0', repo, runId: '123', sha});
  const result = await upsertComment({fetchImpl, token: 'fake', repo, number: 23, body});
  assert.deepEqual(result, {action: 'created', id: 99});
  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /issues\/23\/comments\?per_page=100&page=1$/);
  assert.equal(calls[1].options.method, 'POST');
  assert.equal(JSON.parse(calls[1].options.body).body, body);
});

test('comment API updates existing bot comment, ignores user comment with marker', async () => {
  const calls = [];
  const original = formatComment({targets: '0', repo, runId: '122', sha});
  const body = formatComment({targets: '0', repo, runId: '123', sha});
  const fetchImpl = async (url, options) => {
    calls.push({url, options});
    return {ok: true, json: async () => options.method === 'GET'
      ? [{id: 10, user: {login: 'ordinary-user'}, body},
        {id: 11, user: {login: 'github-actions[bot]'}, body: original}]
      : {id: 11}};
  };
  const result = await upsertComment({fetchImpl, token: 'fake', repo, number: 23, body});
  assert.deepEqual(result, {action: 'updated', id: 11});
  assert.equal(calls[1].options.method, 'PATCH');
  assert.match(calls[1].url, /issues\/comments\/11$/);
});

test('comment API does not create duplicate when content is unchanged', async () => {
  const body = formatComment({targets: '0', repo, runId: '123', sha});
  let requests = 0;
  const fetchImpl = async () => {
    requests++;
    return {ok: true, json: async () => [{id: 11, user: {login: 'github-actions[bot]'}, body}]};
  };
  const result = await upsertComment({fetchImpl, token: 'fake', repo, number: 23, body});
  assert.deepEqual(result, {action: 'unchanged', id: 11});
  assert.equal(requests, 1);
});

test('comment API propagates permission failures', async () => {
  const body = formatComment({targets: '0', repo, runId: '123', sha});
  const fetchImpl = async () => ({ok: false, status: 403, text: async () => 'Resource not accessible by integration'});
  await assert.rejects(upsertComment({fetchImpl, token: 'fake', repo, number: 23, body}), /HTTP 403/);
});
