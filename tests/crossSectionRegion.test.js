import test from 'node:test'
import assert from 'node:assert/strict'
import {compile} from 'mathjs'
import {regionAt,crossSectionArea} from '../src/shared/crossSectionRegion.js'
import {equationFunction} from '../src/shared/equationFunction.js'
import {makeEval,integrateSimpson} from '../src/shared/numerics.js'
const near=(actual,expected,tol=1e-8)=>assert.ok(Math.abs(actual-expected)<tol,`${actual} ≠ ${expected}`)
const upper=makeEval(compile(equationFunction('x^2+y^2=25').expression))
const lower=makeEval(compile(equationFunction('x^2+y^2=25',{branch:'lower'}).expression))
const volume=(top,bottom,shape='square',a=-5,b=5)=>integrateSimpson(x=>{
  const region=regionAt(top,bottom,x)
  return region?crossSectionArea(shape,region.width):0
},Math.min(a,b),Math.max(a,b),400)

test('negative-only boundaries make a positive base, placed below the axis',()=>{
  assert.deepEqual(regionAt(()=>-2,()=>-5,0),{lower:-5,upper:-2,width:3})
  assert.deepEqual(regionAt(()=>-5,()=>-2,0),{lower:-5,upper:-2,width:3})
  assert.deepEqual(regionAt(lower,()=>0,0),{lower:-5,upper:0,width:5})
  near(volume(lower,()=>0),500/3)
  near(volume(upper,()=>0),500/3)
})
test('both circle branches produce the full width and correct volumes for every shape',()=>{
  assert.deepEqual(regionAt(upper,lower,0),{lower:-5,upper:5,width:10})
  assert.deepEqual(equationFunction('x^2+y^2=25').domain,[-5,5])
  near(volume(upper,lower),2000/3)
  near(volume(upper,lower,'semicircle'),250*Math.PI/3)
  near(volume(upper,lower,'equilateral'),500*Math.sqrt(3)/3)
  near(volume(upper,lower,'isosceles-right'),1000/3)
  near(crossSectionArea('rectangle',10,3),30)
})
test('crossing boundaries and reversed bounds do not lose their volume',()=>{
  near(volume(x=>x,x=>-x,'square',-1,1),8/3)
  near(volume(upper,lower,'square',5,-5),2000/3)
  near(volume(lower,upper),2000/3)
})
test('undefined branch values do not become fake region coordinates',()=>{
  assert.equal(regionAt(upper,lower,6),null)
  assert.equal(regionAt(()=>NaN,()=>0,0),null)
  assert.equal(crossSectionArea('square',NaN),0)
})
