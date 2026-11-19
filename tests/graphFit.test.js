import test from 'node:test'
import assert from 'node:assert/strict'
import { paddedBounds, functionBounds, expressionBounds, mergeBounds, viewportForBounds } from '../src/shared/graphFit.js'
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`)
test('fits tall, offset, constant and steep functions without clipping finite extrema',()=>{
  for(const fn of [x=>x*x,x=>10000+x*x,()=>4000,Math.exp]) {
    const bounds=functionBounds([fn],-10,10)
    for(const x of [-10,0,10])assert.ok(fn(x)>bounds.yMin&&fn(x)<bounds.yMax)
    assert.ok(bounds.xMin<-10&&bounds.xMax>10)
  }
})
test('fits all functions and includes the integration baseline over distant and reversed bounds',()=>{
  const bounds=functionBounds([x=>x*x,x=>-x],1200,1000,{includeZero:true})
  assert.ok(bounds.xMin<1000&&bounds.xMax>1200)
  assert.ok(bounds.yMin<-1200&&bounds.yMax>1440000)
  const zero=functionBounds([()=>5],3,3)
  assert.ok(zero.xMin<3&&zero.xMax>3)
})
test('fits the full implicit circle or ellipse even when outside the initial window',()=>{
  for(const expr of ['x^2+y^2=1000000','(x-1000)^2+(y-2000)^2=25','(x-100)^2/4+(y+50)^2/9=1']) {
    const bounds=expressionBounds(expr)
    assert.ok(bounds,expr)
    if(expr.startsWith('x^2'))assert.ok(bounds.xMin<-1000&&bounds.yMax>1000)
    else if(expr.includes('1000'))assert.ok(bounds.xMin<995&&bounds.xMax>1005&&bounds.yMin<1995&&bounds.yMax>2005)
    else assert.ok(bounds.xMin<98&&bounds.xMax>102&&bounds.yMin<-53&&bounds.yMax>-47)
  }
})
test('undefined samples do not poison fitting and unavailable data returns no bounds',()=>{
  const bounds=functionBounds([x=>1/x],-2,2)
  assert.ok(Object.values(bounds).every(Number.isFinite))
  assert.equal(functionBounds([()=>NaN],0,1),null)
  assert.equal(expressionBounds('not a valid expression ('),null)
  assert.equal(paddedBounds([[NaN,0],[0,Infinity]]),null)
})
test('rectangular fitted viewport represents every bound including ranges beyond the old 200 limit',()=>{
  const bounds={xMin:1000,xMax:1200,yMin:-2000,yMax:6000}
  const viewport=viewportForBounds(bounds,100,200)
  close(100-viewport.zoom+viewport.panX,bounds.xMin)
  close(100+viewport.zoom+viewport.panX,bounds.xMax)
  close(200-viewport.zoom*viewport.aspect+viewport.panY,bounds.yMin)
  close(200+viewport.zoom*viewport.aspect+viewport.panY,bounds.yMax)
  assert.ok(viewport.zoom*viewport.aspect>200)
  assert.equal(viewportForBounds({xMin:1,xMax:0,yMin:0,yMax:1}),null)
})
test('merging bounds keeps every entered curve visible',()=>{
  assert.deepEqual(mergeBounds([null,{xMin:-10,xMax:10,yMin:-5,yMax:5},{xMin:900,xMax:1000,yMin:200,yMax:300}]),{xMin:-10,xMax:1000,yMin:-5,yMax:300})
})
