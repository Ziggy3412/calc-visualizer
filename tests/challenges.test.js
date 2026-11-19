import test from 'node:test'
import assert from 'node:assert/strict'
import katex from 'katex'
import { CHALLENGES } from '../src/practice/challengeQuestions.js'

test('every unit has two distinct advanced problems with complete solutions', () => {
  assert.equal(new Set(CHALLENGES.map(q => q.id)).size,20)
  for (let unit=1;unit<=10;unit++) assert.equal(CHALLENGES.filter(q => q.unit===unit).length,2)
  for (const q of CHALLENGES) {
    assert.ok(q.parts.length>=2 && q.solution.length>=2 && q.hint && q.skills,q.id)
    assert.equal(q.bcOnly,q.unit>=9)
    for (const tex of [q.math,...q.solution.map(step=>step[1])]) assert.doesNotThrow(()=>katex.renderToString(tex,{throwOnError:true}),q.id)
  }
})
function integrate(f,a,b,n=20000) {
  let sum=f(a)+f(b)
  for(let i=1;i<n;i++) sum+=(i%2 ? 4 : 2)*f(a+(b-a)*i/n)
  return sum*(b-a)/(3*n)
}
test('independent quadrature checks exact challenge integrals', () => {
  const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} vs ${b}`)
  near(integrate(x=>Math.sin(x)**5/(Math.sin(x)**5+Math.cos(x)**5),0,Math.PI/2),Math.PI/4)
  near(2*Math.PI*integrate(x=>(2-x)*(x-x*x),0,1),Math.PI/2)
  near(4*integrate(x=>Math.sin(x)**2,0,Math.PI/4),Math.PI/2-1)
  near(integrate(t=>Math.abs(t*t-4*t+3),0,4),4)
})
test('five-term Taylor integral estimate satisfies its certified one-sided bound', () => {
  const actual=integrate(x=>Math.exp(-x*x),0,.5)
  const estimate=1/2-1/24+1/320-1/5376+1/110592
  const error=1/2703360
  assert.ok(actual<estimate && actual>estimate-error)
  assert.ok(error<1e-6 && 1/110592>1e-6)
})
