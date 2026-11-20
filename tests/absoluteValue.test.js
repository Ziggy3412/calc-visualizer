import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluate } from 'mathjs'
import { absoluteBars } from '../src/shared/mathExpr.js'
import { equationFunction } from '../src/shared/equationFunction.js'
import { detectHole } from '../src/shared/limitAnalysis.js'

test('absolute value bars become abs()', () => {
  assert.equal(absoluteBars('|x|'), 'abs(x)')
  assert.equal(absoluteBars('(|x|)/(x)'), '(abs(x))/(x)')
  assert.equal(absoluteBars('|x-1|+|x|'), 'abs(x-1)+abs(x)')
  assert.equal(absoluteBars('2|x|'), '2*abs(x)')
  assert.equal(absoluteBars('||x|-1|'), 'abs(abs(x)-1)')
  assert.equal(absoluteBars('sin |x|'), 'sin(abs(x))')
  assert.equal(absoluteBars('|x'), '|x') // unfinished input is left for math.js to report
})
test('MathLive output with bars evaluates', () => {
  const at = (ascii, x) => evaluate(equationFunction(ascii, { independent: 'x', dependent: 'y' }).expression, { x })
  assert.equal(at('(|x|)/(x)', -2), -1)
  assert.equal(at('(|x|)/(x)', 3), 1)
  assert.equal(at('sqrt(|x|)', -9), 3)
  assert.equal(at('ln|x|', -1), 0)
  assert.equal(at('y=|x|', -4), 4)
})
test('|x|/x at 0 is a jump, not a removable hole', () => {
  const f = x => evaluate('abs(x)/x', { x })
  assert.equal(detectHole(f, 0), null)
})
