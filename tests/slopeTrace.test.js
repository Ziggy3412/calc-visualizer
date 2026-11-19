import test from 'node:test'
import assert from 'node:assert/strict'
import {compileSlope} from '../src/shared/slopeEquation.js'
import {traceSolution} from '../src/shared/slopeTrace.js'
const bounds={xMin:-20,xMax:20,yMin:-20,yMax:20}
const trace=(f,x,y,dir=1)=>traceSolution(f,x,y,dir,.05,4000,bounds)
test('circle branches stay on their circle and never jump across y=0',()=>{
 for(const y0 of [.1,1,3,7.5,12,-.1,-1,-3,-7.5,-12]) for(const dir of [-1,1]) {
  const {xs,ys}=trace(compileSlope('-x/y'),0,y0,dir)
  assert.ok(xs.length>2)
  for(let i=0;i<xs.length;i++) {
   assert.equal(Math.sign(ys[i]),Math.sign(y0),'must not cross undefined y=0')
   assert.ok(Math.abs(xs[i]**2+ys[i]**2-y0**2)<1e-4,`${y0}: off the solution circle`)
  }
  assert.ok(Math.abs(xs.at(-1)-dir*Math.abs(y0))<.002,'approaches the domain endpoint')
 }
})
test('regular equations remain accurate through slope sign changes and y=0',()=>{
 const line=trace(()=>-1,0,1)
 assert.ok(line.ys.some(y=>y<0),'regular zero crossings are allowed')
 line.xs.forEach((x,i)=>assert.ok(Math.abs(line.ys[i]-(1-x))<1e-10))
 const exp=trace((x,y)=>y,0,1)
 exp.xs.forEach((x,i)=>assert.ok(Math.abs(exp.ys[i]-Math.exp(x))<1e-5))
 const parabola=trace(x=>2*x,-2,4)
 parabola.xs.forEach((x,i)=>assert.ok(Math.abs(parabola.ys[i]-x*x)<1e-9))
})
test('traces stop at poles, and undefined seeds have no solution trace',()=>{
 const pole=trace(compileSlope('1/x'),-1,0)
 assert.ok(pole.xs.every(x=>x<0))
 assert.ok(pole.ys.every(Number.isFinite))
 assert.deepEqual(trace(compileSlope('-x/y'),1,0),{xs:[],ys:[]})
 const blowup=trace((x,y)=>y*y,0,1)
 assert.ok(blowup.xs.every(x=>x<1))
})

test('domain guards catch poles without mistaking regular zero crossings for singularities',()=>{
 assert.equal(compileSlope('1/y^2').segmentValid(0,1,1,-1),false)
 assert.equal(compileSlope('y^-2').segmentValid(0,1,1,-1),false)
 assert.equal(compileSlope('y').segmentValid(0,1,1,-1),true)
})
