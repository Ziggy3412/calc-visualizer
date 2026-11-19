import test from 'node:test'
import assert from 'node:assert/strict'
import {functionBounds} from '../src/shared/graphFit.js'
import {integrateAdaptive,integralDetailWindow} from '../src/shared/adaptiveIntegral.js'
const close=(actual,expected,tolerance=1e-7)=>{assert.equal(actual.converged,true);assert.ok(Math.abs(actual.value-expected)<tolerance,`${actual.value} vs ${expected}`)}
test('wide Gaussian intervals resolve the peak instead of scaling one endpoint sample',()=>{
 for(const bound of [10,1e4,1e8,1e12]) {
  const result=integrateAdaptive(x=>Math.exp(-x*x),0,bound)
  close(result,Math.sqrt(Math.PI)/2)
  if(bound>=1e4)assert.ok(integralDetailWindow(result.samples,0,bound))
 }
 close(integrateAdaptive(x=>Math.exp(-x*x),-1e8,1e8),Math.sqrt(Math.PI))
 close(integrateAdaptive(x=>Math.exp(-((x-1e8)**2)),0,1e8),Math.sqrt(Math.PI)/2)
})
test('regular, signed, reversed, and zero intervals remain accurate',()=>{
 close(integrateAdaptive(x=>x*x,0,3),9)
 close(integrateAdaptive(x=>x*x,3,0),-9)
 close(integrateAdaptive(x=>x,1,1),0)
 close(integrateAdaptive(x=>Math.sin(x),0,2*Math.PI),0)
 close(integrateAdaptive(x=>Math.exp(-x),0,1e8),1)
 assert.equal(integralDetailWindow(integrateAdaptive(x=>x*x,0,3).samples,0,3),null)
})
test('undefined points and exhausted accuracy budgets do not produce confident values',()=>{
 for(const result of [integrateAdaptive(x=>1/x,-1,1),integrateAdaptive(x=>Math.sin(x*x),0,100,{maxEvaluations:100})]) {
  assert.equal(result.converged,false)
  assert.ok(Number.isNaN(result.value))
 }
})

test('resolved peak samples remain inside the whole-interval graph bounds',()=>{
 const fn=x=>Math.exp(-x*x)
 const result=integrateAdaptive(fn,0,1e8)
 const bounds=functionBounds([fn],0,1e8,{includeZero:true,points:result.samples})
 assert.ok(bounds.yMax>=1&&bounds.yMin<=0)
 assert.ok(bounds.xMin<=0&&bounds.xMax>=1e8)
})
