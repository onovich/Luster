import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {presets} from '../src/core/presets.js';
import {PoseTween,validateParameters} from '../src/core/parameters.js';
for(const id of ['B11','B14'])test(`${id} matches frozen JSON`,async()=>assert.deepEqual(presets[id],JSON.parse(await readFile(new URL(`./fixtures/approved/${id}.json`,import.meta.url),'utf8'))));
test('quintic endpoints, midpoint, reversal and rest',()=>{const p=new PoseTween(-4);p.to(4);assert.equal(p.advance(.19),0);p.to(-4);assert.equal(p.advance(0),0);assert.equal(p.advance(.19),-2);assert.equal(p.advance(.19),-4);assert.equal(p.active,false);assert.equal(p.advance(1),-4);p.to(0);assert.equal(p.advance(.38),0);});
test('reject invalid external inputs',()=>{assert.throws(()=>validateParameters({period:0}),RangeError);assert.throws(()=>new PoseTween(NaN),TypeError);assert.throws(()=>new PoseTween(0,0),RangeError);assert.throws(()=>new PoseTween().advance(-1),RangeError);});
