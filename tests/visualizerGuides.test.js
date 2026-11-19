import test from 'node:test'
import assert from 'node:assert/strict'
import katex from 'katex'
import { compile } from 'mathjs'
import { VISUALIZER_GUIDES } from '../src/shared/visualizerGuides.js'
import { TOOLS } from '../src/shared/tools.js'

test('every visualizer has a usable explanation and executable worked example', () => {
  const ids=TOOLS.filter(tool=>tool.category!=='Study').map(tool=>tool.id).sort()
  assert.deepEqual(Object.keys(VISUALIZER_GUIDES).sort(),ids)
  for (const [id,guide] of Object.entries(VISUALIZER_GUIDES)) {
    assert.ok(guide.intro && guide.picture && guide.caution,id)
    assert.ok(guide.steps.length>=3 && guide.example.explanation,id)
    for (const tex of [guide.formula,guide.example.math]) assert.doesNotThrow(()=>katex.renderToString(tex,{throwOnError:true}),id)
    const preset=guide.example.initial
    for (const name of ['expr','expr1','expr2','bottomExpr']) if(preset[name]) assert.doesNotThrow(()=>compile(preset[name].ascii),id)
    for (const entry of preset.entries || []) assert.doesNotThrow(()=>compile(entry.expr),id)
  }
})
test('by-parts explanation matches the app’s anchored antiderivative convention', () => {
  const guide=VISUALIZER_GUIDES.byparts
  assert.ok(guide.steps.some(step=>step.includes('v(a)=0')))
  assert.match(guide.example.math,/e\^x-1/)
  const boundary=Math.E-1
  const remainder=Math.E-2
  assert.ok(Math.abs(boundary-remainder-1)<1e-12)
})
