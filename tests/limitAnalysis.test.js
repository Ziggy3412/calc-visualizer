import test from 'node:test'
import assert from 'node:assert/strict'
import {detectHole} from '../src/shared/limitAnalysis.js'
test('removable holes are estimated using shrinking offsets',()=>{
 assert.ok(Math.abs(detectHole(x=>(x*x-9)/(x-3),3)-6)<1e-7)
 assert.ok(Math.abs(detectHole(x=>Math.sin(x)/x,0)-1)<1e-7)
 assert.equal(detectHole(x=>x*x,0),null)
})
test('asymptotes, jumps, and oscillation are not marked as fillable holes',()=>{
 for (const fn of [x=>1/(x*x),x=>1/x,x=>Math.log(Math.abs(x)),x=>Math.abs(x)/x,x=>Math.sin(1/x)]) {
  assert.equal(detectHole(fn,0),null)
 }
})
