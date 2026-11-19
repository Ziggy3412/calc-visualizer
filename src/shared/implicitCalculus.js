import {parse,derivative,simplify,evaluate} from 'mathjs'

export function implicitCalculus(expression) {
  const parts=expression.split(/(?<![<>=!])=(?!=)/)
  if(parts.length!==2||parts.some(p=>!p.trim()))throw Error('Enter both sides of an equation, such as x^2 + y^2 = 25.')
  const left=parse(parts[0]),right=parse(parts[1])
  const residual=simplify(`(${left})-(${right})`)
  const partial=(node,variable)=>simplify(derivative(node,variable))
  const fx=partial(residual,'x'),fy=partial(residual,'y')
  let slope=null
  if(fy.toString()!=='0')slope=simplify(`-(${fx})/(${fy})`)
  return {left,right,residual,fx,fy,slope,lx:partial(left,'x'),ly:partial(left,'y'),rx:partial(right,'x'),ry:partial(right,'y')}
}
export function scalar(text) {
  try{const value=evaluate(String(text));return typeof value==='number'&&Number.isFinite(value)?value:NaN}catch{return NaN}
}
export function pointOnRelation(details,x,y) {
  try{
    const scope={x,y},left=details.left.evaluate(scope),right=details.right.evaluate(scope)
    const fx=details.fx.evaluate(scope),fy=details.fy.evaluate(scope)
    if(![x,y,left,right,fx,fy].every(Number.isFinite))return {valid:false,message:'The equation or its derivatives are undefined at this point.'}
    if(Math.abs(left-right)>1e-7*(1+Math.abs(left)+Math.abs(right)))return {valid:false,message:'This point is not on the curve. Adjust x and y to satisfy the equation.'}
    const tolerance=1e-10*(1+Math.abs(fx)+Math.abs(fy))
    if(Math.abs(fy)<=tolerance)return Math.abs(fx)<=tolerance?{valid:true,kind:'singular',fx,fy}:{valid:true,kind:'vertical',fx,fy}
    return {valid:true,kind:'regular',fx,fy,slope:-fx/fy}
  }catch{return {valid:false,message:'Enter finite x and y values where the relation is defined.'}}
}
export function solveRelatedRate(details,x,y,known,rate) {
  const point=pointOnRelation(details,x,y)
  if(!point.valid)return point
  if(!Number.isFinite(rate))return {valid:false,message:'Enter a finite known rate.'}
  const coefficient=known==='x'?point.fy:point.fx
  const other=known==='x'?point.fx:point.fy
  const tolerance=1e-10*(1+Math.abs(point.fx)+Math.abs(point.fy))
  if(Math.abs(coefficient)<=tolerance)return {valid:false,message:Math.abs(other*rate)<=tolerance?'The differentiated equation does not determine the unknown rate at this instant.':'No finite unknown rate satisfies this equation at this instant.'}
  const unknown=-other*rate/coefficient
  if(!Number.isFinite(unknown))return {valid:false,message:'The unknown rate is undefined at this instant.'}
  return {...point,unknown,dx:known==='x'?rate:unknown,dy:known==='y'?rate:unknown}
}
export function chainRuleTex(xNode,yNode,rate=String.raw`\frac{dy}{dx}`) {
  const pieces=[]
  if(xNode.toString()!=='0')pieces.push(xNode.toTex())
  if(yNode.toString()!=='0')pieces.push(yNode.toString()==='1'?rate:String.raw`\left(${yNode.toTex()}\right)${rate}`)
  return pieces.length?pieces.join(' + '):'0'
}
export const prettyNumber = value => Number.isFinite(value)?Number(value.toPrecision(7)).toString():'—'
