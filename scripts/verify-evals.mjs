#!/usr/bin/env node
/**
 * Verify has_evals against tracked files in each verified, commit-pinned
 * upstream skill directory. Reads GitHub Git trees; never runs upstream code.
 *
 *   node scripts/verify-evals.mjs --check  # CI: reject inaccurate evidence
 *   node scripts/verify-evals.mjs --write  # refresh index and catalog fields
 *
 * Set GITHUB_TOKEN (or GH_TOKEN) to avoid anonymous API rate limits.
 */
import {readFileSync, writeFileSync} from 'node:fs';
import https from 'node:https';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = name => JSON.parse(readFileSync(resolve(ROOT, 'data', name), 'utf8'));
const write = (name, value) => writeFileSync(resolve(ROOT, 'data', name), JSON.stringify(value, null, 2) + '\n');
const REGULAR = new Set(['100644', '100755']);
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const agent = new https.Agent({keepAlive: true, maxSockets: 4});

function githubJson(url, hops = 0) {
  if (hops > 5 || new URL(url).hostname !== 'api.github.com') throw Error('Unsafe or excessive GitHub redirect');
  return new Promise((resolveRequest, reject) => {
    const req = https.get(url, {agent, headers: {
      'User-Agent': 'skills-catalog-evals-verifier',
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(TOKEN ? {'Authorization': 'Bearer ' + TOKEN} : {}),
    }}, res => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        return resolveRequest(githubJson(new URL(res.headers.location, url).href, hops + 1));
      }
      let text = '';
      res.setEncoding('utf8');
      res.on('data', chunk => {text += chunk; if (text.length > 30000000) req.destroy(Error('GitHub tree response too large'));});
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(Error('GitHub ' + res.statusCode + ' for ' + url + ': ' + text.slice(0, 250)));
        try {resolveRequest(JSON.parse(text));} catch (e) {reject(e);}
      });
    });
    req.setTimeout(60000, () => req.destroy(Error('GitHub tree request timed out')));
    req.on('error', reject);
  });
}

/** Source identities are taken from the verified ledger, never from a guessed directory. */
export function sourceGroup(entry) {
  const match = entry.url?.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([0-9a-f]{40})\/(.*)SKILL\.md$/);
  if (entry.status !== 'verified' || !match || match[3] !== entry.commit) throw Error('Unverified eval source: ' + entry.id);
  return {id: entry.id, repo: match[1] + '/' + match[2], commit: match[3],
    dir: match[4], skillPath: match[4] + 'SKILL.md'};
}

export function detectFromPaths(paths, location) {
  if (!paths.some(p => p.path === location.skillPath && REGULAR.has(p.mode) && p.type === 'blob')) {
    throw Error('Pinned SKILL.md is missing for ' + location.id);
  }
  return paths.some(p => p.path.startsWith(location.dir + 'evals/') &&
    p.type === 'blob' && REGULAR.has(p.mode));
}

async function evaluateGroup(group, getTree) {
  // Most repositories require one API call, even with hundreds of skills.
  const full = await getTree(group.repo, group.commit, true);
  if (!full.truncated && Array.isArray(full.tree)) {
    return group.skills.map(s => ({id: s.id, commit: s.commit, has_evals: detectFromPaths(full.tree, s)}));
  }
  // A few giant repositories truncate recursive trees. Walk only selected
  // skill paths using non-recursive tree objects instead of assuming false.
  const cache = new Map();
  async function children(sha) {
    if (!cache.has(sha)) cache.set(sha, getTree(group.repo, sha, false).then(x => {
      if (!Array.isArray(x.tree) || x.truncated) throw Error('Cannot enumerate Git tree ' + sha);
      return x.tree;
    }));
    return cache.get(sha);
  }
  async function directory(root, dir) {
    let sha = root;
    for (const segment of dir.split('/').filter(Boolean)) {
      const item = (await children(sha)).find(x => x.path === segment && x.type === 'tree');
      if (!item) throw Error('Missing pinned skill directory: ' + dir);
      sha = item.sha;
    }
    return sha;
  }
  async function containsRegular(sha) {
    const items = await children(sha);
    if (items.some(x => x.type === 'blob' && REGULAR.has(x.mode))) return true;
    for (const item of items) if (item.type === 'tree' && await containsRegular(item.sha)) return true;
    return false;
  }
  const out = [];
  for (const s of group.skills) {
    const sha = await directory(group.commit, s.dir);
    const items = await children(sha);
    if (!items.some(x => x.path === 'SKILL.md' && x.type === 'blob' && REGULAR.has(x.mode))) {
      throw Error('Pinned SKILL.md is missing for ' + s.id);
    }
    const evals = items.find(x => x.path === 'evals' && x.type === 'tree');
    out.push({id: s.id, commit: s.commit, has_evals: !!evals && await containsRegular(evals.sha)});
  }
  return out;
}

export async function inspect(entries, getTree, concurrency = 4) {
  const groups = new Map();
  for (const entry of entries) {
    const loc = sourceGroup(entry);
    const key = loc.repo.toLowerCase() + '@' + loc.commit;
    if (!groups.has(key)) groups.set(key, {repo: loc.repo, commit: loc.commit, skills: []});
    groups.get(key).skills.push(loc);
  }
  const queue = [...groups.values()];
  const results = [];
  let index = 0;
  async function worker() {
    while (index < queue.length) {
      const group = queue[index++];
      results.push(...await evaluateGroup(group, getTree));
    }
  }
  await Promise.all(Array.from({length: Math.min(concurrency, queue.length)}, worker));
  return results.sort((a, b) => a.id.localeCompare(b.id));
}

/** Shared authenticated Git tree transport, also used by the source repinning workflow. */
export const githubTree = (repo, sha, recursive) =>
  githubJson('https://api.github.com/repos/' + repo.split('/').map(encodeURIComponent).join('/') +
    '/git/trees/' + encodeURIComponent(sha) + (recursive ? '?recursive=1' : ''));

export async function main(argv) {
  if (argv.length !== 1 || !['--check', '--write'].includes(argv[0])) throw Error('Usage: node scripts/verify-evals.mjs --check | --write');
  const catalog = read('catalog.json'), ledger = read('catalog-source-ledger.json'), stored = read('evals-index.json');
  const actual = await inspect(ledger.entries, githubTree);
  const updated = {schema_version: 1, entries: actual};
  if (argv[0] === '--write') {
    const byId = new Map(actual.map(x => [x.id, x]));
    for (const skill of catalog.skills) {
      if (!byId.has(skill.id)) throw Error('Missing eval source ' + skill.id);
      skill.has_evals = byId.get(skill.id).has_evals;
    }
    write('evals-index.json', updated);
    write('catalog.json', catalog);
    console.log('Eval markers refreshed for ' + actual.length + ' pinned skills; run node scripts/catalog.mjs --write');
  } else {
    if (JSON.stringify(stored) !== JSON.stringify(updated)) throw Error('Pinned eval presence differs from data/evals-index.json; run node scripts/verify-evals.mjs --write');
    const markers = new Map(actual.map(x => [x.id, x.has_evals]));
    if (catalog.skills.length !== markers.size || catalog.skills.some(s => s.has_evals !== markers.get(s.id))) throw Error('Catalog eval markers differ from pinned upstream evidence');
    console.log('Eval markers verified against ' + actual.length + ' pinned upstream skills');
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(e => {console.error(e.message); process.exitCode = 1;});
}
