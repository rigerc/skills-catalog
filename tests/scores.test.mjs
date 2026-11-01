import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {buildReport, buildRepositoryScores, checkScores, DEFAULTS, CRITERIA, evaluatorConfig, parseArgs} from '../scripts/evaluate-skills.mjs';
import {JEV_QUESTIONS, JEV_LIMITATIONS, jevConfig} from '../scripts/jev-evaluator.mjs';

const NOW = '2026-11-01T12:00:00Z';
const sha = 'a'.repeat(40);
const hash = 'b'.repeat(64);
const source = name => ({id: 'acme/skills/' + name, status: 'verified', commit: sha,
  url: 'https://github.com/acme/skills/blob/' + sha + '/skills/' + name + '/SKILL.md'});
const ledger = [source('one'), source('two')];
const catalog = {catalog_id: 'test', skills: ledger.map(({id}) => ({id}))};
const config = evaluatorConfig(parseArgs([]));
const prose = (s = ledger[0]) => ({id: s.id, status: 'evaluated', source: {url: s.url, commit: s.commit},
  evaluated_at: NOW, fingerprint: config.fingerprint, result_kind: 'prose_review', overall_score: 4,
  evaluation: {summary: 'A useful skill.', scores: Object.fromEntries(Object.keys(CRITERIA).map(key => [key, {score: 4, reason: 'Specific evidence.'}])),
    strengths: [], improvements: [], limitations: []}});
const report = (entries, evaluator = config) => buildReport(catalog, ledger, new Map(entries.map(e => [e.id, e])), evaluator);
const jevConfigValue = jevConfig(parseArgs(['--provider', 'jev']));
const jev = () => ({...prose(), fingerprint: jevConfigValue.fingerprint, result_kind: 'jev_scores', overall_score: 3.5,
  requested_model: 'jev-1.14.0', model: 'jev-1.14.0', endpoint: jevConfigValue.endpoint,
  original_state_sha256: hash, submitted_state_sha256: hash,
  evaluation: {scores: Object.fromEntries(Object.entries(JEV_QUESTIONS).map(([key, q]) => [key, {
    score: 3.5, native_score: 2.5, legend: Object.fromEntries(q.criteria.map((text, i) => [i, text])),
    probabilities: {'0': 0, '1': 0, '2': 0.5, '3': 0.5, '4': 0},
  }])), limitations: [...JEV_LIMITATIONS]}});
const failure = () => ({id: ledger[1].id, status: 'not_evaluated', source: {url: ledger[1].url, commit: sha},
  evaluated_at: NOW, fingerprint: config.fingerprint, error: {stage: 'evaluation', code: 'http_429', message: 'Rate limited'}});

let validate;
try {
  const {default: Ajv} = await import('ajv/dist/2020.js');
  validate = new Ajv({allErrors: true, strict: true, strictRequired: false})
    .compile(JSON.parse(readFileSync(new URL('../schemas/scores.schema.json', import.meta.url), 'utf8')));
} catch (error) {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
}

test('scores schema accepts generated prose, Jev, error, mixed and empty reports', {skip: !validate}, () => {
  for (const doc of [report([]), report([prose(), failure()]), report([jev()], jevConfigValue), report([jev(), {...prose(ledger[1])}])]) {
    assert.equal(validate(doc), true, JSON.stringify(validate.errors));
  }
  const unresolved = {...failure(), source: {url: null, commit: null}};
  assert.equal(validate(report([unresolved])), true, JSON.stringify(validate.errors));
  const saved = JSON.parse(readFileSync(new URL('../data/scores.json', import.meta.url), 'utf8'));
  assert.equal(validate(saved), true, JSON.stringify(validate.errors));
});

test('scores schema rejects incomplete results, invalid native values and prose/score confusion', {skip: !validate}, () => {
  for (const [original, mutate] of [
    [report([prose()]), d => {d.entries[0].evaluation.scores.safety.score = 3.5;}],
    [report([prose()]), d => {delete d.entries[0].source;}],
    [report([prose()]), d => {d.entries[0].source.commit = 'main';}],
    [report([prose()]), d => {delete d.entries[0].result_kind;}],
    [report([jev()], jevConfigValue), d => {d.entries[0].evaluation.scores.safety.native_score = 5;}],
    [report([jev()], jevConfigValue), d => {d.entries[0].evaluation.scores.safety.probabilities['0'] = -0.1;}],
    [report([jev()], jevConfigValue), d => {d.entries[0].evaluation.summary = 'Invented prose';}],
    [report([jev()], jevConfigValue), d => {delete d.entries[0].submitted_state_sha256;}],
    [report([failure()]), d => {d.entries[0].overall_score = 5;}],
    [report([failure()]), d => {delete d.entries[0].error;}],
    [report([]), d => {d.summary.pending = -1;}],
    [report([]), d => {d.evaluator.provider = 'unknown';}],
  ]) {
    const doc = structuredClone(original); mutate(doc);
    assert.equal(validate(doc), false, 'accepted ' + mutate.toString());
  }
});

test('offline score checks reject inconsistent means, distributions, fingerprints and coverage', () => {
  assert.deepEqual(checkScores(report([prose(), failure()]), catalog, ledger).problems, []);
  for (const [original, mutate] of [
    [report([prose()]), d => {d.entries[0].overall_score = 3;}],
    [report([prose()]), d => {d.evaluator.model = 'changed-without-fingerprint';}],
    [report([prose()]), d => {d.summary.total = 100;}],
    [report([prose()]), d => {d.summary.evaluated = 2; d.summary.pending = 0;}],
    [report([jev()], jevConfigValue), d => {d.entries[0].evaluation.scores.safety.score = 2;}],
    [report([jev()], jevConfigValue), d => {d.entries[0].evaluation.scores.safety.probabilities['0'] = 0.1;}],
    [report([prose()]), d => {d.entries[0].source.url = d.entries[0].source.url.replace(sha, 'main');}],
    [report([prose(), prose(ledger[1])]), d => {d.entries.reverse();}],
  ]) {
    const doc = structuredClone(original); mutate(doc);
    assert.ok(checkScores(doc, catalog, ledger).problems.length, 'accepted ' + mutate.toString());
  }
});

test('default scores path and offline mode combinations are explicit', () => {
  assert.equal(DEFAULTS.output, resolve('data/scores.json'));
  for (const args of [['--sync', '--dry-run'], ['--check', '--sync'], ['--sync', '--provider', 'jev'], ['--check', '--force']]) {
    assert.throws(() => parseArgs(args));
  }
});

test('repository means weight skills equally and expose partial and empty coverage', () => {
  const two = prose(ledger[1]);
  two.overall_score = 2;
  for (const score of Object.values(two.evaluation.scores)) score.score = 2;
  const third = {...source('three'), id: 'other/skills/three'};
  third.url = third.url.replace('acme/skills', 'other/skills');
  const sources = [...ledger, third, source('pending')];
  const cat = {catalog_id: 'test', skills: sources.map(({id}) => ({id, repository: id.split('/').slice(0, 2).join('/')}))};
  const entries = new Map([prose(), two].map(entry => [entry.id, entry]));
  const repos = buildRepositoryScores(cat, sources, entries, config);
  assert.deepEqual(repos.map(repo => repo.repository), ['acme/skills', 'other/skills']);
  assert.equal(repos[0].overall_score, 3);
  assert.deepEqual(repos[0].criterion_scores, Object.fromEntries(Object.keys(CRITERIA).map(key => [key, 3])));
  assert.deepEqual(repos[0].scored_skill_ids, ledger.map(s => s.id));
  assert.equal(repos[0].summary.total, 3);
  assert.equal(repos[0].summary.evaluated, 2);
  assert.equal(repos[0].summary.pending, 1);
  assert.equal(repos[1].overall_score, null);
  assert.equal(repos[1].criterion_scores, null);
  assert.deepEqual(repos[1].scored_skill_ids, []);
  assert.deepEqual(checkScores(buildReport(cat, sources, entries, config), cat, sources).problems, []);
  assert.deepEqual(buildRepositoryScores({...cat, skills: []}, [], entries, config), []);
});

test('repository scores exclude failed, repinned, different-evaluator, unresolved and retired skills', () => {
  const sources = [...ledger, source('failed'), source('model'), {...source('unresolved'), status: 'unresolved'}, source('pending')];
  const cat = {catalog_id: 'test', skills: sources.map(({id}) => ({id}))};
  const entries = [prose(), {...prose(ledger[1]), source: {url: ledger[1].url.replace(sha, 'c'.repeat(40)), commit: 'c'.repeat(40)}},
    {...failure(), id: sources[2].id, source: {url: sources[2].url, commit: sha}},
    {...prose(sources[3]), fingerprint: 'd'.repeat(64)}, prose(sources[4]), prose(source('retired'))];
  const doc = buildReport(cat, sources, new Map(entries.map(entry => [entry.id, entry])), config);
  assert.deepEqual(doc.repositories[0].summary, {total: 6, evaluated: 1, not_evaluated: 1, stale: 2, pending: 1, unresolved: 1});
  assert.deepEqual(doc.repositories[0].scored_skill_ids, [ledger[0].id]);
  assert.equal(doc.repositories[0].overall_score, 4);
  assert.deepEqual(checkScores(doc, cat, sources).problems, []);
  const native = report([jev()], jevConfigValue);
  assert.equal(native.repositories[0].overall_score, 3.5);
  assert.deepEqual(checkScores(native, catalog, ledger).problems, []);
});

test('offline checks reject tampered repository means, membership, ordering and coverage', () => {
  for (const mutate of [
    d => {d.repositories[0].overall_score = 5;},
    d => {d.repositories[0].criterion_scores.safety = 5;},
    d => {d.repositories[0].summary.total++;},
    d => {d.repositories[0].summary.evaluated = 0;},
    d => {d.repositories[0].scored_skill_ids = [ledger[1].id];},
    d => {d.repositories[0].repository = 'other/skills';},
    d => {d.repositories.push(structuredClone(d.repositories[0]));},
    d => {d.repositories = [];},
  ]) {
    const doc = report([prose()]); mutate(doc);
    assert.ok(checkScores(doc, catalog, ledger).problems.length, 'accepted ' + mutate.toString());
  }
  const empty = report([]);
  empty.repositories[0].overall_score = 1;
  assert.ok(checkScores(empty, catalog, ledger).problems.length);
  const snapshot = report([prose()]);
  assert.deepEqual(checkScores(snapshot, {...catalog, skills: []}, []).problems, [], 'saved snapshots may lag the catalog');
  delete snapshot.repositories;
  assert.deepEqual(checkScores(snapshot, catalog, ledger).problems, [], 'older v2 reports remain readable');
  if (validate) {
    for (const mutate of [
      d => {d.repositories[0].overall_score = 6;},
      d => {d.repositories[0].criterion_scores.safety = -1;},
      d => {d.repositories[0].scored_skill_ids.push(ledger[0].id);},
      d => {delete d.repositories[0].summary;},
    ]) {
      const doc = report([prose()]); mutate(doc);
      assert.equal(validate(doc), false, 'schema accepted ' + mutate.toString());
    }
  }
});

test('offline sync migrates legacy results, preserves scores, prunes retired skills and avoids no-op rewrites', () => {
  const dir = mkdtempSync(join(tmpdir(), 'scores-sync-'));
  try {
    for (const name of ['scripts', 'data', 'results']) mkdirSync(join(dir, name));
    for (const name of readdirSync(resolve('scripts')).filter(name => name.endsWith('.mjs'))) {
      copyFileSync(resolve('scripts', name), join(dir, 'scripts', name));
    }
    const write = (path, doc) => writeFileSync(join(dir, path), JSON.stringify(doc));
    write('data/catalog.json', catalog);
    write('data/catalog-source-ledger.json', {entries: ledger});
    const old = {...report([prose(), prose(ledger[1])]), schema_version: 1};
    for (const e of old.entries) delete e.result_kind;
    write('results/llm-evaluations.json', old);
    const output = join(dir, 'data/scores.json');
    const cli = (...args) => execFileSync(process.execPath, [join(dir, 'scripts/evaluate-skills.mjs'), ...args],
      {encoding: 'utf8', env: {...process.env, OPENAI_API_KEY: '', TYPESAFE_API_KEY: '', OPENROUTER_API_KEY: '', OPENCODE_API_KEY: ''}});
    cli('--dry-run');
    assert.equal(existsSync(output), false);
    cli('--sync');
    const first = readFileSync(output, 'utf8');
    const doc = JSON.parse(first);
    assert.equal(doc.schema_version, 2);
    assert.equal(doc.summary.evaluated, 2);
    assert.equal(doc.entries[0].evaluated_at, NOW);
    assert.equal(doc.entries[0].result_kind, 'prose_review');
    assert.equal(doc.repositories[0].overall_score, 4);
    assert.equal(doc.repositories[0].summary.evaluated, 2);
    assert.equal(readFileSync(join(dir, 'results/llm-evaluations.json'), 'utf8'), JSON.stringify(old));
    const modified = statSync(output).mtimeMs;
    assert.match(cli('--sync'), /No changes/);
    assert.equal(readFileSync(output, 'utf8'), first);
    assert.equal(statSync(output).mtimeMs, modified);
    cli('--check');
    write('data/catalog.json', {...catalog, skills: catalog.skills.slice(0, 1)});
    write('data/catalog-source-ledger.json', {entries: [{...ledger[0], commit: 'c'.repeat(40), url: ledger[0].url.replace(sha, 'c'.repeat(40))}]});
    cli('--check'); // catalog coverage may lag; old scores remain valid historical evidence
    cli('--sync');
    const refreshed = JSON.parse(readFileSync(output, 'utf8'));
    assert.equal(refreshed.entries.length, 1);
    assert.equal(refreshed.summary.total, 1);
    assert.equal(refreshed.summary.stale, 1);
    assert.equal(refreshed.repositories[0].overall_score, null);
    assert.deepEqual(refreshed.entries[0], doc.entries[0], 'sync must not rewrite score provenance or values');
    cli('--check');
  } finally {rmSync(dir, {recursive: true, force: true});}
});
