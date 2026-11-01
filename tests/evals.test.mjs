import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceGroup, detectFromPaths, inspect} from '../scripts/verify-evals.mjs';

const COMMIT = 'a'.repeat(40);
const entry = (name, dir) => ({id: 'org/repo/' + name, status: 'verified', commit: COMMIT,
  url: 'https://github.com/org/repo/blob/' + COMMIT + '/' + dir + 'SKILL.md'});
const blob = path => ({path, type: 'blob', mode: '100644'});
const script = path => ({path, type: 'blob', mode: '100755'});

test('detects only regular tracked files in the exact skill evals directory', () => {
  const a = sourceGroup(entry('one', 'skills/one/'));
  const b = sourceGroup(entry('two', 'skills/two/'));
  const paths = [blob('skills/one/SKILL.md'), blob('skills/two/SKILL.md'),
    blob('skills/one/evals/nested/test.json'), script('skills/two/evals/run.sh')];
  assert.equal(detectFromPaths(paths, a), true);
  assert.equal(detectFromPaths(paths, b), true);
  assert.equal(detectFromPaths(paths.filter(x => !x.path.startsWith('skills/two/evals/')), b), false);
  assert.equal(detectFromPaths([blob('skills/one/SKILL.md'),
    {path: 'skills/one/evals/link', type: 'blob', mode: '120000'}], a), false);
  assert.throws(() => detectFromPaths(paths.filter(x => x.path !== a.skillPath), a), /missing/);
});

test('rejects mismatched source pins and unresolved skills', () => {
  assert.throws(() => sourceGroup({...entry('one', 'skills/one/'), commit: 'b'.repeat(40)}), /Unverified/);
  assert.throws(() => sourceGroup({...entry('one', 'skills/one/'), status: 'unresolved'}), /Unverified/);
});

test('inspects non-truncated pinned trees without fetching unselected skill blobs', async () => {
  const calls = [];
  const results = await inspect([entry('one','skills/one/'), entry('two','skills/two/')], async (repo, sha, recursive) => {
    calls.push([repo,sha,recursive]);
    return {tree:[blob('skills/one/SKILL.md'), blob('skills/two/SKILL.md'),
      blob('skills/one/evals/test.json'),blob('skills/three/evals/other.json')],truncated:false};
  });
  assert.deepEqual(results.map(x => x.has_evals), [true,false]);
  assert.deepEqual(calls, [['org/repo',COMMIT,true]]);
});

test('truncated upstream trees are inspected through non-recursive subtrees', async () => {
  const tree = {
    [COMMIT]: [{path:'skills',type:'tree',sha:'skills-sha'}],
    'skills-sha': [{path:'one',type:'tree',sha:'one-sha'},{path:'two',type:'tree',sha:'two-sha'}],
    'one-sha': [blob('SKILL.md'),{path:'evals',type:'tree',sha:'evals-sha'}],
    'two-sha': [blob('SKILL.md')],
    'evals-sha': [{path:'nested',type:'tree',sha:'nested-sha'}],
    'nested-sha': [{path:'script.sh',type:'blob',mode:'100755'}]
  };
  const results = await inspect([entry('one','skills/one/'),entry('two','skills/two/')],async (repo,sha,recursive) =>
    recursive ? {truncated:true,tree:[]} : {truncated:false,tree:tree[sha]});
  assert.deepEqual(results.map(x=>x.has_evals),[true,false]);
});
