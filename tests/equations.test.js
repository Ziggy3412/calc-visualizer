import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluate, compile, derivative } from 'mathjs'
import { equationFunction } from '../src/shared/equationFunction.js'
import { taylorCoeffs } from '../src/shared/taylorCoefficients.js'
import { integrateSimpson, makeEval } from '../src/shared/numerics.js'
const near = (actual, expected, tolerance=1e-8) => assert.ok(Math.abs(actual-expected)<tolerance, `${actual} ≠ ${expected}`)

test('circle branches drive heights, derivatives, volume, and Taylor with correct signs', () => {
  for (const [branch, sign] of [['upper',1],['lower',-1]]) {
    const {expression, branches}=equationFunction('x^2+y^2=25',{branch})
    assert.equal(branches,true)
    const f=makeEval(compile(expression))
    near(f(3),4*sign)
    near(derivative(expression,'x').evaluate({x:3}),-.75*sign)
    near(integrateSimpson(f,0,5),25*Math.PI/4*sign,.001)
    near(integrateSimpson(x=>Math.PI*f(x)**2,0,2),Math.PI*(50-8/3))
    const c=taylorCoeffs(expression,0,3)
    near(c[0],5*sign);near(c[1],0);near(c[2],-.1*sign);near(c[3],0)
    assert.ok(!Number.isFinite(f(6)))
  }
})
test('upper/lower order stays correct for a negative quadratic coefficient',()=>{
  near(evaluate(equationFunction('-y^2+2*y+x=0').expression,{x:3}),3)
  near(evaluate(equationFunction('-y^2+2*y+x=0',{branch:'lower'}).expression,{x:3}),-1)
})
test('solids can solve for x instead of y',()=>{
  near(evaluate(equationFunction('x^2+y^2=25',{independent:'y',dependent:'x'}).expression,{y:3}),4)
  near(evaluate(equationFunction('x=2*y+1',{independent:'y',dependent:'x'}).expression,{y:3}),7)
})
test('polar converts Cartesian circles and vertical/horizontal lines',()=>{
  const opts={mode:'polar',independent:'theta',dependent:'r'}
  near(evaluate(equationFunction('x^2+y^2=25',opts).expression,{theta:.7}),5)
  near(evaluate(equationFunction('x=3',opts).expression,{theta:Math.PI/3}),6)
  near(evaluate(equationFunction('y=3',opts).expression,{theta:Math.PI/6}),6)
  near(evaluate(equationFunction('r^2=4*cos(theta)^2',opts).expression,{theta:0}),2)
})
test('slope fields derive relations, while explicit slope expressions stay unchanged',()=>{
  near(evaluate(equationFunction('x^2+y^2=25',{mode:'slope'}).expression,{x:3,y:4}),-.75)
  near(evaluate(equationFunction('y=x^2',{mode:'slope'}).expression,{x:3,y:4}),6)
  assert.equal(equationFunction('x-y',{mode:'slope'}).expression,'x-y')
})
test('pure odd/even powers and existing explicit functions remain usable',()=>{
  near(evaluate(equationFunction('y^3=x').expression,{x:-8}),-2)
  near(evaluate(equationFunction('y^4=x',{branch:'lower'}).expression,{x:16}),-2)
  assert.equal(equationFunction('f(x)=sin(x)').expression,'sin(x)')
  assert.equal(equationFunction('x^2+y^2=25',{mode:'graph'}).expression,'x^2+y^2=25')
})
test('unsupported relations and singular Taylor centers are reported instead of fabricated',()=>{
  assert.throws(()=>equationFunction('sin(y)+y=x'))
  assert.throws(()=>equationFunction('x=3'))
  assert.throws(()=>equationFunction('x^2+y^2='))
  assert.throws(()=>taylorCoeffs(equationFunction('x^2+y^2=0').expression,0,3))
  assert.throws(()=>taylorCoeffs('sqrt(x)',0,1))
})
test('degree 50 still computes meaningful small coefficients',()=>{
  const c=taylorCoeffs('exp(x)',0,50)
  assert.equal(c.length,51)
  near(c[0],1)
  assert.ok(c[50]>0)
  near(c[50]*evaluate('50!'),1)
})
