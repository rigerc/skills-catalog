import test from 'node:test';
import assert from 'node:assert/strict';
import {buildManifest,loadInputs,validateManifest,scoreOf,qualityOf,metaOf,CRITERIA,
  cleanText} from '../scripts/manifest.mjs';

const SHA = '0123456789abcdef0123456789abcdef01234567';
const inputs = loadInputs();
const manifest = buildManifest(inputs, SHA);

test('manifest is a deterministic, skills-only artifact', () => {
  const again = buildManifest(inputs, SHA);
  assert.deepEqual(manifest, again);
  assert.equal(manifest.manifest_version, 1);
  assert.equal(manifest.source_commit, SHA);
  assert.equal(manifest.skills.length, inputs.catalog.json.skills.length);
  assert.equal(manifest.repositories.length, new Set(manifest.skills.map(s => s.repository)).size);
  assert.ok(Buffer.byteLength(JSON.stringify(manifest)) < 1024 * 1024);
  for (const skill of manifest.skills) {
    assert.deepEqual(Object.keys(skill), ['id','repository','skill_name','source','meta','score','quality']);
    assert.equal(Object.hasOwn(skill, 'recommended_for'), false);
    assert.equal(Object.hasOwn(skill, 'attribution'), false);
  }
  assert.ok(!('technologies' in manifest));
  assert.ok(!('rules' in manifest));
  assert.ok(!('frontend' in manifest));
  assert.ok(validateManifest(manifest, inputs));
});

test('coverage accounts for pending and not-evaluated without invented scores', () => {
  assert.equal(Object.values(manifest.counts.score).reduce((a,b) => a+b,0), manifest.skills.length);
  assert.equal(Object.values(manifest.counts.quality).reduce((a,b) => a+b,0), manifest.skills.length);
  assert.equal(manifest.counts.score.pending > 0, true);
  const missing = manifest.skills.find(s => s.score.state === 'pending');
  assert.equal(missing.score.overall, null);
  assert.equal(missing.score.criteria, null);
  const noVerdict = manifest.skills.find(s => s.score.state === 'not_evaluated');
  assert.ok(noVerdict);
  assert.equal(noVerdict.score.overall, null);
});

test('repository averages are catalog-wide means of current scores only', () => {
  for (const repo of manifest.repositories) {
    const skills = manifest.skills.filter(s => s.repository === repo.repository);
    const current = skills.filter(s => s.score.state === 'current');
    assert.equal(repo.total, skills.length);
    assert.equal(repo.evaluated, current.length);
    assert.equal(repo.overall_score, current.length ?
      current.reduce((a,s) => a+s.score.overall,0)/current.length : null);
    for (const criterion of CRITERIA) {
      assert.equal(repo.criterion_scores?.[criterion] ?? null, current.length ?
        current.reduce((a,s) => a+s.score.criteria[criterion],0)/current.length : null);
    }
  }
});

test('quality keeps exact source counts, caps findings, uses a boolean truncation flag', () => {
  for (const s of manifest.skills) {
    assert.equal(typeof s.quality.findings_truncated, 'boolean');
    if (s.quality.findings) {
      assert.ok(s.quality.findings.length <= 5);
      assert.ok(s.quality.findings.every(f => [...f.message].length <= 200));
    }
  }
});

test('exact source join accepts ledger path and case-insensitive GitHub repository', () => {
  const ledger = inputs.ledger.json.entries.find(s =>
    s.status === 'verified' && s.id.startsWith('affaan-m/'));
  assert.ok(ledger, 'expected exact-ID alias fixture');
  const result = inputs.quality.json.entries.find(e => e.id === ledger.id);
  assert.ok(result);
  assert.equal(qualityOf(result, ledger, inputs.quality.json.tool.config_sha256).state,
    result.status === 'not_evaluated' ? 'not_evaluated' : 'current');
  assert.equal(qualityOf({...result, source:{...result.source, commit: SHA}}, ledger,
    inputs.quality.json.tool.config_sha256).state, 'stale');
});

test('scores become stale if source commit or evaluator fingerprint changes', () => {
  const row = inputs.scores.json.entries.find(s => s.status === 'evaluated');
  const ledger = inputs.ledger.json.entries.find(e => e.id === row.id);
  const config = inputs.scores.json.evaluator;
  assert.equal(scoreOf(row, ledger, config).state, 'current');
  assert.equal(scoreOf({...row, fingerprint:'0'.repeat(64)}, ledger, config).state, 'stale');
  assert.equal(scoreOf({...row, source:{...row.source, commit:SHA}}, ledger, config).state, 'stale');
});

test('metadata supports partial backfill, source repins and missing frontmatter', () => {
  const ledger = inputs.ledger.json.entries.find(s => s.status === 'verified');
  assert.equal(metaOf(null, ledger, null).state, 'pending');
  const entry = {read_at_commit:ledger.commit, description:'line\n' + 'a'.repeat(320)};
  const current = metaOf(entry, ledger, null);
  assert.equal(current.state, 'current');
  assert.equal(current.name, null);
  assert.equal([...current.description].length, 300);
  assert.equal(metaOf({...entry, read_at_commit:SHA},ledger,null).state,'stale');
  assert.equal(cleanText('\u0000hi\tthere'), 'hi there');
});

test('manifest validation rejects changed companion hashes and wrong repository means', () => {
  const corrupt = structuredClone(manifest);
  corrupt.integrity.rules='0'.repeat(64);
  assert.throws(() => validateManifest(corrupt, inputs), /integrity/);
  const corruptMean = structuredClone(manifest);
  const scored = corruptMean.repositories.find(r => r.evaluated > 0);
  scored.overall_score += 0.25;
  assert.throws(() => validateManifest(corruptMean, inputs), /mean differs/);
});
