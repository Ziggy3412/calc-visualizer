import test from 'node:test'
import assert from 'node:assert/strict'
import {implicitCalculus,pointOnRelation,solveRelatedRate,scalar} from '../src/shared/implicitCalculus.js'
import {equationFunction} from '../src/shared/equationFunction.js'
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} ≠ ${b}`)

test('implicit differentiation follows the chain and product rules',()=>{
  const circle=implicitCalculus('x^2+y^2=25')
  near(circle.fx.evaluate({x:3,y:4}),6)
  near(circle.fy.evaluate({x:3,y:4}),8)
  near(pointOnRelation(circle,3,4).slope,-.75)
  near(pointOnRelation(implicitCalculus('x*y=6'),2,3).slope,-1.5)
  near(pointOnRelation(implicitCalculus('x^3+y^3=6*x*y'),3,3).slope,-1)
  near(pointOnRelation(implicitCalculus('y=x^2'),2,4).slope,4)
})
test('ordinary, vertical, singular, and off-curve points are distinguished',()=>{
  const circle=implicitCalculus('x^2+y^2=25')
  assert.equal(pointOnRelation(circle,5,0).kind,'vertical')
  assert.equal(pointOnRelation(circle,0,5).kind,'regular')
  assert.equal(pointOnRelation(circle,3,3).valid,false)
  assert.equal(pointOnRelation(implicitCalculus('x*y=0'),0,0).kind,'singular')
  assert.equal(pointOnRelation(implicitCalculus('log(x)+y=0'),-1,0).valid,false)
})
test('sliding ladder rates have the correct sign, in both directions',()=>{
  const d=implicitCalculus('x^2+y^2=169')
  const result=solveRelatedRate(d,5,12,'x',2)
  assert.equal(result.valid,true)
  near(result.unknown,-5/6)
  near(solveRelatedRate(d,5,12,'y',-5/6).unknown,2)
  near(solveRelatedRate(d,5,12,'x',0).unknown,0)
})
test('circle and sphere problems use time derivatives with the correct dimensions',()=>{
  near(solveRelatedRate(implicitCalculus('y=pi*x^2'),3,9*Math.PI,'x',2).unknown,12*Math.PI)
  near(solveRelatedRate(implicitCalculus('y=4/3*pi*x^3'),3,36*Math.PI,'y',12).unknown,1/(3*Math.PI))
})
test('undetermined and impossible rates do not produce numerical answers',()=>{
  const d=implicitCalculus('x^2+y^2=25')
  assert.equal(solveRelatedRate(d,5,0,'x',2).valid,false)
  assert.equal(solveRelatedRate(d,5,0,'x',0).valid,false)
  assert.equal(solveRelatedRate(d,3,3,'x',2).valid,false)
  assert.equal(solveRelatedRate(d,3,4,'x',NaN).valid,false)
  assert.throws(()=>implicitCalculus('x^2+y^2'))
})
test('lesson inputs retain their equation and accept exact point values',()=>{
  assert.equal(equationFunction('y=x^2',{mode:'relation'}).expression,'y=x^2')
  const preset=equationFunction('y=(4)/(3)pi x^3',{mode:'relation'}).expression
  near(solveRelatedRate(implicitCalculus(preset),3,36*Math.PI,'y',12).unknown,1/(3*Math.PI))
  near(scalar('9*pi'),9*Math.PI)
  near(scalar('sqrt(21)'),Math.sqrt(21))
  assert.ok(Number.isNaN(scalar('1/0')))
})
