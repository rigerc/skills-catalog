import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {
  fingerprint, toolBlock, mapReport, selectTargets, skillLocation, buildDoc, serialize, checkDoc,
  classifyGitFailure, evaluate, summarize, gateVerdict, findWaiver, coverageOf, planTrees, run, LIMITS, TOOL,
} from '../scripts/quality.mjs';

const NOW = '2026-11-01T12:00:00Z';
const sha = c => c.repeat(40);
const ledgerEntry = (repo, path, commit) => ({id: repo + '/' + path.split('/').slice(-2)[0], status: 'verified',
  commit, url: 'https://github.com/' + repo + '/blob/' + commit + '/' + path});

const sample = {
  results: [
    {level: 'pass', category: 'Structure', message: 'SKILL.md found', file: 'SKILL.md'},
    {level: 'warning', category: 'Tokens', message: 'big', file: 'SKILL.md'},
    {level: 'error', category: 'Structure', message: 'broken internal link: x.md (file not found)', file: 'SKILL.md', line: 7},
    {level: 'info', category: 'Structure', message: 'fyi'},
  ],
  token_counts: {files: [{file: 'SKILL.md body', tokens: 100}, {file: 'references/a.md', tokens: 50}, {file: 'assets/t.md', tokens: 5}], total: 155},
  other_token_counts: {files: [], total: 20},
  content_analysis: {word_count: 10, code_block_ratio: 0.25, code_languages: ['sh', 'py', 'sh'], imperative_ratio: 0.35,
    information_density: 0.3, instruction_specificity: 0.78},
  contamination_analysis: {contamination_level: 'medium', contamination_score: 0.35, language_mismatch: true, scope_breadth: 4,
    multi_interface_tools: ['mongodb'], mismatched_categories: []},
};

test('fingerprint tracks version and flags', () => {
  assert.equal(fingerprint(), fingerprint({...TOOL, flags: [...TOOL.flags]}));
  assert.notEqual(fingerprint(), fingerprint({...TOOL, version: 'v9.9.9'}));
  assert.notEqual(fingerprint(), fingerprint({...TOOL, flags: []}));
});

test('mapReport drops passes, derives status, counts and metrics', () => {
  const m = mapReport(sample);
  assert.equal(m.status, 'fail');
  assert.deepEqual(m.counts, {errors: 1, warnings: 1, infos: 1});
  assert.deepEqual(m.findings.map(f => f.level), ['error', 'warning', 'info']);
  assert.equal(m.findings[0].line, 7);
  assert.deepEqual(m.metrics.tokens, {skill_md: 100, references: 50, other: 25, total: 175});
  assert.deepEqual(m.metrics.content.code_languages, ['py', 'sh']);
  assert.equal(m.metrics.contamination.level, 'medium');
  assert.equal(mapReport({results: [], content_analysis: undefined}).status, 'pass');
});

test('mapReport caps findings but keeps exact counts', () => {
  const results = Array.from({length: 250}, (_, i) => ({level: 'warning', category: 'X', message: 'm' + i}));
  const m = mapReport({results});
  assert.equal(m.findings.length, 200);
  assert.equal(m.counts.warnings, 250);
  assert.equal(m.findings_truncated, true);
});

test('selectTargets re-evaluates only missing, repinned, or retryable entries', () => {
  const a = ledgerEntry('o/r', 'skills/a/SKILL.md', sha('a'));
  const b = ledgerEntry('o/r', 'skills/b/SKILL.md', sha('a'));
  const c = ledgerEntry('o/r', 'skills/c/SKILL.md', sha('a'));
  const d = ledgerEntry('o/r', 'skills/d/SKILL.md', sha('a'));
  const fp = fingerprint();
  const cached = (e, over = {}) => ({id: e.id, status: 'pass', fingerprint: fp,
    source: {repository: 'o/r', path: skillLocation(e).path, commit: e.commit}, ...over});
  const cache = new Map([
    [a.id, cached(a)],
    [b.id, cached(b, {source: {repository: 'o/r', path: 'skills/b/SKILL.md', commit: sha('b')}})],
    [c.id, cached(c, {status: 'not_evaluated', not_evaluated: {code: 'throttled', message: 'x'}})],
    [d.id, cached(d, {status: 'not_evaluated', not_evaluated: {code: 'upstream_missing', message: 'x'}})],
  ]);
  const ids = selectTargets([a, b, c, d, {id: 'u', status: 'unresolved'}], cache).map(t => t.id);
  assert.deepEqual(ids, [b.id, c.id]);
  assert.equal(selectTargets([a], cache, {all: true}).length, 1);
  assert.equal(selectTargets([a], new Map(), {fp: 'other'}).length, 1);
});

test('buildDoc sorts, prunes, and only moves generated_at on change', () => {
  const ledger = [ledgerEntry('o/r', 'skills/a/SKILL.md', sha('a')), ledgerEntry('o/r', 'skills/b/SKILL.md', sha('a'))];
  const entry = id => ({id, status: 'pass', source: {repository: 'o/r', path: 'skills/' + id.split('/').pop() + '/SKILL.md', commit: sha('a')},
    fingerprint: fingerprint(), evaluated_at: NOW, counts: {errors: 0, warnings: 0, infos: 0}, findings: []});
  const prev = {schema_version: 1, catalog_id: 'c', generated_at: '2026-01-01T00:00:00Z', tool: toolBlock(),
    summary: summarize([]), entries: []};
  const one = buildDoc(prev, [entry(ledger[1].id), entry(ledger[0].id)], ledger, {now: NOW});
  assert.deepEqual(one.entries.map(e => e.id), [ledger[0].id, ledger[1].id]);
  assert.equal(one.generated_at, NOW);
  const same = buildDoc(one, [], ledger, {now: '2027-01-01T00:00:00Z'});
  assert.equal(same.generated_at, NOW);
  const pruned = buildDoc(one, [], [ledger[0]], {now: '2027-01-01T00:00:00Z'});
  assert.equal(pruned.entries.length, 1);
  assert.deepEqual(JSON.parse(serialize(one)), one);
  assert.deepEqual(checkDoc(one, ledger).problems, []);
  const broken = structuredClone(one);
  broken.entries[0].status = 'fail';
  broken.summary.total = 9;
  assert.ok(checkDoc(broken, ledger).problems.length >= 2);
});

test('git failures are classified for throttling vs missing vs generic', () => {
  assert.equal(classifyGitFailure({err: 'HTTP 429 Too Many Requests'}), 'throttled');
  assert.equal(classifyGitFailure({err: 'fatal: remote error: upload-pack: not our ref abc'}), 'upstream_missing');
  assert.equal(classifyGitFailure({err: 'fatal: unable to access: Could not resolve host'}), 'network_error');
  assert.equal(classifyGitFailure({timedOut: true}), 'timeout');
});

/* Real git, local file:// "GitHub", fake validator: proves full-directory fetches. */
const gitOk = (() => {try {execFileSync('git', ['--version']); return true;} catch {return false;}})();
test('fetches full skill directories (nested files, root skills) via sparse blobless git', {skip: !gitOk}, async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'qtest-'));
  try {
    const mk = (repo, files) => {
      const dir = join(tmp, 'git', repo + '.git');
      mkdirSync(dir, {recursive: true});
      const g = (...a) => execFileSync('git', ['-C', dir, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a], {encoding: 'utf8'});
      g('init', '-q');
      g('config', 'uploadpack.allowFilter', 'true');
      g('config', 'uploadpack.allowAnySHA1InWant', 'true');
      for (const [path, text] of Object.entries(files)) {
        mkdirSync(join(dir, path, '..'), {recursive: true});
        writeFileSync(join(dir, path), text);
      }
      g('add', '-A'); g('commit', '-qm', 'x');
      return {commit: g('rev-parse', 'HEAD').trim(), tree: p => g('rev-parse', 'HEAD:' + p).trim()};
    };
    const multi = mk('acme/multi', {
      'skills/foo/SKILL.md': '---\nname: foo\n---\n',
      'skills/foo/references/deep/guide.md': 'g',
      'skills/foo/scripts/run.sh': 'echo',
      'skills/foo/extra/notes.txt': 'n',
      'skills/foo/.hidden/config.json': 'hidden',
      'skills/foo/custom/deep/other.txt': 'arbitrary',
      'README.md': 'repository-wide unrelated content',
      'skills/other/SKILL.md': 'x',   // not in catalog: must not be fetched
      'skills/other/big.bin': 'x',
    });
    const root = mk('acme/rootskill', {'SKILL.md': 's', 'references/r.md': 'r', 'docs/more.md': 'm', 'README.md': 'rd'});
    const bin = join(tmp, 'fake-validator.sh');
    // Reports which files exist in the skill dir, so the test can assert what was fetched.
    writeFileSync(bin, `#!/bin/sh
for last; do :; done
files=$(cd "$last" && find . -type f -not -path './.git/*' | sort | tr '\\n' ' ')
printf '{"skill_dir":"x","passed":true,"errors":0,"warnings":1,"results":[{"level":"warning","category":"Test","message":"files: %s"}]}' "$files"
exit 2
`);
    chmodSync(bin, 0o755);
    const entries = [
      ledgerEntry('acme/multi', 'skills/foo/SKILL.md', multi.commit),
      ledgerEntry('acme/rootskill', 'SKILL.md', root.commit),
    ];
    const targets = selectTargets(entries, new Map());
    const result = await evaluate(targets, {now: NOW, base: 'file://' + join(tmp, 'git') + '/', bin});
    assert.equal(result.fetches, 2);
    const foo = result.entries.find(e => e.id === entries[0].id);
    assert.equal(foo.status, 'warn');
    assert.equal(foo.source.tree_sha, multi.tree('skills/foo'));
    const fooFiles = foo.findings[0].message;
    for (const f of ['skills/foo/SKILL.md'.replace('skills/foo/', ''), 'references/deep/guide.md', 'scripts/run.sh', 'extra/notes.txt', '.hidden/config.json', 'custom/deep/other.txt']) {
      assert.ok(fooFiles.includes('./' + f), f + ' missing from ' + fooFiles);
    }
    const rootEntry = result.entries.find(e => e.id === entries[1].id);
    assert.ok(rootEntry.findings[0].message.includes('./docs/more.md'), 'root skill must fetch the whole tree');
    assert.ok(rootEntry.source.tree_sha, 'root skill records the repository tree sha');
    // The un-cataloged sibling skill was never downloaded.
    assert.ok(!fooFiles.includes('./README.md'), 'unrelated root files must be excluded');
    assert.ok(!fooFiles.includes('./skills/other'), 'unrelated sibling skills must be excluded');
    // Fetch failure for a bad commit becomes not_evaluated, not a crash.
    const bad = await evaluate(selectTargets([ledgerEntry('acme/multi', 'skills/foo/SKILL.md', sha('e'))], new Map()),
      {now: NOW, base: 'file://' + join(tmp, 'git') + '/', bin});
    assert.equal(bad.entries[0].status, 'not_evaluated');
    assert.ok(existsSync(tmp));
  } finally {
    rmSync(tmp, {recursive: true, force: true});
  }
});


test('gate blocks not_evaluated and skipped targets, waives only matching commits', () => {
  const entry = {id:'acme/r/foo',status:'not_evaluated',source:{repository:'acme/r',path:'foo/SKILL.md',commit:sha('a')},not_evaluated:{code:'throttled',message:'rate limit'}};
  const waiver={id:entry.id,commit:sha('a'),applies_to:['not_evaluated'],reason:'upstream is temporarily unavailable',reviewed_by:'reviewer'};
  assert.equal(gateVerdict([entry],{skippedIds:['acme/r/other']}).blocking.length, 1);
  assert.equal(gateVerdict([entry],{skippedIds:['acme/r/other']}).unattempted.length, 1);
  assert.equal(gateVerdict([entry],{waivers:[waiver]}).waived.length, 1);
  assert.equal(findWaiver([{...waiver,commit:sha('b')}],entry),null);
});

test('coverage tracks missing and orphan entries without enforcing coverage', () => {
  const a=ledgerEntry('o/r','skills/a/SKILL.md',sha('a'));
  const orphan={id:'x/y/z',status:'not_evaluated',source:{repository:'x/y',path:'SKILL.md',commit:sha('b')},fingerprint:fingerprint(),not_evaluated:{code:'throttled',message:'too many'}};
  assert.deepEqual(coverageOf([orphan],[a]),{verified:1,current:0,stale:0,missing:1,orphan:1});
});

test('preflight rejects large files before blob checkout', {skip: !gitOk}, async () => {
  const tmp=mkdtempSync(join(tmpdir(),'q-limit-'));
  try {
    const repo=join(tmp,'git','acme','big.git');
    mkdirSync(repo,{recursive:true});
    const git=(...a)=>execFileSync('git',['-C',repo,'-c','user.name=t','-c','user.email=t@t',...a],{encoding:'utf8'});
    git('init','-q');git('config','uploadpack.allowFilter','true');git('config','uploadpack.allowAnySHA1InWant','true');
    mkdirSync(join(repo,'skills','foo'),{recursive:true});
    writeFileSync(join(repo,'skills','foo','SKILL.md'),'---\nname: foo\n---\n');
    writeFileSync(join(repo,'skills','foo','large.dat'),'x'.repeat(1000));
    git('add','-A');git('commit','-qm','big');
    const entry=ledgerEntry('acme/big','skills/foo/SKILL.md',git('rev-parse','HEAD').trim());
    const target=selectTargets([entry],new Map());
    const out=await evaluate(target,{now:NOW,base:'file://'+join(tmp,'git')+'/',limits:{...LIMITS,maxBytesPerSkill:100,minSpacingMs:0}});
    assert.equal(out.entries[0].status,'not_evaluated');
    assert.equal(out.entries[0].not_evaluated.code,'resource_limit');
    assert.equal(out.totals.resourceLimited,1);
  } finally {rmSync(tmp,{recursive:true,force:true});}
});

test('Git preflight enumerates paths without requesting blob sizes', async () => {
  const args = [];
  const git = async command => {
    args.push(command);
    return {code: 0, out: '100644 blob ' + sha('a') + '\tSKILL.md\0' +
      '100644 blob ' + sha('b') + '\tcustom/deep/example.txt\0', err: '', timedOut: false};
  };
  const planned = await planTrees(git, [{dir: 'skills/first'}]);
  assert.equal(planned.ok, true);
  assert.equal(planned.stats.get('skills/first').files, 2);
  assert.ok(args.every(a => !a.includes('-l')), 'ls-tree -l triggers lazy blob hydration in partial clones');
  assert.ok(args.some(a => a.includes('FETCH_HEAD:skills/first')), 'preflight should enumerate only the selected directory');
});

test('repository evaluation respects the overall run deadline', async () => {
  const loc = {id: 'a/b/c', repo: 'a/b', commit: sha('a'), path: 'skills/c/SKILL.md', dir: 'skills/c'};
  const result = await evaluate([loc], {now: NOW, deadline: Date.now() - 1000});
  assert.equal(result.fetches, 0);
  assert.equal(result.stopped, 'deadline');
  assert.deepEqual(result.skippedIds, [loc.id]);
});
