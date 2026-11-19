// Truncated power-series arithmetic computes Taylor coefficients directly.
// This avoids the rapidly growing symbolic derivatives of nested roots.
export class UnsupportedSeriesOperation extends Error {}
const domainError = () => new Error('This branch has no real Taylor expansion at the selected center. Choose a center inside its real domain.')

export function seriesCoefficients(node, center, degree) {
  const constant = value => {
    if(typeof value !== 'number'||!Number.isFinite(value))throw domainError()
    const out=Array(degree+1).fill(0);out[0]=value;return out
  }
  const scale=(a,value)=>a.map(v=>v*value)
  const add=(a,b)=>a.map((v,i)=>v+b[i])
  const multiply=(a,b)=>a.map((_,n)=>{
    let sum=0;for(let k=0;k<=n;k++)sum+=a[k]*b[n-k]
    return sum
  })
  const divide=(a,b)=>{
    if(b[0]===0)throw domainError()
    const out=constant(0)
    for(let n=0;n<=degree;n++) {
      let sum=a[n];for(let k=1;k<=n;k++)sum-=b[k]*out[n-k]
      out[n]=sum/b[0]
    }
    return out
  }
  const exponent=a=>{
    const out=constant(Math.exp(a[0]))
    for(let n=1;n<=degree;n++){let sum=0;for(let k=1;k<=n;k++)sum+=k*a[k]*out[n-k];out[n]=sum/n}
    return out
  }
  const derivative=a=>a.map((_,i)=>i<degree?(i+1)*a[i+1]:0)
  const integral=(a,value)=>[value,...a.slice(0,degree).map((v,i)=>v/(i+1))]
  const logarithm=a=>{
    if(a[0]<=0)throw domainError()
    return integral(divide(derivative(a),a),Math.log(a[0]))
  }
  const power=(a,p)=>{
    if(p===0)return constant(1)
    if(a[0]===0) {
      if(degree===0&&p>0)return constant(0)
      if(Number.isInteger(p)&&p>0) {
        let out=constant(1),base=a,n=p
        while(n>0){if(n%2)out=multiply(out,base);n=Math.floor(n/2);if(n)base=multiply(base,base)}
        return out
      }
      throw domainError()
    }
    const out=constant(Math.pow(a[0],p))
    for(let n=1;n<=degree;n++) {
      let sum=0;for(let k=1;k<=n;k++)sum+=((p+1)*k-n)*a[k]*out[n-k]
      out[n]=sum/(n*a[0])
    }
    return out
  }
  const sineCosine=a=>{
    const s=constant(Math.sin(a[0])),c=constant(Math.cos(a[0]))
    for(let n=1;n<=degree;n++) {
      let sv=0,cv=0
      for(let k=1;k<=n;k++){sv+=k*a[k]*c[n-k];cv-=k*a[k]*s[n-k]}
      s[n]=sv/n;c[n]=cv/n
    }
    return [s,c]
  }
  function visit(n) {
    if(!n.filter(item=>item.isSymbolNode&&item.name==='x').length)return constant(n.evaluate())
    if(n.isParenthesisNode)return visit(n.content)
    if(n.isSymbolNode&&n.name==='x'){const out=constant(center);if(degree)out[1]=1;return out}
    if(n.isOperatorNode) {
      const args=n.args.map(visit),a=args[0],b=args[1]
      if(n.op==='+')return b?add(a,b):a
      if(n.op==='-')return b?add(a,scale(b,-1)):scale(a,-1)
      if(n.op==='*')return multiply(a,b)
      if(n.op==='/')return divide(a,b)
      if(n.op==='^')return b.slice(1).every(v=>v===0)?power(a,b[0]):exponent(multiply(b,logarithm(a)))
    }
    if(n.isFunctionNode) {
      const args=n.args.map(visit),a=args[0],name=n.fn.name
      if(name==='sqrt')return power(a,.5)
      if(name==='exp')return exponent(a)
      if(name==='log'||name==='ln')return args[1]?divide(logarithm(a),logarithm(args[1])):logarithm(a)
      if(name==='sin')return sineCosine(a)[0]
      if(name==='cos')return sineCosine(a)[1]
      if(name==='tan'){const [s,c]=sineCosine(a);return divide(s,c)}
      if(name==='sinh')return scale(add(exponent(a),scale(exponent(scale(a,-1)),-1)),.5)
      if(name==='cosh')return scale(add(exponent(a),exponent(scale(a,-1))),.5)
      if(name==='tanh')return divide(add(exponent(scale(a,2)),constant(-1)),add(exponent(scale(a,2)),constant(1)))
      if(name==='abs'){if(a[0]===0)throw domainError();return scale(a,Math.sign(a[0]))}
      if(name==='asin'||name==='acos') {
        const d=divide(derivative(a),power(add(constant(1),scale(multiply(a,a),-1)),.5))
        return integral(name==='acos'?scale(d,-1):d,name==='acos'?Math.acos(a[0]):Math.asin(a[0]))
      }
      if(name==='atan')return integral(divide(derivative(a),add(constant(1),multiply(a,a))),Math.atan(a[0]))
      if(name==='nthRoot'&&args[1]&&args[1].slice(1).every(v=>v===0)) {
        const root=args[1][0]
        return a[0]<0&&Number.isInteger(root)&&root%2 ? scale(power(scale(a,-1),1/root),-1):power(a,1/root)
      }
      if(name==='pow'&&args[1]&&args[1].slice(1).every(v=>v===0))return power(a,args[1][0])
    }
    throw new UnsupportedSeriesOperation('Use symbolic derivatives for this expression.')
  }
  const result=visit(node)
  if(!result.every(Number.isFinite))throw domainError()
  return result
}
