import { functionBounds } from './graphFit.js'

// A Taylor comparison starts near its expansion point, not at a remote pole
// or a high-degree polynomial tail. Degree changes never change this window.
export function taylorFocusBounds(fn, center) {
  if(!fn || !Number.isFinite(center))return null
  const value=fn(center)
  if(!Number.isFinite(value))return functionBounds([fn],center-1,center+1)
  const scale=Math.max(1,Math.abs(value))
  const centeredBounds = radius => {
    const bounds=functionBounds([fn],center-radius,center+radius,{padX:false,points:[[center,value]]})
    if(!bounds)return null
    const halfHeight=Math.max(.5,value-bounds.yMin,bounds.yMax-value)
    return {xMin:center-radius,xMax:center+radius,yMin:value-halfHeight,yMax:value+halfHeight}
  }
  let radius=.5
  for(let attempt=0;attempt<10;attempt++,radius/=2) {
    let safe=true
    for(let i=0;i<=80;i++) {
      const y=fn(center-radius+2*radius*i/80)
      if(!Number.isFinite(y) || Math.abs(y-value)>16*scale) {safe=false;break}
    }
    if(safe)return centeredBounds(radius)
  }
  return centeredBounds(.25)
}

export function zoomBoundsAt(bounds,factor,x,y) {
  if(!Number.isFinite(factor)||factor<=0)return null
  const {xMin,xMax,yMin,yMax}=bounds
  const ax=Number.isFinite(x)&&x>=xMin&&x<=xMax?x:(xMin+xMax)/2
  const ay=Number.isFinite(y)&&y>=yMin&&y<=yMax?y:(yMin+yMax)/2
  return {xMin:ax+(xMin-ax)*factor,xMax:ax+(xMax-ax)*factor,yMin:ay+(yMin-ay)*factor,yMax:ay+(yMax-ay)*factor}
}
