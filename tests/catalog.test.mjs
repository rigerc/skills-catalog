import test from 'node:test';
import assert from 'node:assert/strict';
import {load,validate,render} from '../scripts/catalog.mjs';
test('valid snapshot and rendering',()=>{const {c,m,l,d}=load();assert.equal(validate(c,m,l,d).skills,c.skills.length);assert.match(render(c,m,l,d)['README.md'],/Canonical data source/)});
test('invalid mapping reference rejected',()=>{const {c,m,l,d}=load();m.technologies[0].skill_ids=['not-real/skill'];assert.throws(()=>validate(c,m,l,d),/unknown skill/)});
test('missing detection rejected',()=>{const {c,m,l,d}=load();d.rules.pop();assert.throws(()=>validate(c,m,l,d),/missing detection rule/)});
test('unverified source cannot pretend to be verified',()=>{const {c,m,l,d}=load();const e=l.entries.find(x=>x.status==='verified');e.url='https://github.com/a/b/blob/main/SKILL.md';e.commit='bad';assert.throws(()=>validate(c,m,l,d),/bad verified source/)});
test('duplicate skill rejected',()=>{const {c,m,l,d}=load();c.skills.push(structuredClone(c.skills[0]));assert.throws(()=>validate(c,m,l,d),/duplicate/)});
test('clean catalog has no unresolved sources or empty mapping combinations',()=>{const {c,m,l,d}=load();assert.equal(l.unresolved_count,0);assert.equal(l.release_blocked,false);assert.ok(l.entries.every(e=>e.status==='verified'));assert.ok(m.combinations.every(x=>x.skill_ids.length>0));assert.equal(m.technologies.find(x=>x.id==='numpy').mapping_status,'mapped');assert.equal(m.technologies.find(x=>x.id==='storybook').mapping_status,'mapped');assert.ok(m.technologies.find(x=>x.id==='numpy').skill_ids.some(id=>id.toLowerCase()==='mindrally/skills/numpy-best-practices'));assert.ok(m.technologies.find(x=>x.id==='storybook').skill_ids.some(id=>id.toLowerCase()==='mindrally/skills/storybook'));assert.equal(validate(c,m,l,d).unresolved,0)});
