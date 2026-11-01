#!/usr/bin/env node
/** Build a skills-only manifest for the hash-coherent Pages deployment. Offline. */
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validate as validateCatalog} from './catalog.mjs';
import {sourceCoordinates} from './check-changed-skill-sources.mjs';
import {checkScores} from './evaluate-skills.mjs';
import {checkDoc as checkQuality} from './quality.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const CRITERIA = ['trigger_clarity', 'instruction_quality', 'correctness', 'safety', 'context_efficiency'];
export const STATES = ['current', 'stale', 'pending', 'not_evaluated', 'unresolved'];
const SHA = /^[0-9a-f]{40}$/;
const MAX_BYTES = 1024 * 1024;
const FAIL_LIMIT = 25;
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const read = (root, name) => {
  const bytes = readFileSync(resolve(root, 'data', name));
  return {bytes, json: JSON.parse(bytes.toString('utf8'))};
};
const emptyStates = (metadata = false) => Object.fromEntries(
  (metadata ? STATES.filter(s => s !== 'not_evaluated') : STATES).map(s => [s, 0]));
export const cleanText = (value, limit = 300) =>
  typeof value !== 'string' ? null : Array.from(value
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').replace(/\s+/gu, ' ').trim())
    .slice(0, limit).join('') || null;

export function loadInputs(root = ROOT) {
  const pairs = {
    catalog: 'catalog.json', mappings: 'mappings.json', rules: 'technology-detection-rules.json',
    ledger: 'catalog-source-ledger.json', scores: 'scores.json', quality: 'quality.json',
  };
  const inputs = Object.fromEntries(Object.entries(pairs).map(([key, name]) => [key, read(root, name)]));
  inputs.metadata = existsSync(resolve(root, 'data', 'skill-metadata.json'))
    ? read(root, 'skill-metadata.json') : null;
  return inputs;
}

const validNumbers = scores => CRITERIA.every(k => Number.isFinite(scores?.[k]) &&
  scores[k] >= 1 && scores[k] <= 5);
function checkedEntries(inputs) {
  const {catalog, mappings, rules, ledger, scores, quality, metadata} = inputs;
  validateCatalog(catalog.json, mappings.json, ledger.json, rules.json);
  if (catalog.json.catalog_id !== scores.json.catalog_id ||
      catalog.json.catalog_id !== quality.json.catalog_id ||
      (metadata && catalog.json.catalog_id !== metadata.json.catalog_id)) {
    throw Error('Catalog IDs disagree across manifest inputs');
  }
  const scoreProblems = checkScores(scores.json, catalog.json, ledger.json.entries).problems;
  const qualityProblems = checkQuality(quality.json, ledger.json.entries).problems;
  if (scoreProblems.length || qualityProblems.length) {
    throw Error('Assessment inputs invalid: ' +
      [...scoreProblems, ...qualityProblems].slice(0, FAIL_LIMIT).join('; '));
  }
  for (const key of ['scores', 'quality', 'metadata']) {
    if (!inputs[key]) continue;
    const entries = inputs[key].json.entries;
    if (!Array.isArray(entries) || new Set(entries.map(x => x.id)).size !== entries.length) {
      throw Error('Duplicate or invalid ' + key + ' entry IDs');
    }
  }
}

export function scoreOf(entry, ledger, evaluator) {
  if (ledger.status !== 'verified') return {state: 'unresolved', overall: null,
    criteria: null, result_kind: null, model: null, evaluated_at: null};
  const state = !entry ? 'pending'
    : entry.source?.url !== ledger.url || entry.source?.commit !== ledger.commit ||
      entry.fingerprint !== evaluator.fingerprint ||
      (entry.status === 'evaluated' &&
       entry.result_kind !== (evaluator.provider === 'jev' ? 'jev_scores' : 'prose_review'))
      ? 'stale'
    : entry.status === 'evaluated' ? 'current' : 'not_evaluated';
  const scored = entry?.status === 'evaluated';
  const scores = scored ? Object.fromEntries(CRITERIA.map(k =>
    [k, typeof entry.evaluation?.scores?.[k] === 'number' ? entry.evaluation.scores[k] : entry.evaluation?.scores?.[k]?.score ?? null])) : null;
  if (scored && !validNumbers(scores)) throw Error('Invalid score criteria for ' + entry.id);
  return {state, overall: scored ? entry.overall_score : null,
    criteria: scores, result_kind: scored ? entry.result_kind : null,
    model: entry ? cleanText(entry.model ?? evaluator.model, 100) : null,
    evaluated_at: entry?.evaluated_at ?? null};
}

export function qualityOf(entry, ledger, fp) {
  if (ledger.status !== 'verified') return {state: 'unresolved', status: null, counts: null,
    findings: null, findings_truncated: false, validator_version: null, evaluated_at: null, metrics: null};
  let fresh = false;
  if (entry) {
    const loc = sourceCoordinates(ledger);
    fresh = entry.source?.repository?.toLowerCase() === loc.repo.toLowerCase() &&
      entry.source?.path === loc.path && entry.source?.commit === ledger.commit &&
      entry.fingerprint === fp;
  }
  const state = !entry ? 'pending' : !fresh ? 'stale'
    : entry.status === 'not_evaluated' ? 'not_evaluated' : 'current';
  const assessed = entry && entry.status !== 'not_evaluated';
  const findings = assessed ? entry.findings.slice(0, 5).map(f => ({
    level: f.level, category: cleanText(f.category, 100),
    message: cleanText(f.message, 200),
    file: cleanText(f.file, 300), line: f.line ?? null,
  })) : null;
  const metrics = assessed && entry.metrics ? {
    tokens: entry.metrics.tokens ? {
      total: entry.metrics.tokens.total,
      skill_md: entry.metrics.tokens.skill_md ?? null,
      references: entry.metrics.tokens.references ?? null,
      other: entry.metrics.tokens.other ?? null,
    } : null,
    contamination: entry.metrics.contamination ? {
      level: entry.metrics.contamination.level,
      score: entry.metrics.contamination.score,
    } : null,
  } : null;
  return {state, status: entry?.status ?? null,
    counts: assessed ? {...entry.counts} : null, findings,
    findings_truncated: !!entry?.findings_truncated || !!(assessed && entry.findings.length > 5),
    validator_version: cleanText(entry?.validator_version, 100),
    evaluated_at: entry?.evaluated_at ?? null, metrics};
}

export function metaOf(entry, source, research) {
  const state = source.status !== 'verified' ? 'unresolved' : !entry ? 'pending'
    : entry.read_at_commit !== source.commit ? 'stale' : 'current';
  return {state,
    name: cleanText(entry?.name, 150),
    description: cleanText(entry?.description, 300),
    license: cleanText(entry?.license, 150),
    compatibility: cleanText(entry?.compatibility, 300),
    read_at_commit: entry?.read_at_commit ?? null,
    research: research ? {
      license_reported: cleanText(research.license_reported, 150),
      size_reported: cleanText(research.size_reported, 150),
      reviewed_for_security: research.reviewed_for_security,
    } : null};
}

export function buildManifest(inputs, sourceCommit) {
  if (!SHA.test(sourceCommit ?? '')) throw Error('source_commit must be a 40-hex Git commit');
  checkedEntries(inputs);
  const {catalog, mappings, rules, ledger, scores, quality, metadata} = inputs;
  const by = entries => new Map((entries ?? []).map(e => [e.id, e]));
  const ledgerBy = by(ledger.json.entries), scoreBy = by(scores.json.entries),
    qualityBy = by(quality.json.entries), metaBy = by(metadata?.json.entries);
  const counts = {skills: catalog.json.skills.length, repositories: 0, score: emptyStates(),
    quality: emptyStates(), meta: emptyStates(true)};
  const grouped = new Map();
  const skills = catalog.json.skills.map(skill => {
    const led = ledgerBy.get(skill.id);
    if (!led) throw Error('Missing source ledger entry: ' + skill.id);
    const source = {state: led.status,
      url: led.status === 'verified' ? led.url : null,
      commit: led.status === 'verified' ? led.commit : null,
      checked_at: led.status === 'verified' ? led.checked_at : null,
      selection_reason: cleanText(led.selection_reason),
      reason: led.status === 'unresolved' ? cleanText(led.reason) : null};
    const score = scoreOf(scoreBy.get(skill.id), led, scores.json.evaluator);
    const qualityResult = qualityOf(qualityBy.get(skill.id), led, quality.json.tool.config_sha256);
    const meta = metaOf(metaBy.get(skill.id), led, skill.source_research);
    counts.score[score.state]++; counts.quality[qualityResult.state]++; counts.meta[meta.state]++;
    const record = {id: skill.id, repository: skill.repository, skill_name: skill.skill_name,
      source, meta: metaBy.has(skill.id) || skill.source_research ? meta : null,
      score, quality: qualityResult};
    if (!grouped.has(skill.repository)) grouped.set(skill.repository, []);
    grouped.get(skill.repository).push(record);
    return record;
  }).sort((a, b) => a.id.localeCompare(b.id, 'en'));
  counts.repositories = grouped.size;
  const repositories = [...grouped].map(([repository, members]) => {
    const evaluated = members.filter(s => s.score.state === 'current' && s.score.criteria);
    const mean = fn => evaluated.length ?
      evaluated.reduce((sum, s) => sum + fn(s.score), 0) / evaluated.length : null;
    return {repository, total: members.length, evaluated: evaluated.length,
      overall_score: mean(s => s.overall),
      criterion_scores: evaluated.length ?
        Object.fromEntries(CRITERIA.map(k => [k, mean(s => s.criteria[k])])) : null};
  }).sort((a, b) => a.repository.localeCompare(b.repository, 'en'));
  const timestamps = [scores.json.generated_at, quality.json.generated_at,
    ledger.json.audited_at, metadata?.json.generated_at].filter(Boolean);
  const manifest = {manifest_version: 1, catalog_id: catalog.json.catalog_id,
    generated_at: timestamps.sort().at(-1), source_commit: sourceCommit,
    counts, integrity: {
      mappings: sha256(mappings.bytes), rules: sha256(rules.bytes),
    }, skills, repositories};
  validateManifest(manifest, inputs);
  return manifest;
}

export function validateManifest(manifest, inputs) {
  const {skills, repositories, counts} = manifest;
  if (manifest.manifest_version !== 1 || !SHA.test(manifest.source_commit ?? '') ||
    manifest.catalog_id !== inputs.catalog.json.catalog_id ||
    manifest.integrity.mappings !== sha256(inputs.mappings.bytes) ||
    manifest.integrity.rules !== sha256(inputs.rules.bytes) ||
    skills.length !== counts.skills || repositories.length !== counts.repositories ||
    counts.skills !== inputs.catalog.json.skills.length) throw Error('Manifest header/integrity mismatch');
  for (const name of ['score', 'quality', 'meta']) {
    if (Object.values(counts[name]).reduce((a, b) => a + b, 0) !== counts.skills) {
      throw Error('Invalid ' + name + ' coverage counts');
    }
  }
  const ids = new Set();
  const grouped = new Map();
  for (const skill of skills) {
    if (ids.has(skill.id) || skill.id !== skill.repository + '/' + skill.skill_name ||
        !STATES.includes(skill.score.state) || !STATES.includes(skill.quality.state) ||
        (skill.meta !== null && !['current', 'stale', 'pending', 'unresolved'].includes(skill.meta.state)) ||
        (skill.score.state === 'current' &&
         (!validNumbers(skill.score.criteria) || !Number.isFinite(skill.score.overall))) ||
        (skill.source.state === 'verified' &&
         (!SHA.test(skill.source.commit ?? '') || !skill.source.url?.includes('/blob/' + skill.source.commit + '/')))) {
      throw Error('Invalid manifest skill: ' + skill.id);
    }
    ids.add(skill.id);
    if (!grouped.has(skill.repository)) grouped.set(skill.repository, []);
    grouped.get(skill.repository).push(skill);
  }
  for (const repo of repositories) {
    const members = grouped.get(repo.repository);
    const current = members?.filter(s => s.score.state === 'current') ?? [];
    if (!members || repo.total !== members.length || repo.evaluated !== current.length) {
      throw Error('Invalid repository coverage: ' + repo.repository);
    }
    const check = (actual, values) => {
      const expected = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
      if (expected === null ? actual !== null : !Number.isFinite(actual) || Math.abs(actual - expected) > 1e-10) {
        throw Error('Repository score mean differs: ' + repo.repository);
      }
    };
    check(repo.overall_score, current.map(s => s.score.overall));
    for (const key of CRITERIA) check(repo.criterion_scores?.[key] ?? null,
      current.map(s => s.score.criteria[key]));
  }
  if (Buffer.byteLength(JSON.stringify(manifest)) > MAX_BYTES) {
    throw Error('Manifest exceeds 1 MiB target: ' + Buffer.byteLength(JSON.stringify(manifest)) + ' bytes');
  }
  return true;
}

function sourceCommit() {
  const env = process.env.MANIFEST_SOURCE_COMMIT || process.env.GITHUB_SHA;
  return env || execFileSync('git', ['rev-parse', 'HEAD'], {cwd: ROOT, encoding: 'utf8'}).trim();
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2], args = process.argv.slice(3);
  if (!['--write', '--check', '--validate'].includes(mode) || args.length) {
    console.error('Usage: node scripts/manifest.mjs --write | --check | --validate');
    process.exitCode = 2;
  } else try {
    const inputs = loadInputs();
    const manifest = buildManifest(inputs, sourceCommit());
    const output = JSON.stringify(manifest) + '\n';
    if (mode === '--write') writeFileSync(resolve(ROOT, 'data/manifest.json'), output);
    // --validate also accepts a previously generated artifact, if one exists.
    if (mode === '--validate' && existsSync(resolve(ROOT, 'data/manifest.json'))) {
      validateManifest(JSON.parse(readFileSync(resolve(ROOT, 'data/manifest.json'), 'utf8')), inputs);
    }
    console.log('Manifest ' + mode.slice(2) + ': ' + manifest.skills.length + ' skills, ' +
      manifest.repositories.length + ' repositories, ' + Buffer.byteLength(output) + ' bytes');
  } catch (error) {
    console.error(error.stack ?? String(error));
    process.exitCode = 1;
  }
}
