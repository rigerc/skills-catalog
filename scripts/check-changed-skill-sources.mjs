#!/usr/bin/env node
/**
 * Check only added/repinned upstream SKILL.md files without consuming GitHub
 * REST/GraphQL API quota. The catalog already pins the exact commit and path.
 */
import {readFileSync, appendFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseVerifiedSource, formatReport} from './check-skill-existence.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SHA = /^[a-f0-9]{40}$/;
const MAX_BYTES = 8 * 1024 * 1024;
const pause = ms => new Promise(done => setTimeout(done, ms));

export function changedSources(current, previous) {
  const old = new Map(previous.map(e => [e.id, e]));
  return current.filter(e => e.status === 'verified' && (
    !old.has(e.id) || old.get(e.id).status !== 'verified' ||
    old.get(e.id).commit !== e.commit || old.get(e.id).url !== e.url
  ));
}

/** Keep parsing rules in sync with the original strict pinned-source checker. */
export function sourceCoordinates(entry) {
  const {apiUrl} = parseVerifiedSource(entry);
  const match = new URL(apiUrl).pathname.match(/^\/repos\/([^/]+)\/([^/]+)\/contents\/(.+)$/);
  if (!match) throw new Error('Invalid source location: ' + entry.id);
  return {
    repo: match[1] + '/' + match[2],
    path: match[3].split('/').map(decodeURIComponent).join('/'),
  };
}

export function rawSourceUrl(entry) {
  const {repo, path} = sourceCoordinates(entry);
  return 'https://raw.githubusercontent.com/' + repo + '/' + entry.commit + '/' +
    path.split('/').map(encodeURIComponent).join('/');
}

/** Only reads a bounded stream of raw file bytes; does not execute source code. */
export async function checkRawSource(entry, {
  fetchImpl = fetch, sleep = pause, maxBytes = MAX_BYTES,
} = {}) {
  const url = rawSourceUrl(entry);
  for (let attempt = 1; attempt <= 2; attempt++) {
    let response;
    try {
      response = await fetchImpl(url, {
        redirect: 'manual', signal: AbortSignal.timeout(25000),
        headers: {'User-Agent': 'nosey-skills-catalog-existence-check'},
      });
    } catch (error) {
      if (attempt < 2) {await sleep(1000); continue;}
      return {id: entry.id, status: 'error',
        reason: 'Raw source network error: ' + String(error.message ?? error)};
    }
    if ([404, 410].includes(response.status)) {
      return {id: entry.id, status: 'missing', reason: 'Pinned SKILL.md returned HTTP ' + response.status};
    }
    if ([403, 429].includes(response.status)) {
      return {id: entry.id, status: 'error', throttled: true,
        reason: 'Raw host HTTP ' + response.status + ' (access denied or throttled; stop checking)'};
    }
    if (response.status !== 200 || !response.ok) {
      if (attempt < 2 && [500, 502, 503, 504].includes(response.status)) {
        await sleep(1000);
        continue;
      }
      return {id: entry.id, status: 'error',
        reason: 'Raw host returned HTTP ' + response.status};
    }
    const sizeHeader = response.headers?.get?.('content-length');
    if (sizeHeader !== null && sizeHeader !== undefined &&
        Number.isFinite(Number(sizeHeader)) && Number(sizeHeader) > maxBytes) {
      return {id: entry.id, status: 'invalid', reason: 'Pinned SKILL.md exceeds size limit'};
    }
    if (!response.body?.getReader) {
      return {id: entry.id, status: 'error', reason: 'Raw response body is not readable'};
    }
    const reader = response.body.getReader();
    let size = 0;
    try {
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) {
          await reader.cancel();
          return {id: entry.id, status: 'invalid', reason: 'Pinned SKILL.md exceeds size limit'};
        }
      }
    } catch (error) {
      return {id: entry.id, status: 'error',
        reason: 'Raw source stream failed: ' + String(error.message ?? error)};
    } finally {
      reader.releaseLock();
    }
    return size === 0
      ? {id: entry.id, status: 'invalid', reason: 'Pinned SKILL.md is empty'}
      : {id: entry.id, status: 'verified', bytes: size};
  }
  throw new Error('Unreachable raw source check');
}

/** Deduplicate identical pinned sources, and stop dispatching on throttling. */
export async function checkChangedSources(entries, {
  fetchImpl = fetch, sleep = pause, concurrency = 2,
} = {}) {
  const tasks = new Map();
  const results = new Array(entries.length);
  for (const [index, entry] of entries.entries()) {
    const url = rawSourceUrl(entry); // Fail unsafe or unpinned URLs before network access.
    if (!tasks.has(url)) tasks.set(url, {entry, indexes: []});
    tasks.get(url).indexes.push(index);
  }
  const queue = [...tasks.values()];
  let next = 0;
  let requests = 0;
  let throttled = false;
  const countedFetch = (...args) => {
    requests++;
    return fetchImpl(...args);
  };
  async function worker() {
    while (!throttled && next < queue.length) {
      const {entry, indexes} = queue[next++];
      const result = await checkRawSource(entry, {fetchImpl: countedFetch, sleep});
      if (result.throttled) throttled = true;
      for (const i of indexes) {
        results[i] = {...result, id: entries[i].id};
        delete results[i].throttled;
      }
    }
  }
  await Promise.all(Array.from({length: Math.min(concurrency, queue.length)}, () => worker()));
  for (const [i, entry] of entries.entries()) {
    results[i] ??= {id: entry.id, status: 'error', reason: 'Verification halted by raw host throttling'};
  }
  return {results, rawRequests: requests, apiRequests: 0, uniqueSources: queue.length};
}

function previousEntries(revision) {
  if (!SHA.test(revision)) throw new Error('Baseline must be a full Git commit SHA');
  const data = execFileSync('git', ['show', revision + ':data/catalog-source-ledger.json'],
    {cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024});
  const ledger = JSON.parse(data);
  if (!Array.isArray(ledger.entries)) throw new Error('Invalid baseline source ledger');
  return ledger.entries;
}

async function main(args) {
  if (args.length !== 2 || args[0] !== '--base') {
    throw new Error('Usage: node scripts/check-changed-skill-sources.mjs --base <40-character Git SHA>');
  }
  const catalog = JSON.parse(readFileSync(resolve(ROOT, 'data/catalog.json'), 'utf8'));
  const ledger = JSON.parse(readFileSync(resolve(ROOT, 'data/catalog-source-ledger.json'), 'utf8'));
  if (!Array.isArray(catalog.skills) || !Array.isArray(ledger.entries)) {
    throw new Error('Invalid catalog snapshot');
  }
  const ids = new Set(catalog.skills.map(s => s.id));
  if (ids.size !== ledger.entries.length || ledger.entries.some(e => !ids.has(e.id))) {
    throw new Error('Catalog and source ledger entries do not match');
  }
  const changed = changedSources(ledger.entries, previousEntries(args[1]));
  const unresolved = ledger.entries.filter(e => e.status === 'unresolved');
  const {results, rawRequests, apiRequests, uniqueSources} = await checkChangedSources(changed);
  const report = formatReport({results, unresolved});
  const summary = 'Changed source pins checked: ' + changed.length + ' / ' + ledger.entries.length +
    '; raw file requests: ' + rawRequests + '; GitHub REST API requests: ' + apiRequests +
    '; distinct pinned sources: ' + uniqueSources;
  console.log(summary);
  console.log('Source verification: ' + JSON.stringify(report.counts));
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + '\n\n' + report.markdown);
  }
  for (const failure of report.failures) {
    console.error(failure.id + ': ' + failure.status + ' - ' + failure.reason);
  }
  if (report.failures.length) process.exitCode = 1;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => {console.error(error.message); process.exitCode = 1;});
}
