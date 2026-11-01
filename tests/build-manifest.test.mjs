import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {mkdtempSync, readFileSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

const ROOT = new URL('../', import.meta.url).pathname;
const SCRIPT = join(ROOT, 'scripts/build-manifest.mjs');
const A = 'a'.repeat(40), B = 'b'.repeat(40);
function command(args) {
  const result = spawnSync(process.execPath, [SCRIPT, '--root', ROOT, ...args], {encoding:'utf8'});
  assert.equal(result.status, 0, result.stderr);
}
test('bot-only commits leave all dataset hashes and cohort identity unchanged', () => {
  const dir = mkdtempSync(join(tmpdir(), 'nosey-manifest-'));
  try {
    const a = join(dir,'a'), b = join(dir,'b');
    command(['--out',a,'--commit',A,'--published-at','2026-11-01T00:00:00Z']);
    command(['--out',b,'--commit',B,'--published-at','2026-11-02T00:00:00Z']);
    const first = JSON.parse(readFileSync(join(a,'manifest.json')));
    const second = JSON.parse(readFileSync(join(b,'manifest.json')));
    assert.deepEqual(first.datasets, second.datasets);
    assert.equal(first.cohort_id, second.cohort_id);
    assert.notEqual(first.commit, second.commit);
    const pointer = JSON.parse(readFileSync(join(a,'latest.json')));
    assert.ok(Buffer.byteLength(readFileSync(join(a,'latest.json'))) <= 1024);
    assert.ok(Buffer.byteLength(readFileSync(join(a,'manifest.json'))) <= 65536);
    assert.equal(pointer.commit, A);
    assert.equal(first.datasets.length, 6);
    assert.ok(first.datasets.every(d => d.data.sha256.length === 64 && d.schema.sha256.length === 64));
    assert.equal('skills' in first, false);
    command(['--verify',a]);
  } finally {rmSync(dir,{recursive:true,force:true});}
});
test('a tampered manifest fails pointer hash verification', () => {
  const dir = mkdtempSync(join(tmpdir(), 'nosey-manifest-negative-'));
  try {
    command(['--out',dir,'--commit',A]);
    const path=join(dir,'manifest.json');
    writeFileSync(path,readFileSync(path,'utf8')+' ');
    const result=spawnSync(process.execPath,[SCRIPT,'--root',ROOT,'--verify',dir],{encoding:'utf8'});
    assert.notEqual(result.status,0);
  } finally {rmSync(dir,{recursive:true,force:true});}
});
