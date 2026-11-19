import test from 'node:test'
import assert from 'node:assert/strict'
import katex from 'katex'
import { THEOREMS, THEOREM_GROUPS, PRACTICE_THEOREMS } from '../src/shared/theorems.js'
import { DEMO_IDS, theoremDemo } from '../src/shared/theoremDemos.js'
import { QUESTIONS } from '../src/practice/questions.js'
import { TOOLS } from '../src/shared/tools.js'
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`)
test('theorem entries and links are complete and all mathematics renders', () => {
  const ids = new Set(THEOREMS.map(t => t.id))
  assert.equal(ids.size, THEOREMS.length)
  for (const t of THEOREMS) {
    assert.ok(THEOREM_GROUPS.includes(t.group))
    assert.ok(t.conditions && t.conclusion && t.example && t.pitfall && t.work.length, t.id)
    for (const formula of [t.formula, ...t.work]) assert.doesNotThrow(() => katex.renderToString(formula, { throwOnError: true, strict: 'error' }), t.id)
    for (const related of t.related ?? []) assert.ok(ids.has(related), `${t.id}: ${related}`)
    if (t.demo) assert.ok(DEMO_IDS.includes(t.demo), t.id)
    if (t.tool) assert.ok(TOOLS.some(tool => tool.id === t.tool), t.id)
  }
  for (const [question, id] of Object.entries(PRACTICE_THEOREMS)) {
    assert.ok(QUESTIONS.some(q => q.id === question), question)
    assert.ok(ids.has(id), question)
  }
})
test('analytic demos render finite models and valid formulas at every slider extreme', () => {
  for (const id of DEMO_IDS) for (const position of [0, 0.25, 0.5, 0.75, 1]) for (const counterexample of [false, true]) {
    const model = theoremDemo(id, position, counterexample)
    assert.doesNotThrow(() => katex.renderToString(model.formula, { throwOnError: true }), `${id}: ${model.formula}`)
    const [a, b] = model.domain
    assert.ok(a < b && model.range[0] < model.range[1])
    for (const x of [a, (a + b) / 2, b]) assert.ok(Number.isFinite(model.fn(x)), id)
    for (const [x, y] of model.points ?? []) close(model.fn(x), y)
  }
})
test('IVT points achieve the target and a discontinuous jump skips it', () => {
  for (const p of [0, 0.2, 0.5, 0.8, 1]) {
    const model = theoremDemo('ivt', p)
    const [c, y] = model.points.at(-1)
    assert.ok(c > -1 && c < 1)
    close(y, model.level)
    close(model.fn(c), model.level)
    const jump = theoremDemo('ivt', p, true)
    assert.ok(jump.level > -1 && jump.level < 1)
    assert.notEqual(jump.fn(-0.5), jump.level)
    assert.notEqual(jump.fn(0.5), jump.level)
  }
})
test('MVT and Rolle tangents match their secant slopes at interior points', () => {
  for (const id of ['mvt', 'rolle']) for (const p of [0, 0.5, 1]) {
    const model = theoremDemo(id, p)
    const [a, b] = model.domain, c = model.points.at(-1)[0]
    assert.ok(a < c && c < b)
    const slope = (model.fn(b) - model.fn(a)) / (b - a)
    close(2 * c, slope)
    close((model.lines[1].y[1] - model.lines[1].y[0]) / (b - a), slope)
    if (id === 'rolle') close(slope, 0)
  }
})
test('integral mean-value rectangles equal the analytic integral and squeeze bounds hold', () => {
  for (const p of [0, 0.5, 1]) {
    const model = theoremDemo('integral-mvt', p)
    const [a, b, height] = model.rectangle
    close((b - a) * height, b ** 3 / 3)
    close(model.fn(model.points[0][0]), height)
    const squeeze = theoremDemo('squeeze', p)
    for (let i = 0; i <= 100; i++) {
      const x = squeeze.domain[0] + (squeeze.domain[1] - squeeze.domain[0]) * i / 100
      assert.ok(squeeze.fn(x) <= x * x + 1e-14)
      assert.ok(squeeze.fn(x) >= -x * x - 1e-14)
    }
  }
})
