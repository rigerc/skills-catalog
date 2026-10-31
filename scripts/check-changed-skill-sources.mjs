#!/usr/bin/env node
/** Verify only changed source identities, batching files by repository and commit. */
import {readFileSync, appendFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseVerifiedSource, formatReport} from './check-skill-existence.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SHA = /^[a-f0-9]{40}$/;
const sleep = ms => new Promise(done => setTimeout(done, ms));

export function changedSources(current, previous) {
  const old = new Map(previous.map(e => [e.id, e]));
  return current.filter(e => e.status === 'verified' && (
    !old.has(e.id) || old.get(e.id).status !== 'verified' ||
    old.get(e.id).commit !== e.commit || old.get(e.id).url !== e.url
  ));
}

export function sourceCoordinates(entry) {
  const apiUrl = parseVerifiedSource(entry).apiUrl;
  const match = new URL(apiUrl).pathname.match(/^\/repos\/([^/]+)\/([^/]+)\/contents\/(.+)$/);
  if (!match) throw Error('Invalid source location for ' + entry.id);
  return {repo: match[1] + '/' + match[2], path: match[3].split('/').map(decodeURIComponent).join('/')};
}

/** Metadata only. Never downloads or runs upstream skill content. */
export async function apiJson(url, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const delay = options.sleep ?? sleep;
  const token = options.token ?? '';
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'nosey-catalog-batched-source-check',
    ...(token ? {Authorization: 'Bearer ' + token} : {}),
  };
  for (let attempt = 1; attempt <= 3; attempt++) {
    let response;
    try {
      response = await fetchImpl(url, {headers, redirect: 'manual', signal: AbortSignal.timeout(20000)});
      if ([301, 302, 307, 308].includes(response.status)) {
        const target = new URL(response.headers?.get('location') ?? '', url);
        const original = new URL(url);
        const suffix = original.pathname.split('/git/')[1];
        if (target.origin !== 'https://api.github.com' || target.username || target.password ||
          target.hash || target.search !== original.search || !suffix ||
          !/^\/repositories\/[0-9]+\/git\//.test(target.pathname) ||
          target.pathname.split('/git/')[1] !== suffix) {
          throw new Error('Unexpected GitHub API redirect');
        }
        response = await fetchImpl(target.href, {headers, redirect: 'error', signal: AbortSignal.timeout(20000)});
      }
    } catch (error) {
      if (attempt < 3 && !/Unexpected GitHub API redirect/.test(error.message)) {
        await delay(attempt * 1000);
        continue;
      }
      throw error;
    }
    if (response.ok) return response.json();
    if (response.headers?.get('x-ratelimit-remaining') === '0') {
      throw new Error('GitHub API rate limit exhausted; aborting without more requests');
    }
    if (attempt < 3 && [429, 500, 502, 503, 504].includes(response.status)) {
      await delay(attempt * 1000);
      continue;
    }
    throw new Error('GitHub API HTTP ' + response.status + ': ' + url);
  }
  throw new Error('Unreachable API state');
}

export async function checkChangedSources(entries, options = {}) {
  const request = options.request ?? (url => apiJson(url, options));
  const concurrency = options.concurrency ?? 2;
  const groups = new Map();
  for (const entry of entries) {
    const {repo, path} = sourceCoordinates(entry);
    const key = repo.toLowerCase() + '@' + entry.commit;
    if (!groups.has(key)) groups.set(key, {repo, commit: entry.commit, items: []});
    groups.get(key).items.push({entry, path});
  }
  const tasks = [...groups.values()];
  const results = new Array(entries.length);
  const indexes = new Map(entries.map((entry, i) => [entry.id, i]));
  let next = 0;
  let calls = 0;
  const trackedRequest = async url => {calls++; return request(url);};
  async function verifyGroup(group) {
    const base = 'https://api.github.com/repos/' + group.repo;
    const commit = await trackedRequest(base + '/git/commits/' + group.commit);
    if (!SHA.test(commit?.tree?.sha ?? '')) throw Error('Invalid upstream tree SHA');
    const rootSha = commit.tree.sha;
    const recursive = await trackedRequest(base + '/git/trees/' + rootSha + '?recursive=1');
    if (!Array.isArray(recursive?.tree) || typeof recursive.truncated !== 'boolean') {
      throw Error('Invalid Git tree response');
    }
    const direct = recursive.truncated ? null : new Map(recursive.tree.map(item => [item.path, item]));
    const cache = new Map();
    async function lookupPath(path) {
      if (direct) return direct.get(path);
      // A truncated recursive response cannot establish absence; traverse exact directories instead.
      let sha = rootSha;
      const segments = path.split('/');
      for (let i = 0; i < segments.length; i++) {
        if (!cache.has(sha)) {
          const t = await trackedRequest(base + '/git/trees/' + sha);
          if (t.truncated !== false || !Array.isArray(t.tree)) {
            throw Error('Truncated or invalid non-recursive Git tree');
          }
          cache.set(sha, new Map(t.tree.map(item => [item.path, item])));
        }
        const item = cache.get(sha).get(segments[i]);
        if (i === segments.length - 1) return item;
        if (!item || item.type !== 'tree' || !SHA.test(item.sha ?? '')) return undefined;
        sha = item.sha;
      }
    }
    for (const {entry, path} of group.items) {
      const node = await lookupPath(path);
      const status = !node ? 'missing' : node.type !== 'blob' || node.path.split('/').at(-1) !== 'SKILL.md' ||
        !Number.isSafeInteger(node.size) || node.size <= 0 ? 'invalid' : 'verified';
      const reason = status === 'missing' ? 'Pinned SKILL.md not found in Git tree' :
        status === 'invalid' ? 'Pinned path is not a nonempty SKILL.md blob' : undefined;
      results[indexes.get(entry.id)] = {id: entry.id, status, ...(reason ? {reason} : {bytes: node.size})};
    }
  }
  async function worker() {
    while (next < tasks.length) {
      const group = tasks[next++];
      try {await verifyGroup(group);}
      catch (error) {
        for (const {entry} of group.items) {
          results[indexes.get(entry.id)] = {id: entry.id, status: 'error', reason: error.message};
        }
        if (/rate limit exhausted/i.test(error.message)) return;
      }
    }
  }
  await Promise.all(Array.from({length: Math.min(concurrency, tasks.length)}, () => worker()));
  // A rate limit failure leaves any unfinished groups marked as errors, not silently verified.
  for (const [i, entry] of entries.entries()) {
    results[i] ??= {id: entry.id, status: 'error', reason: 'Verification stopped before checking source'};
  }
  return {results, requests: calls, groups: tasks.length};
}

function previousEntries(revision) {
  if (!SHA.test(revision)) throw Error('Baseline must be a full Git commit SHA');
  const data = execFileSync('git', ['show', revision + ':data/catalog-source-ledger.json'],
    {cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024});
  const ledger = JSON.parse(data);
  if (!Array.isArray(ledger.entries)) throw Error('Invalid baseline source ledger');
  return ledger.entries;
}

async function main(args) {
  if (args.length !== 2 || args[0] !== '--base') {
    throw Error('Usage: node scripts/check-changed-skill-sources.mjs --base <40-character Git SHA>');
  }
  const catalog = JSON.parse(readFileSync(resolve(ROOT, 'data/catalog.json'), 'utf8'));
  const ledger = JSON.parse(readFileSync(resolve(ROOT, 'data/catalog-source-ledger.json'), 'utf8'));
  if (!Array.isArray(catalog.skills) || !Array.isArray(ledger.entries)) throw Error('Invalid catalog snapshot');
  const catalogIds = new Set(catalog.skills.map(s => s.id));
  if (catalogIds.size !== ledger.entries.length || ledger.entries.some(e => !catalogIds.has(e.id))) {
    throw Error('Catalog and source ledger entries do not match');
  }
  const changed = changedSources(ledger.entries, previousEntries(args[1]));
  const unresolved = ledger.entries.filter(e => e.status === 'unresolved');
  const token = process.env.GITHUB_TOKEN || '';
  if (changed.length && !token) throw Error('GITHUB_TOKEN is required for upstream checks');
  const {results, requests, groups} = await checkChangedSources(changed, {token});
  const report = formatReport({results, unresolved});
  const summary = 'Changed source pins checked: ' + changed.length + ' / ' + ledger.entries.length +
    '; upstream API requests: ' + requests + '; repository/commit groups: ' + groups;
  console.log(summary);
  console.log('Source verification: ' + JSON.stringify(report.counts));
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + '\n\n' + report.markdown);
  }
  for (const failed of report.failures) console.error(failed.id + ': ' + failed.status + ' - ' + failed.reason);
  if (report.failures.length) process.exitCode = 1;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => {console.error(error.message); process.exitCode = 1;});
}
