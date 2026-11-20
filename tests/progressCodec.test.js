import test from 'node:test'
import assert from 'node:assert/strict'
import { QUESTIONS } from '../src/practice/questions.js'
import { CHALLENGES } from '../src/practice/challengeQuestions.js'
import { packProgress, unpackProgress, combineProgress } from '../src/shared/progressCodec.js'

const [a, b, c] = QUESTIONS
test('packs only checked answers and round-trips them', () => {
  const practice = { [a.id]: { choice: 1, checked: true }, [b.id]: { choice: 2, checked: false }, [c.id]: { choice: 0, checked: true }, nope: { choice: 1, checked: true } }
  const challenges = { [CHALLENGES[0].id]: { notes: 'x', complete: true }, [CHALLENGES[1].id]: { notes: '', complete: false } }
  const packed = packProgress(practice, challenges)
  assert.deepEqual(packed.challenges, [CHALLENGES[0].id])
  const back = unpackProgress(packed)
  assert.deepEqual(back.practice, { [a.id]: { choice: 1, checked: true }, [c.id]: { choice: 0, checked: true } })
  assert.deepEqual([...back.challenges], [CHALLENGES[0].id])
})
test('every question answered still fits comfortably in account metadata', () => {
  const all = Object.fromEntries(QUESTIONS.map(q => [q.id, { choice: q.choices.length - 1, checked: true }]))
  const done = Object.fromEntries(CHALLENGES.map(q => [q.id, { notes: '', complete: true }]))
  const packed = packProgress(all, done)
  assert.ok(JSON.stringify(packed).length < 4000, `packed size ${JSON.stringify(packed).length}`)
  assert.equal(Object.keys(unpackProgress(packed).practice).length, QUESTIONS.length)
})
test('ignores malformed account data', () => {
  assert.deepEqual(unpackProgress(null).practice, {})
  assert.deepEqual(unpackProgress({ v: 2, practice: { '1.1': '1' } }).practice, {})
  assert.deepEqual(unpackProgress({ v: 1, practice: { '1.1': '9x', zz: '1', '1.2': 5 }, challenges: 'bad' }).practice, {})
})
test('merge keeps device progress and adds account progress; replace uses only the account', () => {
  const packed = packProgress({ [a.id]: { choice: 3, checked: true }, [b.id]: { choice: 0, checked: true } }, { [CHALLENGES[0].id]: { complete: true } })
  const local = { practice: { [a.id]: { choice: 1, checked: true }, [b.id]: { choice: 2, checked: false }, [c.id]: { choice: 0, checked: true } }, challenges: { [CHALLENGES[1].id]: { notes: 'mine', complete: true } } }
  const merged = combineProgress(local, packed, 'merge')
  assert.deepEqual(merged.practice[a.id], { choice: 1, checked: true }) // device answer wins
  assert.deepEqual(merged.practice[b.id], { choice: 0, checked: true }) // checked beats unchecked
  assert.deepEqual(merged.practice[c.id], { choice: 0, checked: true })
  assert.equal(merged.challenges[CHALLENGES[0].id].complete, true)
  assert.equal(merged.challenges[CHALLENGES[1].id].complete, true)
  const replaced = combineProgress(local, packed, 'replace')
  assert.deepEqual(Object.keys(replaced.practice).sort(), [a.id, b.id].sort())
  assert.deepEqual(replaced.practice[a.id], { choice: 3, checked: true })
  assert.equal(replaced.challenges[CHALLENGES[1].id].complete, false)
  assert.equal(replaced.challenges[CHALLENGES[1].id].notes, 'mine') // notes stay on the device
})
