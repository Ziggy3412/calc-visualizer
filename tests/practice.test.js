import test from 'node:test'
import assert from 'node:assert/strict'
import katex from 'katex'
import { compile, derivative, evaluate } from 'mathjs'
import { QUESTIONS, TOPICS, UNITS } from '../src/practice/questions.js'
import { TOOLS } from '../src/shared/tools.js'
const find = id => QUESTIONS.find(q => q.id === id)
test('practice covers every numbered topic with ten questions and separates AB from BC', () => {
  const counts = [16,10,6,7,12,14,9,13,9,15]
  assert.equal(UNITS.length,10)
  assert.equal(QUESTIONS.length,1110)
  assert.equal(new Set(QUESTIONS.map(q => q.id)).size,QUESTIONS.length)
  for (const topic of TOPICS) {
    const exercises=QUESTIONS.filter(q => q.topicId===topic.id)
    assert.equal(exercises.length,10,topic.id)
    assert.deepEqual(exercises.map(q => q.number),[1,2,3,4,5,6,7,8,9,10])
    assert.equal(new Set(exercises.map(q => q.prompt+' '+q.math)).size,10,topic.id)
    assert.ok(exercises.every(q=>q.bcOnly===topic.bcOnly && q.unit===topic.unit),topic.id)
  }
  assert.deepEqual(TOPICS.map(q => q.id), counts.flatMap((count,i) => Array.from({length:count},(_,j) => `${i+1}.${j+1}`)))
  assert.equal(QUESTIONS.filter(q => !q.bcOnly).length,810)
  for (const id of ['6.11','6.12','6.13','7.5','7.9','8.13']) assert.equal(find(id).bcOnly,true)
})
test('every question has four answers, a valid key, and renderable worked mathematics', () => {
  for(const q of QUESTIONS) {
    assert.ok(q.prompt && q.explanation && q.work.length, q.id)
    assert.equal(q.choices.length,4,q.id)
    assert.equal(new Set(q.choices).size,4,q.id)
    assert.ok(Number.isInteger(q.answer) && q.answer >=0 && q.answer<4,q.id)
    for(const tex of [q.math,...q.choices,...q.work]) assert.doesNotThrow(() => katex.renderToString(tex,{throwOnError:true}),q.id)
  }
})
test('available visualizers have valid tools and executable function presets', () => {
  for(const q of QUESTIONS.filter(q => q.visual)) {
    assert.ok(TOOLS.some(t=>t.id===q.visual.tool && t.id!=='practice'),q.id)
    const p=q.visual.initial
    for(const name of ['expr','expr1','expr2','bottomExpr']) if(p[name]) assert.doesNotThrow(()=>p[name].ascii.split('=').forEach(part=>compile(part)),q.id)
    for(const entry of p.entries??[]) assert.doesNotThrow(()=>compile(entry.expr),q.id)
    if(p.overlays) assert.ok(p.overlays.every(key=>['critical','concavity','inflection'].includes(key)),q.id)
    if(p.graphs) assert.ok(p.graphs.every(key=>['x','v','a'].includes(key)),q.id)
  }
})
test('representative numeric answer keys match independent calculations', () => {
  const answer = id => evaluate(find(id).choices[find(id).answer])
  assert.equal(answer('2.2'),derivative('x^2','x').evaluate({x:2}))
  assert.equal(answer('6.2'),[0,1].reduce((sum,x)=>sum+x*x,0))
  assert.equal(answer('7.5'),2.5)
  assert.equal(answer('8.1'),(3**3/3)/3)
  assert.equal(answer('9.1'),(3*2**2)/(2*2))
  assert.equal(answer('9.2'),3/4)
  assert.equal(answer('10.10'),1/11)
  assert.ok(Math.abs(answer('10.12')-2*.1**3/6)<1e-15)
})
