import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeInfinity, formatPower, formatValue, makeInfinityEval, verdictText } from '../src/shared/infiniteLimit.js'

const verdict = (expr, sign = 1) => {
  const f = makeInfinityEval(expr)
  return verdictText(analyzeInfinity(f, sign), sign).headline
}

test('finite limits, including ones ordinary floating point gets wrong', () => {
  assert.equal(verdict('(1+1/x)^x'), 'Limit appears to be e') // floats give 3.04 at x = 10^15
  assert.equal(verdict('sqrt(x^2+x)-x'), 'Limit appears to be 1/2')
  assert.equal(verdict('(2x^2+1)/(x^2-3)'), 'Limit appears to be 2')
  assert.equal(verdict('(3x+1)/(x-2)', -1), 'Limit appears to be 3')
  assert.equal(verdict('atan(x)'), 'Limit appears to be π/2')
  assert.equal(verdict('atan(x)', -1), 'Limit appears to be −π/2')
  assert.equal(verdict('sin(x)/x'), 'Limit appears to be 0')
  assert.equal(verdict('e^x', -1), 'Limit appears to be 0')
  assert.equal(verdict('abs(x)/x', -1), 'Limit appears to be −1')
})
test('infinite limits', () => {
  assert.equal(verdict('x'), 'f(x) → ∞')
  assert.equal(verdict('x', -1), 'f(x) → −∞')
  assert.equal(verdict('log(x)'), 'f(x) → ∞')
  assert.equal(verdict('e^x'), 'f(x) → ∞')
  assert.equal(verdict('x^2-x^3'), 'f(x) → −∞')
  assert.equal(verdict('x^2-x^3', -1), 'f(x) → ∞')
})
test('no limit', () => {
  assert.equal(verdict('sin(x)'), 'Limit does not exist')
  assert.equal(verdict('x*sin(x)'), 'Limit does not exist')
  assert.equal(verdict('sqrt(x)', -1), 'Not defined out here')
})
test('readable numbers', () => {
  assert.equal(formatPower(1, 12), '10¹²')
  assert.equal(formatPower(-1, 6), '−10⁶')
  assert.equal(formatValue(1e12), '1 × 10¹²')
  assert.equal(formatValue(-3.5e-7), '−3.5 × 10⁻⁷')
  assert.equal(formatValue(0.5), '0.5')
  assert.equal(formatValue(-12.25), '−12.25')
  assert.equal(formatValue(NaN), 'undefined')
  assert.equal(formatValue(makeInfinityEval('e^x').exact(1, 6)), '3.033 × 10⁴³⁴²⁹⁴') // too big for a normal number
})
