import test from 'node:test'
import assert from 'node:assert/strict'
import {findSignChanges, findStationaryPoints, integrateSimpson, cumulativeIntegral} from '../src/shared/numerics.js'

test('sign scans retain grid-aligned crossings without calling touching zeros inflections',()=>{
 assert.deepEqual(findSignChanges(x=>6*x,-10,10),[0])
 assert.deepEqual(findSignChanges(x=>x*x,-1,1),[])
 assert.deepEqual(findSignChanges(()=>0,-1,1),[])
 const roots=findSignChanges(x=>x*x-1,-2,2,100)
 assert.deepEqual(roots,[-1,1])
 const offset=findSignChanges(x=>x-.123,-1,1,50)
 assert.equal(offset.length,1)
 assert.ok(Math.abs(offset[0]-.123)<1e-10)
})
test('sign scans reject poles and discontinuous jumps',()=>{
 assert.deepEqual(findSignChanges(x=>1/(x-.123),-1,1,50),[])
 assert.deepEqual(findSignChanges(x=>x<.123?-1:1,-1,1,50),[])
 assert.deepEqual(findSignChanges(x=>1/x,-1,1,50),[])
})
test('Simpson integration preserves orientation and rejects invalid samples',()=>{
 assert.ok(Math.abs(integrateSimpson(x=>x*x,0,3)-9)<1e-10)
 assert.ok(Math.abs(integrateSimpson(x=>x*x,3,0)+9)<1e-10)
 assert.ok(Number.isNaN(integrateSimpson(x=>1/x,-1,1)))
 assert.ok(Number.isNaN(integrateSimpson(()=>NaN,0,1)))
 assert.ok(Number.isNaN(integrateSimpson(x=>x,0,Infinity)))
})
test('cumulative integration propagates undefined data instead of adding zero',()=>{
 const valid=cumulativeIntegral(x=>x,0,2,20)
 assert.ok(Math.abs(valid.vs.at(-1)-2)<1e-10)
 const invalid=cumulativeIntegral(x=>x===1?NaN:1,0,2,2)
 assert.ok(Number.isNaN(invalid.vs[1]))
 assert.ok(Number.isNaN(invalid.vs[2]))
})

test('stationary-point scans include horizontal inflections without inventing zeros',()=>{
 assert.deepEqual(findStationaryPoints(x=>3*x*x,x=>6*x,-10,10),[0])
 const shifted=findStationaryPoints(x=>3*(x-.123)**2,x=>6*(x-.123),-1,1,50)
 assert.equal(shifted.length,1)
 assert.ok(Math.abs(shifted[0]-.123)<1e-10)
 assert.deepEqual(findStationaryPoints(x=>3*x*x+.01,x=>6*x,-1,1),[])
 assert.deepEqual(findSignChanges(x=>x-x*x,-50,50,6000),[0,1])
})
