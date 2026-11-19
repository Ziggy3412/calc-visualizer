import test from 'node:test'
import assert from 'node:assert/strict'
import {derivative, evaluate} from 'mathjs'
import {QUESTIONS} from '../src/practice/questions.js'
import {integrateAdaptive} from '../src/shared/adaptiveIntegral.js'

// Convert the restricted answer notation used by these exercises, independently
// of the bank's answer-generating code. This is deliberately test-only.
function ascii(tex) {
 let cursor=0
 function atom() {
  if(tex[cursor]==='{') { cursor++; const value=sequence('}'); cursor++; return `(${value})` }
  if(tex[cursor]==='\\') {
   cursor++
   const command=/^[a-zA-Z]+/.exec(tex.slice(cursor))?.[0]??tex[cursor]
   cursor+=command.length
   if(command==='frac') {const a=atom(),b=atom();return `((${a})/(${b}))`}
   if(command==='sqrt')return `sqrt(${atom()})`
   if(command==='pi')return ' pi '
   if(command==='ln' && tex[cursor]==='|') {
    cursor++; const end=tex.indexOf('|',cursor),inside=tex.slice(cursor,end);cursor=end+1
    return ` log(abs(${ascii(inside)}))`
   }
   if(['sin','cos','tan','sec','csc'].includes(command)) {
    while(tex[cursor]===' ')cursor++
    if(tex.slice(cursor,cursor+3)==='^2x'){cursor+=3;return ` ${command}(x)^2`}
    if(tex[cursor]!=='(')return ` ${command}(${atom()})`
   }
   if(command==='ln')return ' log'
   if(command==='arcsin')return 'asin'
   if(command==='cdot')return '*'
   if(['left','right',',',';','!',' '].includes(command))return ''
   return ` ${command}`
  }
  return tex[cursor++]??''
 }
 function sequence(end) {let out='';while(cursor<tex.length&&tex[cursor]!==end)out+=atom();return out}
 return sequence().replace(/x\(/g,'x*(').replace(/sec\^2x/g,'sec(x)^2').replace(/\|([^|]+)\|/g,'abs($1)')
}
const close=(a,b,id)=>assert.ok(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<1e-7*(1+Math.abs(b)),`${id}: ${a} != ${b}`)
const answer=q=>ascii(q.choices[q.answer])

test('all added differentiation answers agree with independent symbolic derivatives',()=>{
 const orders={'2.5':1,'2.6':1,'2.7':1,'2.8':1,'2.9':1,'2.10':1,'3.1':1,'3.4':1,'3.5':1,'3.6':3}
 for(const q of QUESTIONS.filter(q=>q.number>1&&orders[q.topicId])) {
  let fn=ascii(q.math.split('=')[1])
  for(let n=0;n<orders[q.topicId];n++)fn=derivative(fn,'x').toString()
  for(const x of q.topicId==='3.4'?[.01,.03]:[.7,1.3]) {
   const expected=evaluate(fn,{x}),choices=q.choices.map(choice=>evaluate(ascii(choice),{x}))
   close(evaluate(answer(q),{x}),expected,q.id)
   assert.equal(choices.filter(value=>Math.abs(value-expected)<1e-10*(1+Math.abs(expected))).length,1,q.id)
  }
 }
})
test('all added antiderivatives differentiate to their stated integrands',()=>{
 for(const q of QUESTIONS.filter(q=>q.number>1&&['6.8','6.10','6.14'].includes(q.topicId))) {
  const integrand=ascii(q.math.replace(/^\\int\s*/,'').replace(/\\,dx$/,''))
  const result=derivative(answer(q),'x')
  for(const x of [.3,1.1])close(result.evaluate({x,C:0}),evaluate(integrand,{x}),q.id)
 }
})
test('added integral, volume, arc-length, and polar-area keys match numerical quadrature',()=>{
 for(const q of QUESTIONS.filter(q=>q.number>1)) {
  const k=q.number
  let fn,a=0,b=1
  switch(q.topicId) {
   case '6.7': fn=x=>3*x*x;b=k;break
   case '6.9': fn=x=>2*k*x/(1+k*x*x);break
   case '6.11': fn=x=>k*x*Math.exp(x);break
   case '8.1': fn=x=>x*x/(k+3);b=k+3;break
   case '8.4': fn=x=>k*x-k*x*x;break
   case '8.5': fn=y=>k*y-y*y;b=k;break
   case '8.6': fn=x=>Math.abs(k*x-k*x*x*x);a=-1;break
   case '8.7': fn=x=>(k-x)**2;b=k;break
   case '8.8': fn=()=>Math.sqrt(3);b=k+3;break
   case '8.9': fn=x=>Math.PI*x*x;b=k;break
   case '8.10': fn=x=>Math.PI*(x+k)**2;break
   case '8.11': fn=x=>Math.PI*((k+1)**2-x*x);break
   case '8.12': fn=x=>Math.PI*((k+2)**2-(x+k)**2);break
   case '8.13': fn=()=>Math.hypot(1,k);b=k;break
   case '9.3': fn=t=>Math.hypot(-(k+3)*Math.sin(t),(k+3)*Math.cos(t));b=Math.PI/2;break
   case '9.8': fn=()=>((k+2)**2)/2;b=Math.PI;break
   case '9.9': fn=()=>((k+1)**2-k*k)/2;b=2*Math.PI;break
   default: continue
  }
  const integral=integrateAdaptive(fn,a,b)
  assert.ok(integral.converged,q.id)
  close(evaluate(answer(q)),integral.value,q.id)
  const choices=q.choices.map(choice=>evaluate(ascii(choice)))
  assert.equal(choices.filter(v=>Math.abs(v-integral.value)<1e-7*(1+Math.abs(integral.value))).length,1,q.id)
 }
})
