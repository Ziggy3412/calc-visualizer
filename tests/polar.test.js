import test from 'node:test'
import assert from 'node:assert/strict'
import {compile} from 'mathjs'
import {samplePolar} from '../src/shared/polar.js'
test('polar samples preserve Cartesian coordinates with negative radii',()=>{
 const fn=compile('2*cos(3*theta)')
 const samples=samplePolar(fn,0,2*Math.PI,60)
 assert.ok(samples.rs.every(r=>r>=0))
 for(let i=0;i<=60;i++) {
  const theta=i*2*Math.PI/60,r=fn.evaluate({theta})
  assert.ok(Math.abs(samples.rs[i]*Math.cos(samples.thetas[i])-r*Math.cos(theta))<1e-12)
  assert.ok(Math.abs(samples.rs[i]*Math.sin(samples.thetas[i])-r*Math.sin(theta))<1e-12)
 }
})
test('polar sampling retains gaps and supports x as the angular variable',()=>{
 assert.deepEqual(samplePolar(compile('1/x'),0,1,2).rs,[null,2,1])
 assert.deepEqual(samplePolar(compile('missing'),0,1,2).rs,[null,null,null])
})
