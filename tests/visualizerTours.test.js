import test from 'node:test'
import assert from 'node:assert/strict'
import {VISUALIZER_TOURS,placeTourCard} from '../src/shared/visualizerTours.js'
import {TOOLS} from '../src/shared/tools.js'
test('every visualizer has a guided tour with real control targets',()=>{
 assert.deepEqual(Object.keys(VISUALIZER_TOURS).sort(),TOOLS.filter(t=>t.category!=='Study').map(t=>t.id).sort())
 for(const [id,steps] of Object.entries(VISUALIZER_TOURS)) {
  assert.ok(steps.length>0,id)
  assert.equal(new Set(steps.map(s=>s.title)).size,steps.length,id)
  for(const step of steps)assert.ok(step.target.selector&&step.title&&step.text,id)
 }
})
test('tour cards stay in the viewport and prefer the space beside their target',()=>{
 for(const [width,height] of [[1280,720],[768,700],[390,844]]) {
  for(const target of [{left:10,top:140,right:300,bottom:200},{left:width-100,top:400,right:width-10,bottom:600},{left:0,top:72,right:width,bottom:height-50}]) {
   const card=placeTourCard(target,width,height,360,320)
   assert.ok(card.left>=16&&card.left+card.width<=width-16)
   assert.ok(card.top>=72&&card.top+320<=height-16)
  }
 }
 const beside=placeTourCard({left:20,top:140,right:300,bottom:200},1280,720,360,320)
 assert.ok(beside.left>300)
})

test('tours omit generic graph, zoom, and result-reading filler',()=>{
 for(const steps of Object.values(VISUALIZER_TOURS))for(const step of steps) {
  assert.ok(!['Read the picture','Inspect the graph','Read the result','Watch the geometry','Inspect the approximation','Read the worked solution','Manage solution curves','Try a classic example','Choose the interval','Adjust field density','Choose a scenario','Watch the regions grow','Control the sweep and slices','Build up the solid','Follow the calculation'].includes(step.title))
  assert.ok(!step.target.selector.includes('.zoom-controls'))
 }
 assert.ok(VISUALIZER_TOURS.byparts.some(s=>s.title==='Understand the two regions'))
 assert.ok(VISUALIZER_TOURS.slopefield.some(s=>s.title==='Drop a starting point'))
})
