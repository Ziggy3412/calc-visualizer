import {parse} from 'mathjs'
export function compileSlope(expression) {
  const tree=parse(expression),compiled=tree.compile(),guards=[]
  function denominator(node) {
    guards.push(node.compile())
    // Squared denominators do not change sign at their zeros; check their bases.
    node.traverse(child=>{if(child.isOperatorNode&&child.op==='^')guards.push(child.args[0].compile())})
  }
  tree.traverse(node=>{
    if(node.isOperatorNode&&node.op==='/')denominator(node.args[1])
    if(node.isOperatorNode&&node.op==='^') {
      try {if(Number(node.args[1].evaluate())<0)denominator(node.args[0])}catch{/* variable exponent */}
    }
  })
  const evaluate=(program,x,y)=>{
    try {const value=program.evaluate({x,y});return typeof value==='number'&&Number.isFinite(value)?value:NaN}catch{return NaN}
  }
  const slope=(x,y)=>evaluate(compiled,x,y)
  slope.segmentValid=(x,y,nx,ny)=>guards.every(guard=>{
    const start=evaluate(guard,x,y)
    if(!Number.isFinite(start)||start===0)return false
    for(const t of [.25,.5,.75,1]) {
      const value=evaluate(guard,x+(nx-x)*t,y+(ny-y)*t)
      if(!Number.isFinite(value)||value===0||Math.sign(start)!==Math.sign(value))return false
    }
    return true
  })
  return slope
}
