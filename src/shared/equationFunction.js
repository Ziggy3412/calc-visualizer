import { parse, simplify, derivative } from 'mathjs'
import { normalizeExpr, normalizeMathAscii } from './mathExpr.js'

const has = (node, name) => node.filter(n => n.isSymbolNode && n.name === name).length > 0
const add = (a, b) => a === '0' ? b : b === '0' ? a : `(${a})+(${b})`
const mul = (a, b) => a === '0' || b === '0' ? '0' : a === '1' ? b : b === '1' ? a : `(${a})*(${b})`
function polynomial(node, variable) {
  if (!has(node, variable)) return [node.toString()]
  if (node.isParenthesisNode) return polynomial(node.content, variable)
  if (node.isSymbolNode && node.name === variable) return ['0', '1']
  if (!node.isOperatorNode) throw Error('This equation cannot be solved for the selected variable yet. Try an equation that is linear or quadratic in it.')
  const args = node.args
  const a = polynomial(args[0], variable)
  if (node.op === '+' && args.length === 1) return a
  if (node.op === '-' && args.length === 1) return a.map(v => mul('-1', v))
  if (node.op === '+' || node.op === '-') {
    const b = polynomial(args[1], variable)
    return Array.from({length: Math.max(a.length,b.length)}, (_,i)=>add(a[i]||'0', node.op === '-' ? mul('-1',b[i]||'0') : b[i]||'0'))
  }
  if (node.op === '/' && !has(args[1], variable)) return a.map(v => v === '0' ? '0' : `(${v})/(${args[1]})`)
  const product = (a,b) => {
    if (a.length+b.length > 10) throw Error('Choose an equation with a lower power of the dependent variable.')
    const out = Array(a.length+b.length-1).fill('0')
    a.forEach((v,i)=>b.forEach((w,j)=>{out[i+j]=add(out[i+j],mul(v,w))}))
    return out
  }
  if (node.op === '*') return product(a, polynomial(args[1],variable))
  if (node.op === '^' && args[1].isConstantNode && Number.isInteger(Number(args[1].value)) && Number(args[1].value)>=0 && Number(args[1].value)<=8) {
    let out=['1']; for(let i=0;i<Number(args[1].value);i++) out=product(out,a)
    return out
  }
  throw Error('This equation cannot be solved for the selected variable yet. Try an equation that is linear or quadratic in it.')
}

function boundedDomain(discriminant, variable) {
  try {
    const c=polynomial(parse(discriminant),variable).map(v=>Number(parse(simplify(v).toString()).evaluate()))
    if(c.length!==3 || !c.every(Number.isFinite) || c[2]>=0) return null
    const d=c[1]*c[1]-4*c[2]*c[0]
    if(d<=0)return null
    const roots=[(-c[1]-Math.sqrt(d))/(2*c[2]),(-c[1]+Math.sqrt(d))/(2*c[2])].sort((a,b)=>a-b)
    return roots.map(v=>Number(v.toPrecision(14)))
  } catch { return null }
}

export function equationFunction(raw, { independent = 'x', dependent = 'y', mode = 'function', branch = 'upper' } = {}) {
  let expression = normalizeExpr(raw)
  // Keep coordinate equations for slope fields: y=x² means slope 2x.
  if ((mode === 'slope' || mode === 'polar' || mode === 'relation') && /^\s*[xy]\s*=(?!=)/.test(raw)) expression = normalizeMathAscii(raw)
  const parts = expression.split(/(?<![<>=!])=(?!=)/)
  if (parts.length === 1 || mode === 'graph' || mode === 'relation') return { expression, branches: false, relation: false }
  if (parts.length !== 2 || parts.some(s=>!s.trim())) throw Error('Complete both sides of the equation.')
  let residual = parse(`(${parts[0]})-(${parts[1]})`)
  if (mode === 'slope') {
    const fx = derivative(residual,'x').toString(), fy = derivative(residual,'y').toString()
    return { expression: `-(${fx})/(${fy})`, branches: false, relation: true, slope: true }
  }
  if (mode === 'polar' && (has(residual,'y') || (has(residual,'x') && !has(residual,'r') && !has(residual,'theta')))) {
    residual = residual.transform(node => node.isSymbolNode && node.name === 'x' ? parse('r*cos(theta)') : node.isSymbolNode && node.name === 'y' ? parse('r*sin(theta)') : node)
  }
  const coefficients = polynomial(residual,dependent).map(v=>simplify(v).toString())
  while(coefficients.length>1 && coefficients.at(-1)==='0') coefficients.pop()
  const degree=coefficients.length-1, c=coefficients[0]
  if (!degree) throw Error(`This relation does not define ${dependent} as a function of ${independent}. ${dependent === 'y' ? 'For a vertical curve, use x = g(y) in Solids or use Graph.' : 'Try switching the independent variable.'}`)
  if (degree===1) return { expression: simplify(`-(${c})/(${coefficients[1]})`).toString(), branches: false, relation: true }
  let center='0', radius, domain=null
  if (degree===2) {
    const a=coefficients[2], b=coefficients[1]
    center=simplify(`-(${b})/(2*(${a}))`).toString()
    const discriminant=`(${b})^2-4*(${a})*(${c})`
    radius=simplify(`sqrt(${discriminant})/(2*abs(${a}))`).toString()
    domain=boundedDomain(discriminant,independent)
  } else if (coefficients.slice(1,-1).every(v=>v==='0')) {
    const root=`nthRoot(-(${c})/(${coefficients[degree]}),${degree})`
    if (degree%2) return { expression: root, branches: false, relation: true }
    radius=root
  } else throw Error(`Choose an equation that is linear or quadratic in ${dependent}, or enter one branch explicitly.`)
  return { expression: simplify(`(${center})${branch==='lower'?'-':'+'}(${radius})`).toString(), branches: true, relation: true, domain, oppositeExpression: simplify(`(${center})${branch==='lower'?'+':'-'}(${radius})`).toString() }
}
