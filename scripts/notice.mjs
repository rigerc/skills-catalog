#!/usr/bin/env node
// notice.mjs — publish and verify the reviewed catalog notice artifact
// (data/catalog-notice.json): the machine-readable publication contract that
// lets Nosey's explicit catalog check (FR-048) compare snapshot identity
// without trusting a GitHub main commit alone.
//
// Modes:
//   node scripts/notice.mjs --check                     structure + sha256 of the four data files
//   node scripts/notice.mjs --check --base <ref>        also enforce monotonicity versus the base notice
//   node scripts/notice.mjs --write [--repin]           (re)generate the notice from data/ and git HEAD;
//                                                       --repin re-pins to HEAD once the current pin is
//                                                       no longer an ancestor (post-merge convergence)
//
// The notice stores:
//   commit   — the git commit whose data/ tree the sha256 entries pin
//   sequence — monotonic integer, bumped whenever the four data files change
//   files    — sha256 of exactly the four canonical data files

import {execFile} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile, rename, writeFile} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';

const exec = promisify(execFile);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NOTICE = join(ROOT, 'data', 'catalog-notice.json');
const DATA_FILES = ['catalog.json', 'mappings.json', 'technology-detection-rules.json', 'catalog-source-ledger.json'];
const sha = (text) => createHash('sha256').update(text).digest('hex');
const isSha40 = (value) => /^[a-f0-9]{40}$/.test(String(value ?? ''));

function issuesFor(notice) {
  const issues = [];
  if (!notice || typeof notice !== 'object' || Array.isArray(notice)) return ['notice is not an object'];
  if (notice.schema_version !== 1) issues.push('schema_version must be 1');
  if (notice.catalog_id !== 'nosey-built-in') issues.push('catalog_id must be nosey-built-in');
  if (!isSha40(notice.commit)) issues.push('commit must be a full 40-hex sha');
  if (!Number.isInteger(notice.sequence) || notice.sequence < 1) issues.push('sequence must be a positive integer');
  if (notice.reviewed !== true) issues.push('reviewed must be true');
  const files = Array.isArray(notice.files) ? notice.files : [];
  if (files.length !== DATA_FILES.length) issues.push('notice must list exactly four files');
  const seen = new Set();
  for (const entry of files) {
    const path = String(entry?.path ?? '');
    if (!DATA_FILES.includes(path)) { issues.push('unexpected notice file: ' + path); continue; }
    if (seen.has(path)) issues.push('duplicate notice file: ' + path);
    seen.add(path);
    if (typeof entry.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(entry.sha256)) issues.push('invalid sha256 for ' + path);
  }
  for (const path of DATA_FILES) if (!seen.has(path)) issues.push('missing notice file: ' + path);
  return [...new Set(issues)];
}

const readData = async (name) => await readFile(join(ROOT, 'data', name), 'utf8');
const loadNotice = async () => JSON.parse(await readFile(NOTICE, 'utf8'));
const currentHashes = async () => {
  const hashes = [];
  for (const name of DATA_FILES) hashes.push({path: name, sha256: sha(await readData(name))});
  return hashes;
};
const sameHashes = (notice, hashes) => hashes.length === notice.files.length &&
  hashes.every(entry => notice.files.find(candidate => candidate.path === entry.path)?.sha256 === entry.sha256);

function fail(issue) {
  process.stderr.write('notice: ' + issue + '\n');
  process.exit(1);
}

async function isAncestor(commit) {
  try {
    await exec('git', ['merge-base', '--is-ancestor', commit, 'HEAD'], {cwd: ROOT});
    return true;
  } catch { return false; }
}

async function headSha() {
  try {
    const result = await exec('git', ['rev-parse', '--verify', 'HEAD'], {cwd: ROOT});
    return isSha40(result.stdout.trim()) ? result.stdout.trim() : null;
  } catch { return null; }
}

async function baseNotice(baseRef) {
  try {
    return JSON.parse((await exec('git', ['show', baseRef + ':data/catalog-notice.json'], {cwd: ROOT})).stdout);
  } catch { return null; }
}

async function verify({base}) {
  let notice;
  try { notice = await loadNotice(); }
  catch { return fail('data/catalog-notice.json is missing or not JSON; run scripts/notice.mjs --write'); }
  const issues = issuesFor(notice);
  if (issues.length) return fail('invalid notice structure: ' + issues[0]);
  const hashes = await currentHashes();
  for (const entry of hashes) {
    if (notice.files.find(candidate => candidate.path === entry.path)?.sha256 !== entry.sha256)
      fail('hash mismatch for data/' + entry.path + '; data changed or the notice is stale — run scripts/notice.mjs --write');
  }
  if (!(await isAncestor(notice.commit)))
    process.stderr.write('notice: pin ' + notice.commit.slice(0, 12) + ' is not an ancestor of HEAD in this checkout\n');
  if (base) {
    const prior = await baseNotice(base);
    if (prior && issuesFor(prior).length === 0) {
      if (notice.sequence < prior.sequence)
        fail('sequence regressed from base ' + base + ': ' + notice.sequence + ' < ' + prior.sequence);
      if (!sameHashes(notice, hashes) || !sameHashes(prior, hashes) || !sameHashes(notice, hashes.filter(Boolean))) {
        // fallthrough: hash mismatch against live data already failed above; base comparison only gates sequence
      }
      if (!sameHashes(prior, hashes) && notice.sequence === prior.sequence)
        fail('data changed versus base ' + base + ' but sequence did not advance');
    } else {
      process.stderr.write('notice: no valid base notice at ' + base + '; monotonicity check skipped\n');
    }
  }
  process.stdout.write('notice: verified (pin ' + notice.commit.slice(0, 12) + ', sequence ' + notice.sequence + ')\n');
}

async function write({repin}) {
  const head = await headSha();
  if (!head) return fail('run --write from a committed git checkout');
  const hashes = await currentHashes();
  const previous = await loadNotice().catch(() => null);
  const previousValid = previous && issuesFor(previous).length === 0 ? previous : null;
  const dataChanged = !previousValid || !sameHashes(previousValid, hashes);
  if (!dataChanged && previousValid && await isAncestor(previousValid.commit)) {
    process.stdout.write('notice: already current (pin ' + previousValid.commit.slice(0, 12) +
      ', sequence ' + previousValid.sequence + ')\n');
    process.exit(0);
  }
  if (!dataChanged && !repin) {
    process.stdout.write('notice: data unchanged; keeping pin ' + previousValid.commit.slice(0, 12) +
      ' (sequence ' + previousValid.sequence + ') — re-pin with --repin when the pin must follow HEAD\n');
    process.exit(0);
  }
  const sequence = previousValid ? (dataChanged ? previousValid.sequence + 1 : previousValid.sequence) : 1;
  const notice = {schema_version: 1, catalog_id: 'nosey-built-in', commit: head, sequence, reviewed: true, files: hashes};
  const temp = NOTICE + '.tmp';
  await writeFile(temp, JSON.stringify(notice, null, 2) + '\n', 'utf8');
  await rename(temp, NOTICE);
  process.stdout.write('notice: wrote pin ' + head.slice(0, 12) + ', sequence ' + sequence +
    (dataChanged ? ' (data changed)' : '') + '\n');
}

const args = process.argv.slice(2);
const flagValue = (flag) => args[args.indexOf(flag) + 1];
if (args.includes('--help')) {
  process.stdout.write('usage: notice.mjs --check [--base <ref>] | --write [--repin]\n');
  process.exit(0);
}
if (args.includes('--write')) await write({repin: args.includes('--repin')});
else if (args.includes('--check')) await verify({base: args.includes('--base') ? flagValue('--base') : null});
else {
  process.stdout.write('usage: notice.mjs --check [--base <ref>] | --write [--repin]\n');
  process.exit(args.length === 0 ? 1 : 2);
}
