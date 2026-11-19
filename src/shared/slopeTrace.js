// RK4 with step doubling: reject unreliable steps rather than drawing through
// poles or carrying a large numerical error into the rest of a solution.
function rk4(slope,x,y,h) {
  const k1=slope(x,y)
  if(!Number.isFinite(k1))return null
  if(slope.segmentValid&&!slope.segmentValid(x,y,x+h/2,y+h*k1/2))return null
  const k2=slope(x+h/2,y+h*k1/2)
  if(!Number.isFinite(k2))return null
  if(slope.segmentValid&&!slope.segmentValid(x,y,x+h/2,y+h*k2/2))return null
  const k3=slope(x+h/2,y+h*k2/2)
  if(!Number.isFinite(k3))return null
  if(slope.segmentValid&&!slope.segmentValid(x,y,x+h,y+h*k3))return null
  const k4=slope(x+h,y+h*k3)
  if(!Number.isFinite(k4))return null
  const next=y+h*(k1+2*k2+2*k3+k4)/6
  return Number.isFinite(next)&&(!slope.segmentValid||slope.segmentValid(x,y,x+h,next))?next:null
}
export function traceSolution(slope,x0,y0,dir,step,maxSteps,bounds) {
  const xs=[],ys=[]
  if(!Number.isFinite(slope(x0,y0)))return {xs,ys}
  xs.push(x0);ys.push(y0)
  let x=x0,y=y0,h=step*dir
  const span=Math.max(1,bounds.yMax-bounds.yMin)
  const minStep=Math.max(1e-12,Math.abs(bounds.xMax-bounds.xMin)*1e-12)
  const maxStep=Math.abs(step)
  for(let attempt=0,accepted=0;accepted<maxSteps&&attempt<maxSteps*12;attempt++) {
    if(Math.abs(h)<minStep||x+h===x)break
    const full=rk4(slope,x,y,h)
    const half=rk4(slope,x,y,h/2)
    const fine=half===null?null:rk4(slope,x+h/2,half,h/2)
    const error=full===null||fine===null?Infinity:Math.abs(fine-full)/15
    const tolerance=span*1e-8+1e-8*Math.max(Math.abs(y),Math.abs(fine??y))
    // Limit the height of a step too: accurate but huge jumps obscure poles.
    if(error>tolerance||fine===null||Math.abs(fine-y)>span*.025) {h/=2;continue}
    x+=h;y=fine
    xs.push(x);ys.push(y);accepted++
    if(x<bounds.xMin-1||x>bounds.xMax+1||y<bounds.yMin-1||y>bounds.yMax+1)break
    if(error<tolerance/32)h=dir*Math.min(maxStep,Math.abs(h)*2)
  }
  return {xs,ys}
}
