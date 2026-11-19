// Geometric panels resolve narrow features near either bound or the origin,
// even when a uniform grid over the full interval would miss them completely.
export function integrateAdaptive(f,a,b,{absoluteTolerance=1e-8,relativeTolerance=1e-8,maxEvaluations=60000}={}) {
  const samples=new Map()
  let evaluations=0,failed=false,totalError=0
  if(!Number.isFinite(a)||!Number.isFinite(b))return {value:NaN,error:NaN,converged:false,samples:[]}
  if(a===b)return {value:0,error:0,converged:true,samples:[[a,f(a)]]}
  const sign=b<a?-1:1,lo=Math.min(a,b),hi=Math.max(a,b),span=hi-lo
  if(!Number.isFinite(span))return {value:NaN,error:NaN,converged:false,samples:[]}
  function value(x) {
    if(samples.has(x))return samples.get(x)
    if(evaluations>=maxEvaluations){failed=true;return NaN}
    evaluations++
    let y
    try{y=f(x)}catch{y=NaN}
    if(!Number.isFinite(y)){failed=true;y=NaN}
    samples.set(x,y);return y
  }
  const knots=new Set([lo,hi])
  for(let i=1;i<32;i++)knots.add(lo+span*i/32)
  for(let distance=Math.min(1e-8,span/32);distance<span;distance*=2) {
    for(const x of [lo+distance,hi-distance,-distance,distance])if(x>lo&&x<hi)knots.add(x)
    if(distance===0)break
  }
  if(lo<0&&hi>0)knots.add(0)
  const xs=[...knots].sort((x,y)=>x-y)
  const localTolerance=absoluteTolerance/(xs.length-1)
  function panel(left,right,fl,fm,fr,whole,tolerance,depth) {
    if(failed)return NaN
    const mid=left+(right-left)/2,lm=left+(mid-left)/2,rm=mid+(right-mid)/2
    if(mid===left||mid===right)return whole
    const f1=value(lm),f2=value(rm)
    const first=(mid-left)*(fl+4*f1+fm)/6,second=(right-mid)*(fm+4*f2+fr)/6
    const refined=first+second,delta=refined-whole
    if(!Number.isFinite(refined)){failed=true;return NaN}
    const error=Math.abs(delta)/15
    if(error<=tolerance+relativeTolerance*Math.abs(refined)) {totalError+=error;return refined+delta/15}
    if(depth===0){failed=true;return NaN}
    return panel(left,mid,fl,f1,fm,first,tolerance/2,depth-1)+panel(mid,right,fm,f2,fr,second,tolerance/2,depth-1)
  }
  let sum=0,compensation=0
  for(let i=1;i<xs.length&&!failed;i++) {
    const left=xs[i-1],right=xs[i],mid=left+(right-left)/2
    const fl=value(left),fm=value(mid),fr=value(right)
    const estimate=panel(left,right,fl,fm,fr,(right-left)*(fl+4*fm+fr)/6,localTolerance,24)
    const adjusted=estimate-compensation,next=sum+adjusted
    compensation=(next-sum)-adjusted;sum=next
  }
  return {value:failed?NaN:sign*sum,error:failed?NaN:totalError,converged:!failed,evaluations,samples:[...samples].sort((p,q)=>p[0]-q[0])}
}

export function integralDetailWindow(samples,a,b) {
  const finite=samples.filter(p=>Number.isFinite(p[1]))
  const peak=finite.reduce((max,p)=>Math.max(max,Math.abs(p[1])),0)
  if(peak===0)return null
  const active=finite.filter(p=>Math.abs(p[1])>=peak*1e-6)
  if(active.length<2)return null
  const start=active[0][0],end=active.at(-1)[0],width=end-start
  if(!(width>0)||Math.abs(b-a)<width*1000)return null
  return {a:start-width*.2,b:end+width*.2}
}
