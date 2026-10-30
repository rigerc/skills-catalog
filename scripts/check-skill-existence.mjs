#!/usr/bin/env node
/**
 * Verify that every catalog source marked "verified" is a real, nonempty
 * SKILL.md at its recorded immutable GitHub commit.
 *
 * Only GitHub's Contents API is contacted. No external code is executed.
 * Entries explicitly marked "unresolved" are reported, not passed as verified.
 */
import {readFileSync, appendFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SHA = /^[0-9a-f]{40}$/;
const OWNER_REPO = /^[A-Za-z0-9_.-]+$/;
const FILE_SEGMENT = /^[A-Za-z0-9._@+-]+$/;
const CONCURRENCY = 5;
const MAX_ATTEMPTS = 3;

export function parseVerifiedSource(entry) {
  if (!entry || entry.status !== 'verified' || !SHA.test(entry.commit ?? '')) {
    throw new Error('Expected a verified source with a 40-character commit SHA');
  }
  if (typeof entry.url !== 'string' || /[%\\\\]/.test(entry.url)) {
    throw new Error('Encoded or unsafe source URL: ' + entry.id);
  }
  let url;
  try { url = new URL(entry.url); }
  catch { throw new Error('Invalid source URL for ' + entry.id); }
  if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.port ||
      url.username || url.password || url.search || url.hash) {
    throw new Error('Unsupported or credential-bearing source URL: ' + entry.id);
  }
  const parts = url.pathname.split('/').slice(1);
  if (parts.length < 5 || !OWNER_REPO.test(parts[0]) ||
      !OWNER_REPO.test(parts[1]) || parts[2] !== 'blob' ||
      parts[3] !== entry.commit || parts.at(-1) !== 'SKILL.md' ||
      !parts.slice(4).every(x => FILE_SEGMENT.test(x) && x !== '.' && x !== '..')) {
    throw new Error('Source must point to a pinned GitHub SKILL.md: ' + entry.id);
  }
  const [owner, repo] = parts;
  const filepath = parts.slice(4).map(encodeURIComponent).join('/');
  return {
    id: entry.id,
    apiUrl: 'https://api.github.com/repos/' + encodeURIComponent(owner) +
      '/' + encodeURIComponent(repo) + '/contents/' + filepath +
      '?ref=' + entry.commit,
  };
}

const wait = ms => new Promise(done => setTimeout(done, ms));

/** Throw on unavailability/rate limits; only 404/410 establish a missing file. */
export async function checkSource(entry, options = {}) {
  const {apiUrl, id} = parseVerifiedSource(entry);
  const request = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? wait;
  const attempts = options.attempts ?? MAX_ATTEMPTS;
  const token = options.token ?? '';
  const headers = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'nosey-skills-catalog-source-check',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(token ? {'Authorization': 'Bearer ' + token} : {}),
  };
  for (let attempt = 1; attempt <= attempts; attempt++) {
    let response;
    try {
      const options = {headers, redirect: 'manual', signal: AbortSignal.timeout(20000)};
      response = await request(apiUrl, options);
      if ([301, 302, 307, 308].includes(response.status)) {
        // GitHub's Contents API redirects renamed repositories to /repositories/<id>.
        // Follow only that same-host, same-commit, same-file canonicalization.
        const location = response.headers?.get?.('location');
        const target = new URL(location ?? '', apiUrl);
        const original = new URL(apiUrl);
        const originalFilePath = original.pathname.split('/contents/')[1];
        const targetFilePath = target.pathname.split('/contents/')[1];
        if (target.origin !== 'https://api.github.com' ||
            !/^\/repositories\/[0-9]+\/contents\//.test(target.pathname) ||
            targetFilePath !== originalFilePath || target.search !== original.search ||
            target.hash || target.username || target.password) {
          return {id, status: 'error', reason: 'Unexpected GitHub API redirect'};
        }
        response = await request(target.href, {...options, redirect: 'error'});
      }
    } catch (error) {
      if (attempt < attempts) { await sleep(attempt * 1000); continue; }
      return {id, status: 'error', reason: 'Network error: ' + String(error.message ?? error)};
    }
    if (response.status === 404 || response.status === 410) {
      return {id, status: 'missing', reason: 'Upstream returned HTTP ' + response.status};
    }
    if (response.ok) {
      let metadata;
      try { metadata = await response.json(); }
      catch {
        return {id, status: 'error', reason: 'Upstream did not return GitHub file metadata'};
      }
      if (!metadata || Array.isArray(metadata) || metadata.type !== 'file' ||
          metadata.name !== 'SKILL.md' || !Number.isSafeInteger(metadata.size) ||
          metadata.size <= 0) {
        return {id, status: 'invalid', reason: 'Path is not a nonempty, regular SKILL.md file'};
      }
      return {id, status: 'verified', bytes: metadata.size};
    }
    const remaining = response.headers?.get?.('x-ratelimit-remaining');
    const isTransient = [429, 500, 502, 503, 504].includes(response.status) ||
      (response.status === 403 && remaining === '0');
    if (isTransient && attempt < attempts) {
      const retryAfter = Number(response.headers?.get?.('retry-after'));
      const pause = Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, 30000)
        : attempt * 1000;
      await sleep(pause);
      continue;
    }
    return {id, status: 'error', reason: 'GitHub API returned HTTP ' + response.status +
      (remaining === '0' ? ' (rate limit exhausted)' : '')};
  }
  throw new Error('Unreachable source-check state');
}

export async function checkEntries(entries, options = {}) {
  const verified = entries.filter(e => e.status === 'verified');
  const unresolved = entries.filter(e => e.status === 'unresolved');
  const results = new Array(verified.length);
  let next = 0;
  async function worker() {
    while (next < verified.length) {
      const index = next++;
      try { results[index] = await checkSource(verified[index], options); }
      catch (error) {
        results[index] = {id: verified[index].id, status: 'error', reason: error.message};
      }
    }
  }
  await Promise.all(Array.from({length: Math.min(options.concurrency ?? CONCURRENCY, verified.length)},
    () => worker()));
  return {results, unresolved};
}

export function formatReport({results, unresolved}) {
  const counts = {verified: 0, missing: 0, invalid: 0, error: 0, unresolved: unresolved.length};
  for (const entry of results) counts[entry.status]++;
  const failures = results.filter(x => x.status !== 'verified');
  const lines = [
    '# Upstream SKILL.md existence check',
    '',
    '- Pinned source files confirmed: **' + counts.verified + '**',
    '- Missing files: **' + counts.missing + '**',
    '- Empty/invalid files: **' + counts.invalid + '**',
    '- API/network errors: **' + counts.error + '**',
    '- Previously unresolved (not checked): **' + counts.unresolved + '**',
    '',
  ];
  if (failures.length) {
    lines.push('## Failed checks', '', '| Skill ID | Problem |', '| --- | --- |');
    for (const x of failures) {
      const clean = value => String(value).replace(/[|\r\n]/g, ' ').replace(/</g, '&lt;');
      lines.push('| ' + clean(x.id) + ' | ' + clean(x.reason) + ' |');
    }
    lines.push('');
  }
  if (unresolved.length) {
    lines.push('## Sources requiring manual verification', '', 
      'These entries were already marked unresolved in the catalog. They are not counted as verified.',
      '', '| Skill ID | Reason |', '| --- | --- |');
    for (const x of unresolved) {
      const clean = value => String(value).replace(/[|\r\n]/g, ' ').replace(/</g, '&lt;');
      lines.push('| ' + clean(x.id) + ' | ' + clean(x.reason) + ' |');
    }
    lines.push('');
  }
  return {counts, failures, markdown: lines.join('\n') + '\n'};
}

async function main(args) {
  const useId = args.length === 2 && args[0] === '--id' && args[1];
  if (args.length !== 0 && !useId) {
    console.error('Usage: node scripts/check-skill-existence.mjs [--id <canonical-skill-id>]');
    process.exitCode = 2;
    return;
  }
  const ledger = JSON.parse(readFileSync(resolve(ROOT, 'data/catalog-source-ledger.json'), 'utf8'));
  const catalog = JSON.parse(readFileSync(resolve(ROOT, 'data/catalog.json'), 'utf8'));
  if (ledger.schema_version !== 1 || !Array.isArray(ledger.entries) ||
      !Array.isArray(catalog.skills)) throw new Error('Invalid catalog or source ledger');
  const ids = new Set(catalog.skills.map(skill => skill.id));
  if (ledger.entries.length !== ids.size ||
      ledger.entries.some(entry => !ids.has(entry.id))) {
    throw new Error('Source ledger does not match catalog skills; run catalog validation');
  }
  if (useId && !ids.has(args[1])) throw new Error('Unknown canonical skill ID: ' + args[1]);
  const entries = useId ? ledger.entries.filter(e => e.id === args[1]) : ledger.entries;
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
  if (!token && !useId) {
    throw new Error('A GITHUB_TOKEN is required for full-catalog verification (GitHub API rate limits)');
  }
  const report = formatReport(await checkEntries(entries, {token}));
  console.log('Source verification: ' + JSON.stringify(report.counts));
  for (const failed of report.failures) {
    console.error(failed.id + ': ' + failed.status + ' - ' + failed.reason);
  }
  for (const entry of entries.filter(e => e.status === 'unresolved')) {
    console.warn('UNRESOLVED ' + entry.id + ': ' + entry.reason);
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, report.markdown);
  }
  if (report.failures.length) process.exitCode = 1;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
