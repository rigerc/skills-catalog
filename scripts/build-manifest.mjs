#!/usr/bin/env node
/**
 * build-manifest.mjs — generate the catalog pointer (latest.json) and file
 * table (manifest.json) that Nosey consumes.
 *
 *   node scripts/build-manifest.mjs [--out _manifest] [--commit <sha>] [--summary]
 *   node scripts/build-manifest.mjs --verify _manifest        (re-check an existing output)
 *
 * Flags:
 *   --root <dir>          repository root (default: this script's repository)
 *   --out <dir>           output directory (default: <root>/_manifest)
 *   --commit <sha>        full commit SHA (default: $GITHUB_SHA, then `git rev-parse HEAD`)
 *   --published-at <ts>   ISO-8601 UTC, seconds precision (default: now)
 *   --verify <dir>        verify <dir>/latest.json + manifest.json against the files under --root
 *   --summary             print a markdown size table on stdout (for $GITHUB_STEP_SUMMARY)
 *   --require-ajv         fail instead of skipping JSON Schema validation when ajv is missing
 *
 * The dataset list lives in manifest.config.json, so adding a dataset is a
 * config change, not a code change. manifest.json is deterministic (no
 * timestamps); only latest.json carries published_at.
 */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const SCRIPT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LIMITS = {file: 4 * 1024 * 1024, warn: 3 * 1024 * 1024, manifest: 64 * 1024, latest: 1024, datasets: 32};
const CORE = ['catalog', 'mappings', 'rules', 'ledger'];
const COHORT_PREFIX = 'nosey-cohort-v1\n';
const RE = {
  sha40: /^[a-f0-9]{40}$/,
  catalogId: /^[a-z0-9][a-z0-9._-]{0,63}$/,
  repo: /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/,
  semver: /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[0-9A-Za-z.-]+)?$/,
  path: /^(data|schemas)\/[a-z0-9][a-z0-9._-]*\.json$/,
  id: /^[a-z][a-z0-9-]{0,31}$/,
  group: /^[a-z][a-z0-9-]{0,23}$/,
  timestamp: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/
};

class Fail extends Error {}
const fail = message => { throw new Fail(message); };
const warn = message => process.stderr.write('build-manifest: warning: ' + message + '\n');
const sha256 = value => createHash('sha256').update(value).digest('hex');
const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

function parseArgs(argv) {
  const options = {root: SCRIPT_ROOT, flags: new Set()};
  const valued = new Map([['--root', 'root'], ['--out', 'out'], ['--commit', 'commit'],
    ['--published-at', 'publishedAt'], ['--verify', 'verify']]);
  const switches = new Set(['--summary', '--require-ajv', '--help']);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (valued.has(arg)) {
      const value = argv[++i];
      if (value === undefined || value.startsWith('--')) fail(arg + ' requires a value');
      options[valued.get(arg)] = value;
    } else if (switches.has(arg)) options.flags.add(arg);
    else fail('unknown argument: ' + arg);
  }
  options.root = resolve(options.root);
  options.out = resolve(options.out ?? join(options.root, '_manifest'));
  return options;
}

function readJson(path, label) {
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch (error) {
    if (error.code === 'ENOENT') fail(label + ' not found');
    fail(label + ' is not valid JSON: ' + error.message);
  }
}

function loadConfig(root) {
  const config = readJson(join(root, 'manifest.config.json'), 'manifest.config.json');
  if (config.config_version !== 1) fail('manifest.config.json: unsupported config_version');
  if (!RE.repo.test(config.repository ?? '')) fail('manifest.config.json: repository must be owner/name');
  if (!RE.semver.test(config.min_cli ?? '')) fail('manifest.config.json: min_cli must be a semver string');
  if (!Number.isInteger(config.rule_language) || config.rule_language < 1)
    fail('manifest.config.json: rule_language must be a positive integer');
  const list = config.datasets;
  if (!Array.isArray(list) || list.length < CORE.length || list.length > LIMITS.datasets)
    fail('manifest.config.json: datasets must list between ' + CORE.length + ' and ' + LIMITS.datasets + ' entries');
  const seen = new Set();
  for (const entry of list) {
    if (!RE.id.test(entry?.id ?? '')) fail('manifest.config.json: invalid dataset id ' + JSON.stringify(entry?.id));
    if (seen.has(entry.id)) fail('manifest.config.json: duplicate dataset id ' + entry.id);
    seen.add(entry.id);
    if (!RE.group.test(entry.group ?? '')) fail('dataset ' + entry.id + ': invalid group');
    if (typeof entry.required !== 'boolean') fail('dataset ' + entry.id + ': required must be a boolean');
    for (const key of ['data', 'schema'])
      if (!RE.path.test(entry[key] ?? '')) fail('dataset ' + entry.id + ': ' + key + ' path must match ' + RE.path);
  }
  for (const id of CORE) {
    const entry = list.find(item => item.id === id);
    if (!entry) fail('core dataset missing from config: ' + id);
    if (!entry.required || entry.group !== 'core') fail('core dataset ' + id + ' must be required and in group "core"');
  }
  return config;
}

function readFileRef(root, relative) {
  const buffer = readFileSync(join(root, relative)); // ENOENT is handled by the caller
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf)
    fail(relative + ': UTF-8 BOM is not allowed (clients hash the bytes as served)');
  if (buffer.length > LIMITS.file)
    fail(relative + ': ' + buffer.length + ' bytes exceeds the ' + LIMITS.file + ' byte per-file cap');
  if (buffer.length >= LIMITS.warn)
    warn(relative + ': ' + buffer.length + ' bytes is over 75% of the per-file cap; plan to split it into more datasets');
  return {buffer, ref: {path: relative, sha256: sha256(buffer), bytes: buffer.length}};
}

function collect(root, config) {
  const datasets = [];
  let catalogId;
  for (const entry of config.datasets) {
    let data;
    try { data = readFileRef(root, entry.data); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      if (entry.required) fail('required dataset ' + entry.id + ': ' + entry.data + ' not found');
      warn('optional dataset ' + entry.id + ' skipped: ' + entry.data + ' not found');
      continue;
    }
    let schema;
    try { schema = readFileRef(root, entry.schema); }
    catch (error) {
      if (error.code === 'ENOENT') fail('dataset ' + entry.id + ': schema ' + entry.schema + ' not found');
      throw error;
    }
    let parsed;
    try { parsed = JSON.parse(data.buffer.toString('utf8')); }
    catch (error) { fail(entry.data + ': invalid JSON (' + error.message + ')'); }
    const schemaVersion = parsed?.schema_version;
    if (!Number.isInteger(schemaVersion) || schemaVersion < 1)
      fail(entry.data + ': schema_version must be a positive integer');
    if (typeof parsed.catalog_id === 'string') {
      catalogId ??= parsed.catalog_id;
      if (parsed.catalog_id !== catalogId)
        fail(entry.data + ': catalog_id "' + parsed.catalog_id + '" differs from "' + catalogId + '"');
    }
    datasets.push({id: entry.id, group: entry.group, required: entry.required, schema_version: schemaVersion,
      data: data.ref, schema: schema.ref});
  }
  if (!catalogId) fail('no dataset declares a catalog_id');
  if (!RE.catalogId.test(catalogId)) fail('invalid catalog_id: ' + catalogId);
  return {catalogId, datasets};
}

/** Identity of the data a client would activate. Independent of commit and time. */
function cohortId(meta, datasets) {
  const header = COHORT_PREFIX + meta.min_cli + ' ' + meta.rule_language + '\n';
  const lines = [...datasets].sort(byId).map(d =>
    [d.id, d.group, d.required, d.data.sha256, d.schema.sha256].join(' ') + '\n');
  return sha256(header + lines.join(''));
}

function gitHead(root) {
  try { return execFileSync('git', ['rev-parse', '--verify', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim(); }
  catch { return fail('cannot determine the commit; pass --commit <sha>'); }
}

function build(options) {
  const config = loadConfig(options.root);
  const commit = (options.commit ?? process.env.GITHUB_SHA ?? gitHead(options.root)).toLowerCase();
  if (!RE.sha40.test(commit)) fail('commit must be a full 40-character SHA');
  const publishedAt = options.publishedAt ?? new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  if (!RE.timestamp.test(publishedAt)) fail('--published-at must look like 2026-11-01T20:00:00Z');
  const {catalogId, datasets} = collect(options.root, config);
  const meta = {min_cli: config.min_cli, rule_language: config.rule_language};
  const manifest = {manifest_version: 1, catalog_id: catalogId, repository: config.repository, commit,
    cohort_id: cohortId(meta, datasets), ...meta, datasets};
  const manifestText = JSON.stringify(manifest, null, 2) + '\n';
  const manifestBytes = Buffer.byteLength(manifestText);
  if (manifestBytes > LIMITS.manifest) fail('manifest.json is ' + manifestBytes + ' bytes; the cap is ' + LIMITS.manifest);
  const latest = {latest_version: 1, catalog_id: catalogId, repository: config.repository, commit,
    cohort_id: manifest.cohort_id, published_at: publishedAt, ...meta,
    manifest: {path: 'manifest.json', sha256: sha256(manifestText), bytes: manifestBytes}};
  const latestText = JSON.stringify(latest) + '\n'; // compact on purpose: hard 1 KiB budget
  if (Buffer.byteLength(latestText) > LIMITS.latest)
    fail('latest.json is ' + Buffer.byteLength(latestText) + ' bytes; the cap is ' + LIMITS.latest);
  return {manifest, manifestText, latest, latestText};
}

async function loadAjv(required) {
  try {
    const module = await import('ajv/dist/2020.js');
    return module.default ?? module.Ajv2020;
  } catch {
    if (required) fail('ajv is not installed (npm install --no-package-lock) but --require-ajv was given');
    warn('ajv is not installed; skipping JSON Schema validation');
    return null;
  }
}

function validateSchemas(Ajv, documents) {
  const ajv = new Ajv({allErrors: true, strict: true});
  for (const [name, document] of documents) {
    const validate = ajv.compile(readJson(join(SCRIPT_ROOT, 'schemas', name + '.schema.json'), name + '.schema.json'));
    if (!validate(document)) fail(name + '.json violates its schema: ' + ajv.errorsText(validate.errors, {separator: '; '}));
  }
}

function verify(options, Ajv) {
  const latestText = readFileSync(join(options.verify, 'latest.json'), 'utf8');
  const manifestBuffer = readFileSync(join(options.verify, 'manifest.json'));
  const latest = JSON.parse(latestText), manifest = JSON.parse(manifestBuffer.toString('utf8'));
  if (Buffer.byteLength(latestText) > LIMITS.latest) fail('latest.json exceeds ' + LIMITS.latest + ' bytes');
  if (manifestBuffer.length > LIMITS.manifest) fail('manifest.json exceeds ' + LIMITS.manifest + ' bytes');
  if (latest.manifest?.sha256 !== sha256(manifestBuffer) || latest.manifest?.bytes !== manifestBuffer.length)
    fail('latest.json does not describe manifest.json (hash or size differs)');
  for (const key of ['catalog_id', 'repository', 'commit', 'cohort_id', 'min_cli', 'rule_language'])
    if (latest[key] !== manifest[key]) fail('latest.json and manifest.json disagree on ' + key);
  if (Ajv) validateSchemas(Ajv, [['latest', latest], ['manifest', manifest]]);
  const ids = manifest.datasets.map(d => d.id);
  if (new Set(ids).size !== ids.length) fail('duplicate dataset ids in manifest.json');
  for (const id of CORE) {
    const entry = manifest.datasets.find(d => d.id === id);
    if (!entry?.required) fail('core dataset missing or not required: ' + id);
  }
  for (const dataset of manifest.datasets)
    for (const key of ['data', 'schema']) {
      const {ref} = readFileRef(options.root, dataset[key].path);
      if (ref.sha256 !== dataset[key].sha256 || ref.bytes !== dataset[key].bytes)
        fail(dataset.id + ': ' + dataset[key].path + ' does not match the manifest (hash or size)');
    }
  if (cohortId(manifest, manifest.datasets) !== manifest.cohort_id) fail('cohort_id does not match the dataset table');
  return manifest;
}

function summary(manifest, manifestBytes, latestBytes) {
  const rows = manifest.datasets.map(d =>
    '| ' + [d.id, d.group, d.required ? 'yes' : 'no', 'v' + d.schema_version, d.data.bytes.toLocaleString('en-US'),
      d.schema.bytes.toLocaleString('en-US')].join(' | ') + ' |');
  const total = group => manifest.datasets.filter(d => group === '*' || d.group === group)
    .reduce((sum, d) => sum + d.data.bytes + d.schema.bytes, 0);
  const groups = [...new Set(manifest.datasets.map(d => d.group))];
  return ['## Catalog manifest', '',
    'Commit `' + manifest.commit.slice(0, 12) + '` · cohort `' + manifest.cohort_id.slice(0, 12) + '` · min CLI ' +
      manifest.min_cli + ' · rule language ' + manifest.rule_language, '',
    '| Dataset | Group | Required | Schema | Data bytes | Schema bytes |', '| --- | --- | --- | --- | ---: | ---: |',
    ...rows, '',
    '- `latest.json`: ' + latestBytes + ' B (cap ' + LIMITS.latest + ')',
    '- `manifest.json`: ' + manifestBytes + ' B (cap ' + LIMITS.manifest + ')',
    ...groups.map(group => '- group `' + group + '`: ' + total(group).toLocaleString('en-US') + ' B uncompressed'),
    '- all groups: ' + total('*').toLocaleString('en-US') + ' B uncompressed', ''].join('\n');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.flags.has('--help')) {
    process.stdout.write(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].replace(/^#!.*\n/, '') + '*/\n');
    return;
  }
  const Ajv = await loadAjv(options.flags.has('--require-ajv'));
  if (options.verify) {
    options.verify = resolve(options.verify);
    const manifest = verify(options, Ajv);
    process.stderr.write('build-manifest: verified ' + manifest.datasets.length + ' datasets at ' + manifest.commit.slice(0, 12) + '\n');
    return;
  }
  const built = build(options);
  if (Ajv) validateSchemas(Ajv, [['latest', built.latest], ['manifest', built.manifest]]);
  mkdirSync(options.out, {recursive: true});
  writeFileSync(join(options.out, 'manifest.json'), built.manifestText);
  writeFileSync(join(options.out, 'latest.json'), built.latestText);
  process.stderr.write('build-manifest: wrote latest.json (' + Buffer.byteLength(built.latestText) + ' B) and manifest.json (' +
    Buffer.byteLength(built.manifestText) + ' B) for ' + built.manifest.datasets.length + ' datasets\n');
  if (options.flags.has('--summary'))
    process.stdout.write(summary(built.manifest, Buffer.byteLength(built.manifestText), Buffer.byteLength(built.latestText)));
}

main().catch(error => {
  if (error instanceof Fail) { process.stderr.write('build-manifest: ' + error.message + '\n'); process.exit(1); }
  throw error;
});