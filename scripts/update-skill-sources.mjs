#!/usr/bin/env node
/** Propose reviewed updates to verified, commit-pinned upstream SKILL.md files. */
import {appendFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {load, render, validate} from './catalog.mjs';
import {parseVerifiedSource} from './check-skill-existence.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SHA = /^[a-f0-9]{40}$/;
const pause = ms => new Promise(done => setTimeout(done, ms));

/** Read-only, bounded GitHub API client; never follow redirects off api.github.com. */
export async function githubJson(url, {token = '', fetchImpl = fetch, sleep = pause} = {}) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'nosey-skills-catalog-updater',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(token ? {Authorization: 'Bearer ' + token} : {}),
  };
  for (let attempt = 1; attempt <= 4; attempt++) {
    let currentUrl = url;
    let response;
    try {
      for (let redirects = 0; redirects < 3; redirects++) {
        const target = new URL(currentUrl);
        if (target.origin !== 'https://api.github.com' || target.username || target.password) {
          throw new Error('Unsafe GitHub API URL');
        }
        response = await fetchImpl(target.href, {
          headers, redirect: 'manual', signal: AbortSignal.timeout(25000),
        });
        if (![301, 302, 307, 308].includes(response.status)) break;
        const location = response.headers?.get('location');
        if (!location) throw new Error('GitHub API redirect without Location');
        currentUrl = new URL(location, target).href;
        response = undefined;
      }
      if (!response) throw new Error('Too many GitHub API redirects');
    } catch (error) {
      if (attempt < 4 && !/Unsafe|redirect/i.test(error.message)) {
        await sleep(attempt * 1000);
        continue;
      }
      throw error;
    }
    if (response.ok) return response.json();
    const remaining = response.headers?.get('x-ratelimit-remaining');
    const retryable = [429, 500, 502, 503, 504].includes(response.status) ||
      (response.status === 403 && remaining === '0');
    if (retryable && attempt < 4) {
      const retryAfter = Number(response.headers?.get('retry-after'));
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, 30000) : attempt * 1000);
      continue;
    }
    throw new Error('GitHub API HTTP ' + response.status + ' for ' + url +
      (remaining === '0' ? ' (rate limit exhausted)' : ''));
  }
  throw new Error('GitHub API retries exhausted');
}

/** Resolve the precise file location from a previously verified source. */
export function sourceLocation(entry) {
  const {apiUrl} = parseVerifiedSource(entry);
  const match = new URL(apiUrl).pathname.match(/^\/repos\/([^/]+)\/([^/]+)\/contents\/(.+)$/);
  if (!match) throw new Error('Invalid source API path: ' + entry.id);
  return {repo: match[1] + '/' + match[2], path: match[3]};
}


const runCommand = promisify(execFile);
const MAX_SKILL_BYTES = 8 * 1024 * 1024;
const REPOSITORY = /^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i;

export async function remoteHead(repo, {exec = runCommand} = {}) {
  if (!REPOSITORY.test(repo)) throw new Error('Invalid upstream repository: ' + repo);
  const {stdout} = await exec('git', ['ls-remote', '--exit-code',
    'https://github.com/' + repo + '.git', 'HEAD'], {
    timeout: 45000, maxBuffer: 8192,
    env: {...process.env, GIT_TERMINAL_PROMPT: '0'},
  });
  const match = stdout.trim().match(/^([0-9a-f]{40})\s+HEAD$/);
  if (!match) throw new Error('Invalid or missing upstream HEAD for ' + repo);
  return match[1];
}

export function rawSkillUrl(repo, sha, path) {
  if (!REPOSITORY.test(repo) || !SHA.test(sha) ||
      typeof path !== 'string' || !path.endsWith('/SKILL.md') &&
      path !== 'SKILL.md' || path.split('/').some(s =>
        !s || s === '.' || s === '..' || /[%\\?#]/.test(s))) {
    throw new Error('Invalid immutable upstream skill location');
  }
  return 'https://raw.githubusercontent.com/' + repo + '/' + sha + '/' +
    path.split('/').map(encodeURIComponent).join('/');
}

/** Read bounded raw bytes, without GitHub REST/GraphQL API authentication or quota. */
export async function readRawSkill(repo, sha, path, {
  fetchImpl = fetch, sleep = pause, maxBytes = MAX_SKILL_BYTES,
} = {}) {
  const url = rawSkillUrl(repo, sha, path);
  for (let attempt = 1; attempt <= 2; attempt++) {
    let response;
    try {
      response = await fetchImpl(url, {
        redirect: 'manual', signal: AbortSignal.timeout(25000),
        headers: {'User-Agent': 'nosey-skills-catalog-updater'},
      });
    } catch (error) {
      if (attempt < 2) {await sleep(1000); continue;}
      throw new Error('Upstream raw download failed for ' + repo + '/' + path + ': ' + error.message);
    }
    if (!response.ok) {
      if (attempt < 2 && [500, 502, 503, 504].includes(response.status)) {
        await sleep(1000);
        continue;
      }
      throw new Error('Upstream raw SKILL.md returned HTTP ' + response.status +
        ' for ' + repo + '/' + path +
        ([403, 429].includes(response.status) ? ' (possible rate limit; aborting)' : ''));
    }
    const announced = Number(response.headers?.get('content-length'));
    if (announced > maxBytes) throw new Error('Upstream SKILL.md exceeds size limit: ' + repo + '/' + path);
    const reader = response.body?.getReader?.();
    if (!reader) throw new Error('Upstream raw response has no readable body: ' + repo + '/' + path);
    const chunks = [];
    let size = 0;
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new Error('Upstream SKILL.md exceeds size limit: ' + repo + '/' + path);
      }
      chunks.push(Buffer.from(value));
    }
    if (size === 0) throw new Error('Empty upstream SKILL.md: ' + repo + '/' + path);
    return Buffer.concat(chunks, size);
  }
  throw new Error('Upstream raw retries exhausted');
}

export function gitBlobHash(bytes) {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  return createHash('sha1').update('blob ' + buffer.length + '\0').update(buffer).digest('hex');
}

/**
 * Git transport avoids GitHub REST quotas entirely. A repository's remote HEAD
 * is queried once, and only files at changed upstream commits are fetched.
 * Both pinned and latest file bytes are hashed using Git blob semantics.
 * No remote instructions or code are executed.
 */
export async function findUpdatesWithoutApi(entries, {
  resolveHead = remoteHead, readSkill = readRawSkill, concurrency = 2,
} = {}) {
  const unresolved = entries.filter(e => e.status === 'unresolved');
  const groups = new Map();
  for (const entry of entries) {
    if (entry.status === 'unresolved') continue;
    const {repo, path} = sourceLocation(entry);
    const key = repo.toLowerCase();
    if (!groups.has(key)) groups.set(key, {repo, items: []});
    groups.get(key).items.push({entry, path: path.split('/').map(decodeURIComponent).join('/')});
  }
  const list = [...groups.values()];
  const updates = [];
  let headLookups = 0;
  let rawDownloads = 0;
  let cursor = 0;
  let error;
  async function worker() {
    while (!error && cursor < list.length) {
      const {repo, items} = list[cursor++];
      try {
        headLookups++;
        const latest = await resolveHead(repo);
        if (!SHA.test(latest ?? '')) throw new Error('Invalid upstream HEAD for ' + repo);
        const cache = new Map();
        async function hashFile(commit, path) {
          const key = commit + '/' + path;
          if (!cache.has(key)) {
            rawDownloads++;
            cache.set(key, Promise.resolve().then(() => readSkill(repo, commit, path))
              .then(bytes => {
                if (!(Buffer.isBuffer(bytes) || bytes instanceof Uint8Array) ||
                    bytes.length === 0 || bytes.length > MAX_SKILL_BYTES) {
                  throw new Error('Empty or oversized upstream SKILL.md: ' + repo + '/' + path);
                }
                return gitBlobHash(bytes);
              }));
          }
          return cache.get(key);
        }
        for (const {entry, path} of items) {
          if (error) return;
          // Git's commit pin is already HEAD; the immutable source cannot be newer.
          if (entry.commit === latest) continue;
          const newBlob = await hashFile(latest, path);
          const oldBlob = await hashFile(entry.commit, path);
          if (newBlob !== oldBlob) {
            updates.push({id: entry.id, repo, path, oldCommit: entry.commit,
              newCommit: latest, oldBlob, newBlob});
          }
        }
      } catch (cause) {
        error ??= cause;
      }
    }
  }
  await Promise.all(Array.from({length: Math.min(concurrency, list.length)}, () => worker()));
  if (error) throw error; // Never write a partial PR on missing sources or throttling.
  updates.sort((a, b) => a.id.localeCompare(b.id));
  return {updates, checked: entries.length - unresolved.length, unresolved,
    repositories: groups.size, headLookups, rawDownloads, apiRequests: 0};
}

function treeFiles(tree, repo) {
  if (!tree || tree.truncated !== false || !Array.isArray(tree.tree)) {
    throw new Error('Incomplete or truncated Git tree for ' + repo + '; refusing partial update');
  }
  return new Map(tree.tree.filter(item => item.type === 'blob' && SHA.test(item.sha ?? ''))
    .map(item => [item.path, item]));
}

/** Only mark updates when SKILL.md's blob hash changed, not on unrelated commits. */
export async function findUpdates(entries, {request, concurrency = 3} = {}) {
  if (!request) throw new Error('A GitHub API request function is required');
  const groups = new Map();
  const unresolved = entries.filter(e => e.status === 'unresolved');
  for (const entry of entries) {
    if (entry.status === 'unresolved') continue;
    const location = sourceLocation(entry);
    const key = location.repo.toLowerCase();
    if (!groups.has(key)) groups.set(key, {repo: location.repo, items: []});
    groups.get(key).items.push({entry, path: location.path});
  }

  const updates = [];
  const groupsList = [...groups.values()];
  let next = 0;
  async function worker() {
    while (next < groupsList.length) {
      const {repo, items} = groupsList[next++];
      const base = 'https://api.github.com/repos/' + repo;
      const metadata = await request(base);
      if (typeof metadata.default_branch !== 'string' || !metadata.default_branch) {
        throw new Error('No default branch for ' + repo);
      }
      const latest = await request(base + '/commits/' + encodeURIComponent(metadata.default_branch));
      const latestSha = latest.sha;
      const latestTreeSha = latest.commit?.tree?.sha;
      if (!SHA.test(latestSha ?? '') || !SHA.test(latestTreeSha ?? '')) {
        throw new Error('Invalid latest commit for ' + repo);
      }
      const latestFiles = treeFiles(await request(base + '/git/trees/' + latestTreeSha + '?recursive=1'), repo);
      const oldTrees = new Map([[latestSha, latestFiles]]);
      async function getOldFiles(sha) {
        if (!oldTrees.has(sha)) {
          const commit = await request(base + '/git/commits/' + sha);
          if (!SHA.test(commit.tree?.sha ?? '')) throw new Error('Invalid pinned Git commit for ' + repo);
          oldTrees.set(sha, treeFiles(await request(base + '/git/trees/' + commit.tree.sha + '?recursive=1'), repo));
        }
        return oldTrees.get(sha);
      }
      for (const {entry, path} of items) {
        const latestFile = latestFiles.get(path);
        if (!latestFile || !Number.isSafeInteger(latestFile.size) || latestFile.size <= 0) {
          throw new Error('Missing or empty latest SKILL.md for ' + entry.id + ': ' + path);
        }
        const pinnedFile = (await getOldFiles(entry.commit)).get(path);
        if (!pinnedFile || !Number.isSafeInteger(pinnedFile.size) || pinnedFile.size <= 0) {
          throw new Error('Missing or empty pinned SKILL.md for ' + entry.id + ': ' + path);
        }
        if (latestFile.sha !== pinnedFile.sha) {
          updates.push({id: entry.id, repo, path, oldCommit: entry.commit,
            newCommit: latestSha, oldBlob: pinnedFile.sha, newBlob: latestFile.sha});
        }
      }
    }
  }
  await Promise.all(Array.from({length: Math.min(concurrency, groupsList.length)}, () => worker()));
  updates.sort((a, b) => a.id.localeCompare(b.id));
  return {updates, checked: entries.length - unresolved.length, unresolved};
}

export function applyUpdates(c, m, l, d, updates, now) {
  const catalog = structuredClone(c);
  const mappings = structuredClone(m);
  const ledger = structuredClone(l);
  const byId = new Map(updates.map(change => [change.id, change]));
  if (byId.size !== updates.length) throw new Error('Repeated updated skill IDs');
  for (const entry of ledger.entries) {
    const change = byId.get(entry.id);
    if (!change) continue;
    if (entry.status !== 'verified' || entry.commit !== change.oldCommit) {
      throw new Error('Unexpected source ledger change: ' + entry.id);
    }
    entry.commit = change.newCommit;
    entry.url = entry.url.replace('/blob/' + change.oldCommit + '/', '/blob/' + change.newCommit + '/');
    entry.checked_at = now;
  }
  if (updates.length) {
    ledger.audited_at = now;
    catalog.snapshot_date = now.slice(0, 10);
    mappings.snapshot_date = now.slice(0, 10);
  }
  validate(catalog, mappings, ledger, d);
  return {catalog, mappings, ledger};
}

export function reportMarkdown({updates, checked, unresolved}) {
  const lines = [
    '## Upstream skill source updates', '',
    '- Verified skills checked: **' + checked + '**',
    '- Changed SKILL.md files: **' + updates.length + '**',
    '- Unresolved sources skipped: **' + unresolved.length + '**', '',
    'Only changed upstream file contents are repinned to the latest default-branch commit.',
    'All changes require review; these checks do not audit upstream instructions, licensing, or security.', '',
  ];
  if (updates.length) {
    lines.push('| Skill | Pinned commit | Latest commit | Compare upstream |', '| --- | --- | --- | --- |');
    for (const change of updates.slice(0, 100)) {
      const safeId = change.id.replace(/[|\r\n<>]/g, '');
      const url = 'https://github.com/' + change.repo + '/compare/' + change.oldCommit + '...' + change.newCommit;
      lines.push('| ' + safeId + ' | ' + change.oldCommit.slice(0, 12) + ' | ' +
        change.newCommit.slice(0, 12) + ' | [Diff](' + url + ') |');
    }
    if (updates.length > 100) lines.push('', 'Plus ' + (updates.length - 100) + ' more entries in the source ledger diff.');
  }
  if (unresolved.length) lines.push('', 'Unresolved entries have not been updated; verify their exact sources manually.');
  return lines.join('\n') + '\n';
}

async function main() {
  const mode = process.argv[2];
  if (process.argv.length !== 3 || !['--check', '--write'].includes(mode)) {
    console.error('Usage: node scripts/update-skill-sources.mjs --check|--write');
    process.exitCode = 2;
    return;
  }
  const {c, m, l, d} = load();
  validate(c, m, l, d);
  const now = new Date().toISOString();
  const result = await findUpdatesWithoutApi(l.entries);
  console.log('Upstream checks: ' + result.headLookups + ' git HEAD lookups, ' +
    result.rawDownloads + ' raw skill downloads, 0 GitHub API requests');
  const report = reportMarkdown(result);
  console.log(report);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  if (process.env.SKILL_UPDATE_REPORT) writeFileSync(process.env.SKILL_UPDATE_REPORT, report);
  if (mode === '--write' && result.updates.length) {
    const {catalog, mappings, ledger} = applyUpdates(c, m, l, d, result.updates, now);
    writeFileSync(resolve(ROOT, 'data/catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
    writeFileSync(resolve(ROOT, 'data/mappings.json'), JSON.stringify(mappings, null, 2) + '\n');
    writeFileSync(resolve(ROOT, 'data/catalog-source-ledger.json'), JSON.stringify(ledger, null, 2) + '\n');
    for (const [name, content] of Object.entries(render(catalog, mappings, ledger, d))) {
      writeFileSync(resolve(ROOT, name), content);
    }
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {console.error(error.stack ?? error.message); process.exitCode = 1;});
}
