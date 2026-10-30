import test from 'node:test';
import assert from 'node:assert/strict';
import {load,validate,render} from '../scripts/catalog.mjs';
test('valid snapshot and rendering',()=>{const {c,m,l,d}=load();assert.equal(validate(c,m,l,d).skills,c.skills.length);assert.match(render(c,m,l,d)['README.md'],/Canonical data source/)});
test('invalid mapping reference rejected',()=>{const {c,m,l,d}=load();m.technologies[0].skill_ids=['not-real/skill'];assert.throws(()=>validate(c,m,l,d),/unknown skill/)});
test('missing detection rejected',()=>{const {c,m,l,d}=load();d.rules.pop();assert.throws(()=>validate(c,m,l,d),/missing detection rule/)});
test('unverified source cannot pretend to be verified',()=>{const {c,m,l,d}=load();const e=l.entries.find(x=>x.status==='unresolved');e.status='verified';e.url='https://github.com/a/b/blob/main/SKILL.md';e.commit='bad';assert.throws(()=>validate(c,m,l,d),/bad verified source/)});
test('duplicate skill rejected',()=>{const {c,m,l,d}=load();c.skills.push(structuredClone(c.skills[0]));assert.throws(()=>validate(c,m,l,d),/duplicate/)});
