import test from 'node:test'
import assert from 'node:assert/strict'
import katex from 'katex'
import { PROOFS } from '../src/shared/proofs.js'
import { DEMO_IDS } from '../src/shared/theoremDemos.js'
import { CUSTOM_PROOF_VISUALS, PROOF_CONTROLS, proofVisual } from '../src/shared/proofVisuals.js'
import { dismissDialogOutside } from '../src/shared/dialogDismiss.js'
const close = (a,b) => assert.ok(Math.abs(a-b)<1e-10, `${a} ≠ ${b}`)
test('every proof has a finite interactive visual with valid mathematics', () => {
  for (const proof of PROOFS) assert.ok(DEMO_IDS.includes(proof.id) || CUSTOM_PROOF_VISUALS.includes(proof.id),proof.id)
  for (const id of CUSTOM_PROOF_VISUALS) {
    const control=PROOF_CONTROLS[id]
    for(const value of [control.min,control.initial,control.max]) {
      const model=proofVisual(id,value)
      assert.doesNotThrow(()=>katex.renderToString(model.formula,{throwOnError:true}),id)
      assert.ok(model.range.every(Number.isFinite) && model.range[0]<model.range[1] && model.range[2]<model.range[3])
      for(const trace of model.traces) {
        assert.equal(trace.x.length,trace.y.length,id)
        assert.ok([...trace.x,...trace.y].every(Number.isFinite),id)
      }
    }
  }
})
test('absolute convergence visual bounds every signed tail by its absolute tail', () => {
  for(const n of [1,4,12]) {
    const [signed,bound]=proofVisual('absolute',n).traces
    signed.y.forEach((value,i)=>{
      assert.ok(value<=bound.y[i]+1e-15)
      assert.ok(bound.y[i]<2**(-n))
    })
  }
})
test('geometric partial sums match the finite cancellation identity', () => {
  for(const n of [1,5,18]) {
    const model=proofVisual('geometric',n)
    close(model.traces[1].y.at(-1),model.traces[0].y.reduce((a,b)=>a+b,0))
    close(2-model.traces[1].y.at(-1),2**(-n))
  }
})
test('dialog backdrop clicks close, while content and interior padding stay open', () => {
  let closed=0
  const dialog={close:()=>closed++,getBoundingClientRect:()=>({left:100,right:400,top:100,bottom:300})}
  const dispatch=(x,y,target=dialog)=>dismissDialogOutside({currentTarget:dialog,target,clientX:x,clientY:y})
  dispatch(150,150)
  dispatch(50,50,{})
  assert.equal(closed,0)
  dispatch(99,150);dispatch(401,150);dispatch(150,99);dispatch(150,301)
  assert.equal(closed,4)
})
