import test from 'node:test'
import assert from 'node:assert/strict'
import { taylorFocusBounds, zoomBoundsAt } from '../src/shared/taylorView.js'
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`)
test('Taylor focus avoids a nearby pole rather than flattening the local approximation',()=>{
  const bounds=taylorFocusBounds(x=>1/(1-x),0)
  assert.ok(bounds.xMin<0&&bounds.xMax>0&&bounds.xMax<1)
  assert.ok(bounds.yMin<1&&bounds.yMax>1&&bounds.yMax<10)
})
test('Taylor focus stays inside the logarithm domain and includes the expansion point',()=>{
  const bounds=taylorFocusBounds(x=>Math.log(1+x),0)
  assert.ok(bounds.xMin>-1)
  assert.ok(bounds.yMin<0&&bounds.yMax>0)
})
test('smooth functions have useful local windows at zero and shifted centers',()=>{
  for(const center of [0,10]) {
    const bounds=taylorFocusBounds(Math.sin,center)
    assert.ok(bounds.xMin<center&&bounds.xMax>center)
    assert.ok(bounds.yMin<Math.sin(center)&&bounds.yMax>Math.sin(center))
  }
  assert.equal(taylorFocusBounds(null,0),null)
})
test('zoom preserves the expansion point at the same relative position',()=>{
  const bounds={xMin:-2,xMax:6,yMin:-1,yMax:9}
  const next=zoomBoundsAt(bounds,.82,0,1)
  close((0-next.xMin)/(next.xMax-next.xMin),(0-bounds.xMin)/(bounds.xMax-bounds.xMin))
  close((1-next.yMin)/(next.yMax-next.yMin),(1-bounds.yMin)/(bounds.yMax-bounds.yMin))
  const restored=zoomBoundsAt(next,1/.82,0,1)
  for(const key of Object.keys(bounds))close(restored[key],bounds[key])
})
test('zoom after panning keeps an off-screen expansion point from pulling the view away',()=>{
  const next=zoomBoundsAt({xMin:100,xMax:120,yMin:200,yMax:240},.5,0,0)
  assert.deepEqual(next,{xMin:105,xMax:115,yMin:210,yMax:230})
  assert.equal(zoomBoundsAt(next,0,0,0),null)
})

test('near-center fits keep the expansion point in the exact middle of both axes',()=>{
  for(const [fn,center] of [[Math.exp,0],[x=>1000+x*x,0],[x=>1/(1-x),0],[Math.sin,10]]) {
    const bounds=taylorFocusBounds(fn,center)
    close((bounds.xMin+bounds.xMax)/2,center)
    close((bounds.yMin+bounds.yMax)/2,fn(center))
  }
})
