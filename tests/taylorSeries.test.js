import test from 'node:test'
import assert from 'node:assert/strict'
import {taylorCoeffs} from '../src/shared/taylorCoefficients.js'
import {equationFunction} from '../src/shared/equationFunction.js'
const near=(a,b,tolerance=1e-12)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(Math.abs(b),1e-100),`${a} ≠ ${b}`)
const value=(c,h)=>c.reduceRight((sum,k)=>sum*h+k,0)

test('degree-50 circle coefficients match the binomial expansion, including the smallest terms',()=>{
  for(const [branch,sign] of [['upper',1],['lower',-1]]) {
    const c=taylorCoeffs(equationFunction('x^2+y^2=25',{branch}).expression,0,50)
    near(c[0],5*sign)
    let binomial=1
    for(let k=1;k<=25;k++) {
      binomial*=((.5-k+1)/k)*(-1/25)
      near(c[2*k],5*sign*binomial)
      assert.equal(c[2*k-1],0)
    }
    assert.notEqual(c[50],0)
    near(value(c,3),sign*4,1e-12)
  }
})
test('shifted circle centers and ellipses expand correctly at high degree',()=>{
  const expression=equationFunction('x^2+y^2=25').expression
  const c=taylorCoeffs(expression,2,50)
  near(c[0],Math.sqrt(21))
  near(c[1],-2/Math.sqrt(21))
  near(value(c,.5),Math.sqrt(25-2.5**2))
  const ellipse=equationFunction('(x-2)^2/9+(y+1)^2/4=1').expression
  near(value(taylorCoeffs(ellipse,2,50),1),-1+2*Math.sqrt(1-1/9))
})
test('all classic Taylor examples preserve their known coefficients to degree 50',()=>{
  const geometric=taylorCoeffs('1/(1-x)',0,50)
  geometric.forEach(c=>near(c,1))
  const log=taylorCoeffs('log(1+x)',0,50)
  assert.equal(log[0],0)
  for(let k=1;k<=50;k++)near(log[k],(k%2?1:-1)/k)
  const sine=taylorCoeffs('sin(x)',0,50),cosine=taylorCoeffs('cos(x)',0,50)
  let factorial=1
  for(let k=0;k<=50;k++) {
    if(k)factorial*=k
    near(sine[k],k%2?(-1)**((k-1)/2)/factorial:0)
    near(cosine[k],k%2?0:(-1)**(k/2)/factorial)
  }
})
test('composed functions and variable exponents retain accurate local expansions',()=>{
  for(const [expression,f] of [['exp(sin(x))',x=>Math.exp(Math.sin(x))],['atan(x)',Math.atan],['asin(x)',Math.asin],['(1+x)^x',x=>(1+x)**x],['nthRoot(x,3)',Math.cbrt]]) {
    const center=expression==='nthRoot(x,3)'?-2:.2
    const c=taylorCoeffs(expression,center,30)
    near(value(c,.01),f(center+.01))
  }
})
test('singular circle centers report an error instead of inventing coefficients',()=>{
  const circle=equationFunction('x^2+y^2=25').expression
  assert.throws(()=>taylorCoeffs(circle,5,50))
  assert.throws(()=>taylorCoeffs(circle,6,50))
  assert.throws(()=>taylorCoeffs(equationFunction('x^2+y^2=0').expression,0,1))
})
