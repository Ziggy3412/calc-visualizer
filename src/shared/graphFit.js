import { equationFunction } from './equationFunction.js'
import { compile } from 'mathjs'
import { makeEval } from './numerics.js'

export function paddedBounds(points, padding = 0.12) {
  const valid = points.filter(point => point.length === 2 && point.every(Number.isFinite))
  if (!valid.length) return null
  let xMin=Infinity,xMax=-Infinity,yMin=Infinity,yMax=-Infinity
  for(const [x,y] of valid) { xMin=Math.min(xMin,x);xMax=Math.max(xMax,x);yMin=Math.min(yMin,y);yMax=Math.max(yMax,y) }
  const dx=Math.max(xMax-xMin,1)*padding,dy=Math.max(yMax-yMin,1)*padding
  return {xMin:xMin-dx,xMax:xMax+dx,yMin:yMin-dy,yMax:yMax+dy}
}

// Fit all finite sampled values in the selected interval. Undefined values
// break the curve; finite peaks and steep endpoints must not be discarded.
export function functionBounds(functions, a, b, { includeZero=false, points=[], padX=true } = {}) {
  if(![a,b].every(Number.isFinite))return null
  if(a>b)[a,b]=[b,a]
  if(a===b){a-=1;b+=1}
  const margin=padX?(b-a)*.08:0
  const left=a-margin,right=b+margin
  const samples=[]
  for(const fn of functions.filter(Boolean)) {
    const curve=[]
    for(let i=0;i<=600;i++) {
      const x=left+(right-left)*i/600
      let y
      try { y=fn(x) } catch { continue }
      if(Number.isFinite(y))curve.push([x,y])
    }
    samples.push(...curve)
  }
  if(!samples.length && !points.length)return null
  samples.push(...points)
  if(includeZero)samples.push([a,0],[b,0])
  const bounds=paddedBounds(samples)
  if(bounds) { bounds.xMin=Math.min(left,...points.filter(p=>p.every(Number.isFinite)).map(p=>p[0]));bounds.xMax=Math.max(right,...points.filter(p=>p.every(Number.isFinite)).map(p=>p[0])) }
  return bounds
}

export function expressionBounds(expression, a=-10, b=10, {padX=true}={}) {
  try {
    const branch=equationFunction(expression)
    const fn=makeEval(compile(branch.expression))
    const domain=branch.domain ?? [a,b]
    const functions=[fn]
    if(branch.oppositeExpression)functions.push(makeEval(compile(branch.oppositeExpression)))
    return functionBounds(functions,...domain,{padX:branch.domain?true:padX})
  }catch { return null }
}

export function mergeBounds(bounds) {
  const valid=bounds.filter(Boolean)
  return valid.length?paddedBounds(valid.flatMap(b=>[[b.xMin,b.yMin],[b.xMax,b.yMax]]),0):null
}

export function viewportForBounds(bounds, centerX=0, centerY=0) {
  if(!bounds || !Object.values(bounds).every(Number.isFinite))return null
  const {xMin,xMax,yMin,yMax}=bounds
  if(xMin>=xMax || yMin>=yMax)return null
  const zoom=Math.max(1e-6,(xMax-xMin)/2)
  return {zoom,aspect:Math.max(1e-6,(yMax-yMin)/2)/zoom,panX:xMin+(xMax-xMin)/2-centerX,panY:yMin+(yMax-yMin)/2-centerY}
}
