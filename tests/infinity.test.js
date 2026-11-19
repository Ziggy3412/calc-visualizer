import test from 'node:test'
import assert from 'node:assert/strict'
import {parseNumberDraft} from '../src/shared/numberInput.js'
import {integrateExtended,previewBounds,formatBound,texBound} from '../src/shared/infinity.js'
test('infinity is accepted only where explicitly supported',()=>{
 for(const raw of ['∞','inf','Infinity','+infinity'])assert.equal(parseNumberDraft(raw,true),Infinity)
 for(const raw of ['-∞','−inf','-infinity'])assert.equal(parseNumberDraft(raw,true),-Infinity)
 assert.equal(parseNumberDraft('inf'),null)
 assert.equal(formatBound(-Infinity),'−∞')
 assert.equal(texBound(Infinity),'\\infty')
 assert.deepEqual(previewBounds(2,Infinity),[2,12])
 assert.deepEqual(previewBounds(-Infinity,3),[-7,3])
 assert.deepEqual(previewBounds(-Infinity,Infinity),[-10,10])
})
test('improper integrals converge for standard one- and two-sided examples',()=>{
 for(const [fn,a,b,expected] of [
  [x=>Math.exp(-x),0,Infinity,1],
  [x=>Math.exp(x),-Infinity,0,1],
  [x=>Math.exp(-x*x),-Infinity,Infinity,Math.sqrt(Math.PI)],
  [x=>1/(x*x),1,Infinity,1],
  [x=>Math.exp(-x),Infinity,0,-1],
  [x=>Math.PI*Math.exp(-2*x),0,Infinity,Math.PI/2],
  [x=>Math.exp(-2*x),0,Infinity,.5],
  [x=>Math.exp(-2*x)/2,0,Infinity,.25],
 ]) {const r=integrateExtended(fn,a,b);assert.equal(r.converged,true);assert.ok(Math.abs(r.value-expected)<1e-6,`${r.value} vs ${expected}`)}
})
test('divergent integrals and principal-value cancellation are not reported as convergent',()=>{
 for(const [fn,a,b] of [[()=>1,0,Infinity],[x=>1/x,1,Infinity],[x=>x,-Infinity,Infinity],[x=>1/x,-Infinity,Infinity]]) {
  const r=integrateExtended(fn,a,b);assert.equal(r.converged,false);assert.ok(Number.isNaN(r.value))
 }
})
