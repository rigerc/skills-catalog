#!/usr/bin/env node
/** Stage the original browsing site plus immutable manifest distribution. */
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,cpSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const args=process.argv.slice(2),val=k=>args[args.indexOf(k)+1];
const src=resolve(root,args.includes('--in')?val('--in'):'dist/manifest.json');
const target=resolve(root,args.includes('--site')?val('--site'):'dist/site');
const original=resolve(root,'site');
const bytes=readFileSync(src),manifest=JSON.parse(bytes);
const digest=createHash('sha256').update(bytes).digest('hex');
const name='sha256-'+digest+'.json',archive=join(target,'manifests');
mkdirSync(archive,{recursive:true});
if(!existsSync(join(original,'index.html')))throw Error('The existing browsing site is missing');
cpSync(original,target,{recursive:true,force:true});
mkdirSync(join(target,'data'),{recursive:true});
for(const file of ['catalog.json','mappings.json','catalog-source-ledger.json','quality.json','scores.json']){
 const originalFile=join(root,'data',file);
 if(!existsSync(originalFile))throw Error('Existing browser data missing: '+file);
 copyFileSync(originalFile,join(target,'data',file));
}
if(existsSync(join(archive,name))&&!readFileSync(join(archive,name)).equals(bytes))
 throw Error('Immutable digest collision');
copyFileSync(src,join(archive,name));
const pointer={pointer_version:1,catalog_id:manifest.catalog_id,source_revision:manifest.source_revision,
 manifest_version:manifest.manifest_version,artifact:{path:'manifests/'+name,sha256:digest,size_bytes:bytes.length}};
writeFileSync(join(target,'latest.json'),JSON.stringify(pointer)+'\n');
writeFileSync(join(target,'.nojekyll'),'');
for(const file of ['index.html','data/catalog.json','data/mappings.json','data/catalog-source-ledger.json','data/quality.json','data/scores.json','latest.json','manifests/'+name]){
 if(!existsSync(join(target,file)))throw Error('Pages artifact missing '+file);
}
console.log('Preserved site and 5 data URLs; staged '+name);
