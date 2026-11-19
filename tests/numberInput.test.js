import test from 'node:test'
import assert from 'node:assert/strict'
import { parseNumberDraft, constrainNumber } from '../src/shared/numberInput.js'

test('numeric drafts support signed decimals and scientific notation', () => {
 for (const [text, value] of [['-1',-1],['−2.5',-2.5],['.5',.5],['-.5',-.5],['1.',1],['1e-3',.001],['+2',2],['01',1]]) assert.equal(parseNumberDraft(text),value)
})
test('unfinished or invalid edits never turn into zero or nonfinite graph data', () => {
 for (const text of ['', ' ', '-', '.', '-.', '+', '1e', '1e-', 'Infinity', 'NaN', '1e999', '2abc', '0xff']) assert.equal(parseNumberDraft(text),null,text)
})
test('numeric bounds and slider steps are enforced without floating-point tails', () => {
 assert.equal(constrainNumber(-12,-10,10,'any'),-10)
 assert.equal(constrainNumber(12,-10,10,'any'),10)
 assert.equal(constrainNumber(-2.37,undefined,undefined,'any'),-2.37)
 assert.equal(constrainNumber(.3,0,1,.1),.3)
 assert.equal(constrainNumber(4.7,1,20,1),5)
})
