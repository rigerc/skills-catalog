import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
test('Pages release keeps the existing UI and all five JSON contracts',()=>{
  const dir=mkdtempSync(join(tmpdir(),'nosey-pages-'));
  try{
    const source=join(dir,'manifest.json'),site=join(dir,'site');
    const manifest={manifest_version:{major:1,minor:0},catalog_id:'nosey-built-in',
      source_revision:'a'.repeat(40),skills:[],rules:[],technologies:[],combinations:[]};
    writeFileSync(source,JSON.stringify(manifest)+'\n');
    execFileSync(process.execPath,[join(root,'scripts/stage-pages.mjs'),'--in',source,'--site',site]);
    assert.equal(readFileSync(join(site,'index.html'),'utf8'),readFileSync(join(root,'site/index.html'),'utf8'));
    for(const name of ['catalog.json','mappings.json','catalog-source-ledger.json','quality.json','scores.json']){
      assert.ok(existsSync(join(site,'data',name)));
      assert.deepEqual(JSON.parse(readFileSync(join(site,'data',name),'utf8')),
        JSON.parse(readFileSync(join(root,'data',name),'utf8')));
    }
    const pointer=JSON.parse(readFileSync(join(site,'latest.json'),'utf8'));
    const bytes=readFileSync(source);
    const digest=createHash('sha256').update(bytes).digest('hex');
    assert.equal(pointer.artifact.sha256,digest);
    assert.equal(pointer.artifact.size_bytes,bytes.length);
    assert.ok(readFileSync(join(site,pointer.artifact.path)).equals(bytes));
    assert.ok(existsSync(join(site,'.nojekyll')));
    // Simulate a later deployment against a restored historical manifests directory.
    writeFileSync(source,JSON.stringify({...manifest,source_revision:'b'.repeat(40)})+'\n');
    execFileSync(process.execPath,[join(root,'scripts/stage-pages.mjs'),'--in',source,'--site',site]);
    assert.ok(existsSync(join(site,'manifests','sha256-'+digest+'.json')));
  }finally{rmSync(dir,{recursive:true,force:true});}
});
