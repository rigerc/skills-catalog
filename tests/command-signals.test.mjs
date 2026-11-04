import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import {load,validate} from '../scripts/catalog.mjs';
import {compile,minimumNoseyVersion} from '../scripts/compile-catalog.mjs';

const detection=JSON.parse(readFileSync(new URL('../schemas/technology-detection-rules.schema.json',import.meta.url),'utf8'));
const command=detection.properties.rules.items.properties.signals.items.oneOf.find(s=>s.properties.type.const==='command');
const check=new Ajv2020({strict:true,allErrors:true,strictRequired:false}).compile(command);
const manifestSchema=JSON.parse(readFileSync(new URL('../schemas/manifest.schema.json',import.meta.url),'utf8'));
const manifestSignal=manifestSchema.properties.rules.items.properties.signals.items;
const checkManifestSignal=new Ajv2020({strict:true,allErrors:true,strictRequired:false}).compile(manifestSignal);

test('availability and output probes share the same source and manifest contract',()=>{
  for(const signal of [
    {type:'command',name:'docker'},
    {type:'command',name:'docker',args:['--version'],regex:'^Docker version \\d+',stream:'stdout',case_sensitive:true},
    {type:'command',name:'tool',args:[]},
    {type:'command',name:'tool',args:[],regex:'ready',stream:'combined'}
  ]){
    assert.equal(check(signal),true,JSON.stringify(check.errors));
    assert.equal(checkManifestSignal(signal),true,JSON.stringify(checkManifestSignal.errors));
    const {c,m,l,d}=load();d.rules[0].signals=[signal];
    assert.doesNotThrow(()=>validate(c,m,l,d));
  }
});

test('command shapes reject paths, shell strings, unbounded arguments and output without execution',()=>{
  for(const signal of [
    {type:'command',name:'../docker'},
    {type:'command',name:'docker --version'},
    {type:'command',name:'docker',args:'--version'},
    {type:'command',name:'docker',args:['\0']},
    {type:'command',name:'docker',args:Array(33).fill('x')},
    {type:'command',name:'docker',args:['x'.repeat(1025)]},
    {type:'command',name:'docker',regex:'version'},
    {type:'command',name:'docker',args:[],stream:'stderr'},
    {type:'command',name:'docker',args:[],regex:'x',stream:'other'},
    {type:'command',name:'docker',args:[],regex:'x'.repeat(1025)},
    {type:'command',name:'docker',shell:true}
  ]){
    assert.equal(check(signal),false,JSON.stringify(signal));
    assert.equal(checkManifestSignal(signal),false,JSON.stringify(signal));
  }
});

test('catalog semantics reject malformed regexes without running programs',()=>{
  for(const signal of [
    {type:'command',name:'docker',args:[],regex:'['},
    {type:'command',name:'../docker'},
    {type:'command',name:'docker',regex:'version'},
    {type:'command',name:'docker',args:['\0']}
  ]){
    const {c,m,l,d}=load();d.rules[0].signals=[signal];
    assert.throws(()=>validate(c,m,l,d),/invalid command/);
  }
});

test('command rules require the development consumer and declare a valid manifest capability',()=>{
  assert.equal(minimumNoseyVersion([{signals:[{type:'path',path:'Dockerfile'}]}]),'0.5.0');
  assert.equal(minimumNoseyVersion([{signals:[{type:'command',name:'docker'}]}]),'0.6.0-dev.0');
  assert.ok(manifestSchema.properties.required_capabilities.items.enum.includes('command'));
  assert.match('0.6.0-dev.0',new RegExp(manifestSchema.properties.minimum_nosey_version.pattern));
  const catalog=load();
  catalog.d.rules[0].signals=[{type:'command',name:'node',args:['--version'],regex:'^v\\d+\\.'}];
  const manifest=compile({revision:'a'.repeat(40),asOf:'2026-11-04',catalog});
  assert.equal(manifest.minimum_nosey_version,'0.6.0-dev.0');
  assert.ok(manifest.required_capabilities.includes('command'));
  const checkManifest=new Ajv2020({strict:false,allErrors:true}).compile(manifestSchema);
  assert.equal(checkManifest(manifest),true,JSON.stringify(checkManifest.errors));
});
