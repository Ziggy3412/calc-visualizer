import test from 'node:test'
import assert from 'node:assert/strict'
import katex from 'katex'
import { PROOFS } from '../src/shared/proofs.js'
import { THEOREMS } from '../src/shared/theorems.js'

test('proofs link to known theorem statements and render all mathematical steps', () => {
  assert.equal(new Set(PROOFS.map(p => p.id)).size, PROOFS.length)
  for (const proof of PROOFS) {
    assert.ok(THEOREMS.some(t => t.id === proof.id), proof.id)
    assert.ok(proof.idea && proof.steps.length > 1, proof.id)
    for (const step of proof.steps) {
      assert.ok(step.title && step.explanation, proof.id)
      if (step.math) assert.doesNotThrow(() => katex.renderToString(step.math, { throwOnError: true, strict: 'error' }), `${proof.id}: ${step.title}`)
    }
  }
})
