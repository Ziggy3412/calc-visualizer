import { expressionBounds, mergeBounds, paddedBounds } from '../shared/graphFit'
import {useMemo,useState} from 'react'
import MathInput from '../components/MathInput'
import TeX from '../components/TeX'
import Plot from '../components/ThemedPlot'
import ZoomControls from '../components/ZoomControls'
import LessonSteps from '../components/LessonSteps'
import usePlotView from '../shared/usePlotView'
import {buildImplicitTrace} from '../shared/implicitPlot'
import {implicitCalculus,pointOnRelation,scalar,chainRuleTex,prettyNumber as num} from '../shared/implicitCalculus'
import {cartesianLayout,PLOT_CONFIG} from '../shared/plotDefaults'
import './Lessons.css'
const EXAMPLES=[
  {name:'Circle',latex:'x^2+y^2=25',ascii:'x^2+y^2=25',x:'3',y:'4'},
  {name:'Product',latex:'xy=6',ascii:'x*y=6',x:'2',y:'3'},
  {name:'Mixed powers',latex:'x^3+y^3=6xy',ascii:'x^3+y^3=6*x*y',x:'3',y:'3'},
]
const equation=tex=><div className="lesson-equation"><TeX math={tex}/></div>
export default function ImplicitDifferentiation({ initial = {} }){
  const [expr,setExpr]=useState(initial.expr ?? EXAMPLES[0])
  const [xText,setX]=useState(initial.x ?? '3'),[yText,setY]=useState(initial.y ?? '4')
  const result=useMemo(()=>{try{return {details:implicitCalculus(expr.ascii)}}catch(err){return {error:err.message}}},[expr.ascii])
  const d=result.details,x=scalar(xText),y=scalar(yText)
  const point=d?pointOnRelation(d,x,y):null
  const graphBounds=mergeBounds([expressionBounds(expr.ascii),point?.valid?paddedBounds([[x,y]]):null])
  const view=usePlotView(8,0,0,{key:`${expr.ascii}|${xText}|${yText}`,bounds:graphBounds})
  const traces=useMemo(()=>{
    if(!d)return []
    return buildImplicitTrace(expr.ascii,view.xMin,view.xMax,view.yMin,view.yMax,'#2d70b3')||[]
  },[d,expr.ascii,view.xMin,view.xMax,view.yMin,view.yMax])
  const plotData=[...traces]
  if(point?.valid){
    plotData.push({x:[x],y:[y],type:'scatter',mode:'markers',marker:{color:'#7c3aed',size:10},name:'Point'})
    if(point.kind==='regular')plotData.push({x:[view.xMin,view.xMax],y:[y+point.slope*(view.xMin-x),y+point.slope*(view.xMax-x)],type:'scatter',mode:'lines',line:{color:'#dc2626',width:2,dash:'dash'},name:'Tangent'})
    if(point.kind==='vertical')plotData.push({x:[x,x],y:[view.yMin,view.yMax],type:'scatter',mode:'lines',line:{color:'#dc2626',width:2,dash:'dash'},name:'Vertical tangent'})
  }
  const layout=cartesianLayout({...view,showLegend:true})
  layout.xaxis.constrain='domain';layout.yaxis={...layout.yaxis,scaleanchor:'x',scaleratio:1,constrain:'domain'}
  layout.legend={...layout.legend,x:0,xanchor:'left',y:1,yanchor:'top'}
  const steps=d?[
    {title:'Treat y as a function of x',content:<><p>Differentiate both sides with respect to x. Each derivative of y needs a dy/dx factor from the chain rule; constants differentiate to zero.</p>{equation(`${d.left.toTex()}=${d.right.toTex()}`)}{equation(String.raw`\frac{d}{dx}(y^2)=2y\frac{dy}{dx},\qquad \frac{d}{dx}(xy)=y+x\frac{dy}{dx}`)}</>},
    {title:'Use the chain rule and product rule',content:<>{equation(`${chainRuleTex(d.lx,d.ly)}=${chainRuleTex(d.rx,d.ry)}`)}<p>Differentiate each side first. Do not treat y as a constant.</p></>},
    {title:'Collect the dy/dx terms',content:<>{equation(String.raw`\left(${d.fy.toTex()}\right)\frac{dy}{dx}=-\left(${d.fx.toTex()}\right)`)}<p>Move all terms containing dy/dx to one side, and the other terms to the opposite side.</p></>},
    {title:'Solve for the derivative',content:d.slope?<>{equation(String.raw`\frac{dy}{dx}=${d.slope.toTex()}`)}<p>This formula applies where its denominator is nonzero. It can describe more than one branch of the curve.</p></>:<p>The equation does not determine a finite dy/dx. Check for a vertical line or a degenerate relation.</p>},
    {title:'Evaluate at your point',content:!point?.valid?<p role="status">{point?.message}</p>:point.kind==='regular'?<>{equation(String.raw`\left.\frac{dy}{dx}\right|_{(${num(x)},${num(y)})}=${num(point.slope)}`)}{equation(`y-${num(y)}=(${num(point.slope)})(x-${num(x)})`)}<p>The dashed line is the tangent at this point.</p></>:point.kind==='vertical'?<p>The tangent is vertical: x = {num(x)}. The curve exists here, but its slope dy/dx is not finite.</p>:<p>Both partial derivatives vanish here. This first-derivative formula cannot decide the tangent; examine the curve more closely.</p>},
  ]:[]
  return <div className="viz-layout"><div className="viz-panel">
    <div className="viz-header"><span className="viz-title">Implicit Differentiation</span></div>
    <div className="viz-section"><label className="viz-field-label">Equation in x and y</label><MathInput equationMode="relation" value={expr.latex} onInput={(latex,ascii)=>setExpr({latex,ascii})} autoFocus/></div>
    <div className="viz-section"><label className="viz-field-label">Examples</label><div className="viz-chips">{EXAMPLES.map(ex=><button className="viz-chip" key={ex.name} onClick={()=>{setExpr(ex);setX(ex.x);setY(ex.y)}}>{ex.name}</button>)}</div></div>
    <div className="viz-section"><label className="viz-field-label">Point x</label><input className="viz-num-input" aria-label="Point x" value={xText} onChange={e=>setX(e.target.value)}/><label className="viz-field-label">Point y</label><input className="viz-num-input" aria-label="Point y" value={yText} onChange={e=>setY(e.target.value)}/><span className="viz-hint">Expressions such as sqrt(21) are accepted.</span></div>
    <div className="lesson-message">{point?.valid?(point.kind==='regular'?`Slope at this point: ${num(point.slope)}`:point.kind==='vertical'?'Vertical tangent':'Singular point'):point?.message||'Enter an equation to begin.'}</div>
  </div><div className="lesson-main">
    <div className="lesson-graph" onWheel={view.handleWheel}><Plot data={plotData} layout={layout} config={PLOT_CONFIG} onRelayout={view.handleRelayout} useResizeHandler style={{width:'100%',height:'100%'}}/><ZoomControls onZoomIn={view.zoomIn} onZoomOut={view.zoomOut} onReset={view.resetView}/></div>
    {result.error?<div className="lesson-message" role="status">{result.error}</div>:<LessonSteps steps={steps}/>}
  </div></div>
}
