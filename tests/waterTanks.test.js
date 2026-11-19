import test from 'node:test'
import assert from 'node:assert/strict'
import { WATER_TANKS, tankHeight, tankVolume, advanceTank } from '../src/shared/waterTanks.js'
import { implicitCalculus, solveRelatedRate } from '../src/shared/implicitCalculus.js'
test('tank dimensions, capacities, and height inverses agree',()=>{
 assert.equal(tankVolume('cube',4),64)
 assert.ok(Math.abs(tankVolume('cone',6)-18*Math.PI)<1e-12)
 for(const id of Object.keys(WATER_TANKS)) for(const h of [0,.1,1,2,WATER_TANKS[id].height]) assert.ok(Math.abs(tankHeight(id,tankVolume(id,h))-h)<1e-12)
})
test('tank related-rate answers match geometry, including draining',()=>{
 const cone=implicitCalculus('y=pi*x^3/12')
 assert.ok(Math.abs(solveRelatedRate(cone,2,2*Math.PI/3,'y',Math.PI).unknown-1)<1e-12)
 assert.equal(solveRelatedRate(implicitCalculus('y=16*x'),2,32,'y',8).unknown,.5)
 assert.equal(solveRelatedRate(implicitCalculus('y=16*x'),2,32,'y',-8).unknown,-.5)
 assert.equal(solveRelatedRate(cone,0,0,'y',1).valid,false)
})
test('playback preserves the selected rate and stops at tank boundaries',()=>{
 assert.equal(advanceTank('cube',2,'y',8,1).height,2.5)
 assert.equal(advanceTank('cube',2,'x',.5,1).volume,40)
 assert.equal(advanceTank('cube',3,'y',100,1).volume,64)
 assert.equal(advanceTank('cone',1,'y',-100,1).height,0)
 assert.equal(advanceTank('cone',5,'x',2,1).height,6)
 const a=advanceTank('cone',1,'y',Math.PI,1).height-1
 const b=advanceTank('cone',3,'y',Math.PI,1).height-3
 assert.ok(a>b,'same inflow raises narrow water levels faster')
})
