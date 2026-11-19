import { integrateAdaptive } from './adaptiveIntegral.js'
export const formatBound=value=>value===Infinity?'∞':value===-Infinity?'−∞':String(value)
export const texBound=value=>value===Infinity?'\\infty':value===-Infinity?'-\\infty':String(value)
export function previewBounds(a,b,reach=10) {
  if(Number.isFinite(a)&&Number.isFinite(b))return [a,b]
  if(a===-Infinity&&b===Infinity)return [-reach,reach]
  if(a===Infinity&&b===-Infinity)return [reach,-reach]
  if(Number.isFinite(a))return [a,a+(b===Infinity?reach:-reach)]
  if(Number.isFinite(b))return [b+(a===-Infinity?-reach:reach),b]
  return [-reach,reach]
}
export function integrateExtended(f,a,b) {
  if(Number.isFinite(a)&&Number.isFinite(b))return integrateAdaptive(f,a,b)
  if(a===b)return {value:NaN,error:NaN,converged:false,samples:[],message:'Equal infinite bounds do not define an integral.'}
  if(a>b){const result=integrateExtended(f,b,a);return {...result,value:-result.value}}
  const samples=[]
  function tail(start,direction) {
    let total=0,error=0,previous=Infinity,small=0,distance=0,width=1
    for(let k=0;k<44;k++) {
      const left=start+direction*distance,right=start+direction*(distance+width)
      const part=integrateAdaptive(f,Math.min(left,right),Math.max(left,right),{absoluteTolerance:1e-10,relativeTolerance:1e-9,maxEvaluations:16000})
      samples.push(...part.samples)
      if(!part.converged)return {value:NaN,error:NaN,converged:false}
      total+=part.value;error+=part.error
      const magnitude=Math.abs(part.value),ratio=previous>0?magnitude/previous:0
      const remainder=ratio<.95?magnitude*ratio/(1-ratio):Infinity
      if(magnitude===0||remainder<1e-8*(1+Math.abs(total)))small++;else small=0
      if(small>=4)return {value:total,error:error+(Number.isFinite(remainder)?remainder:0),converged:true}
      previous=magnitude;distance+=width;width*=2
    }
    return {value:NaN,error:NaN,converged:false}
  }
  let result
  if(a===-Infinity&&b===Infinity) {
    // Each tail must converge separately; never substitute a principal value.
    const left=tail(0,-1),right=tail(0,1)
    result={value:left.value+right.value,error:left.error+right.error,converged:left.converged&&right.converged}
  } else result=a===-Infinity?tail(b,-1):tail(a,1)
  return {...result,samples:samples.sort((p,q)=>p[0]-q[0]),message:result.converged?'Improper integral estimate; tails checked separately.':'No convergent estimate found. This integral may diverge or need a different method.'}
}
