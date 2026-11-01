#!/usr/bin/env node
/**
 * Post or update one skill-quality report comment on a same-repository PR.
 * Uses only GitHub's Issues comment API; never modifies the quality index.
 */
import {readFileSync, existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export const MARKER = '<!-- skills-catalog:quality-gate-report -->';

export function formatComment({report = '', targets = '0', repo, runId, sha}) {
  const body = String(report).trim() || (Number(targets) === 0
    ? 'No newly added or repinned **verified** skills in this PR; no upstream quality validation was needed.'
    : 'Quality validation did not produce a report. Inspect the linked workflow run for the failure.');
  const runLink = 'https://github.com/' + repo + '/actions/runs/' + runId;
  const commit = /^[0-9a-f]{40}$/.test(sha ?? '') ? sha.slice(0, 12) : 'unknown';
  return MARKER + '\n' +
    '## Skill quality gate\n\n' +
    body + '\n\n' +
    'Checked commit: \x60' + commit + '\x60 · [Workflow run](' + runLink + ')\n\n' +
    '_Report-only validation. These findings are not a security, licensing, or availability audit. ' +
    'This check does not modify the quality index._\n';
}

async function api(fetchImpl, url, token, method = 'GET', payload) {
  const response = await fetchImpl(url, {
    method,
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'skills-catalog-quality-report',
      ...(payload ? {'Content-Type': 'application/json'} : {}),
    },
    ...(payload ? {body: JSON.stringify(payload)} : {}),
  });
  if (!response.ok) throw new Error('GitHub comment API ' + method + ' failed: HTTP ' + response.status +
    ' ' + (await response.text()).slice(0, 400));
  return response.json();
}

export async function upsertComment({fetchImpl = fetch, token, repo, number, body,
  apiUrl = 'https://api.github.com'}) {
  if (!token || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo) ||
      !Number.isSafeInteger(Number(number)) || Number(number) < 1 ||
      !body.startsWith(MARKER)) throw new Error('Invalid quality-comment arguments');
  const root = apiUrl.replace(/\/$/, '') + '/repos/' + repo;
  let found;
  // Comments are oldest first; search successive pages so reruns update one bot comment.
  for (let page = 1; page <= 20; page++) {
    const comments = await api(fetchImpl, root + '/issues/' + number + '/comments?per_page=100&page=' + page, token);
    if (!Array.isArray(comments)) throw new Error('Unexpected GitHub comments response');
    found = comments.find(comment => comment.user?.login === 'github-actions[bot]' &&
      typeof comment.body === 'string' && comment.body.startsWith(MARKER));
    if (found || comments.length < 100) break;
  }
  if (found) {
    if (found.body === body) return {action: 'unchanged', id: found.id};
    const updated = await api(fetchImpl, root + '/issues/comments/' + found.id, token, 'PATCH', {body});
    return {action: 'updated', id: updated.id};
  }
  const created = await api(fetchImpl, root + '/issues/' + number + '/comments', token, 'POST', {body});
  return {action: 'created', id: created.id};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const env = process.env;
  const report = env.QUALITY_PR_REPORT_FILE && existsSync(env.QUALITY_PR_REPORT_FILE)
    ? readFileSync(env.QUALITY_PR_REPORT_FILE, 'utf8') : '';
  const body = formatComment({
    report, targets: env.QUALITY_TARGETS, repo: env.GITHUB_REPOSITORY,
    runId: env.GITHUB_RUN_ID, sha: env.QUALITY_HEAD_SHA || env.GITHUB_SHA,
  });
  upsertComment({
    token: env.GITHUB_TOKEN, repo: env.GITHUB_REPOSITORY,
    number: Number(env.PR_NUMBER), body, apiUrl: env.GITHUB_API_URL,
  }).then(result => console.log('Quality PR comment: ' + result.action + ' (#' + result.id + ')'))
    .catch(error => {console.error(error.message); process.exitCode = 1;});
}
