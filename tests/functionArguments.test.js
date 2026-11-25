import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluate } from 'mathjs'
import { functionArguments, normalizeMathAscii } from '../src/shared/mathExpr.js'

// Inputs exactly as the math box (MathLive) writes them.
const x = 0.5
const cases = [
  ['sin x', Math.sin(x)], ['sin 2x', Math.sin(2 * x)], ['sin x cos x', Math.sin(x) * Math.cos(x)],
  ['sin ^2x', Math.sin(x) ** 2], ['sin ^(-1)x', Math.asin(x)], ['ln x', Math.log(x)], ['sin x^2', Math.sin(x * x)],
  ['(sin x)/(x)', Math.sin(x) / x], ['x sin x', x * Math.sin(x)], ['sin (1)/(x)', Math.sin(1 / x)],
  ['log _2x', Math.log2(x)], ['log _(10)(x)', Math.log10(x)], ['arctan x', Math.atan(x)], ['e^(sin x)', Math.exp(Math.sin(x))],
  ['sin sin x', Math.sin(Math.sin(x))], ['x^2ln x', x * x * Math.log(x)], ['cos ^2(x)', Math.cos(x) ** 2], ['ln |x|', Math.log(x)],
  ['sin (x)cos (x)', Math.sin(x) * Math.cos(x)], ['sin 2θ', Math.sin(1)],
]
for (const [input, want] of cases) {
  test(`"${input}"`, () => {
    const got = evaluate(normalizeMathAscii(input), { x, theta: x })
    assert.ok(Math.abs(got - want) < 1e-12, `${normalizeMathAscii(input)} gave ${got}, expected ${want}`)
  })
}
test('leaves already-correct input alone', () => {
  assert.equal(functionArguments('sin(x)+cos(2x)'), 'sin(x)+cos(2x)')
  assert.equal(functionArguments('sqrt(x)'), 'sqrt(x)')
  assert.equal(functionArguments('x^2+1'), 'x^2+1')
})
