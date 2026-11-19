import {useMemo,useState,useRef} from 'react'
import WaterTank from '../components/WaterTank'
import { WATER_TANKS, tankVolume } from '../shared/waterTanks'
import MathInput from '../components/MathInput'
import TeX from '../components/TeX'
import LessonSteps from '../components/LessonSteps'
import {implicitCalculus,scalar,solveRelatedRate,prettyNumber as num} from '../shared/implicitCalculus'
import './Lessons.css'
const EXAMPLES=[
  {id:'ladder',name:'Sliding ladder',setup:'A 13 m ladder leans against a wall. Its foot moves away at 2 m/s. How fast does the top move when the foot is 5 m from the wall?',latex:'x^2+y^2=169',ascii:'x^2+y^2=169',x:'5',y:'12',known:'x',rate:'2',xMeaning:'distance of the foot from the wall',yMeaning:'height of the top on the wall',xUnit:'m',yUnit:'m'},
  {id:'circle',name:'Expanding circle',setup:'A circle’s radius increases at 2 m/s. Find the area’s rate of change when the radius is 3 m.',latex:'y=\\pi x^2',ascii:'y=pi*x^2',x:'3',y:'9*pi',known:'x',rate:'2',xMeaning:'radius',yMeaning:'area',xUnit:'m',yUnit:'m²'},
  {id:'sphere',name:'Inflating balloon',setup:'A spherical balloon gains volume at 12 m³/s. Find the radius’s rate of change when the radius is 3 m.',latex:'y=\\frac{4}{3}\\pi x^3',ascii:'y=4/3*pi*x^3',x:'3',y:'36*pi',known:'y',rate:'12',xMeaning:'radius',yMeaning:'volume',xUnit:'m',yUnit:'m³'},
  {id:'cone',name:'Inverted cone filling with water',setup:'An inverted cone is 6 m tall with a top radius of 3 m. Water flows in at π m³/s. How fast does the depth rise when it is 2 m? Here x is water depth h and y is water volume V.',latex:'y=\\frac{\\pi x^3}{12}',ascii:'y=pi*x^3/12',x:'2',y:'2*pi/3',known:'y',rate:'pi',xMeaning:'water depth h',yMeaning:'water volume V',xUnit:'m',yUnit:'m³'},
  {id:'cube',name:'Cube filling with water',setup:'An open-top cubic tank has side length 4 m. Water flows in at 8 m³/s. How fast does the depth rise when it is 2 m? Here x is water depth h and y is water volume V.',latex:'y=16x',ascii:'y=16*x',x:'2',y:'32',known:'y',rate:'8',xMeaning:'water depth h',yMeaning:'water volume V',xUnit:'m',yUnit:'m³'},
  {id:'custom',name:'Custom relation',setup:'Enter your own equation in x and y, give a point on the relation, and choose the known rate. All rates use the same time variable t.',latex:'x^2+y^2=25',ascii:'x^2+y^2=25',x:'3',y:'4',known:'x',rate:'2',xMeaning:'first quantity',yMeaning:'second quantity',xUnit:'units',yUnit:'units'},
]
const equation=tex=><div className="lesson-equation"><TeX math={tex}/></div>
function RateDiagram({example,x,y}) {
  if(example.id==='custom'||![x,y].every(Number.isFinite)||x<0||y<0)return null
  if(example.id==='ladder') {
    const scale=145/Math.max(13,x,y),foot=95+x*scale,top=190-y*scale
    return <svg className="rate-diagram" viewBox="0 0 480 230" aria-label="Ladder diagram showing horizontal distance and vertical height" role="img">
      <path d="M95 20 V190 H390" fill="none" stroke="var(--app-muted)" strokeWidth="2"/>
      <path d={`M${foot} 190 L95 ${top}`} stroke="var(--curve1)" strokeWidth="6"/>
      <path d="M95 176 H109 V190" fill="none" stroke="var(--app-muted)"/>
      <text x={(95+foot)/2} y="215" textAnchor="middle">x = {num(x)} m</text>
      <text x="22" y={(190+top)/2}>y = {num(y)} m</text>
      <text x={(95+foot)/2+12} y={(190+top)/2}>13 m</text>
      <text x="310" y="80">x² + y² = 13²</text>
    </svg>
  }
  return <svg className="rate-diagram" viewBox="0 0 480 230" aria-label={`${example.id==='sphere'?'Balloon':'Circle'} radius and ${example.yMeaning}`} role="img">
    <circle cx="170" cy="108" r="76" fill="none" stroke="var(--curve1)" strokeWidth="3"/>
    {example.id==='sphere'&&<ellipse cx="170" cy="108" rx="76" ry="21" fill="none" stroke="var(--curve1)" strokeDasharray="5 4"/>}
    <path d="M170 108 H246" stroke="var(--curve2)" strokeWidth="2"/>
    <text x="206" y="98" textAnchor="middle">x = {num(x)} m</text>
    <text x="275" y="108">{example.yMeaning} = {num(y)} {example.yUnit}</text>
    <text x="170" y="214" textAnchor="middle">Both quantities change with time.</text>
  </svg>
}
export default function RelatedRates({ initial = {} }){
  const lessonRef=useRef(null)
  const startingExample = EXAMPLES.find(ex => ex.id === initial.example) ?? EXAMPLES[0]
  const [example,setExample]=useState(startingExample)
  const [expr,setExpr]=useState(startingExample)
  const [xText,setX]=useState(startingExample.x),[yText,setY]=useState(startingExample.y)
  const [known,setKnown]=useState(startingExample.known),[rateText,setRate]=useState(startingExample.rate)
  const result=useMemo(()=>{try{return {details:implicitCalculus(expr.ascii)}}catch(err){return {error:err.message}}},[expr.ascii])
  const d=result.details,x=scalar(xText),y=scalar(yText),rate=scalar(rateText)
  const solved=d?solveRelatedRate(d,x,y,known,rate):null
  const tank=WATER_TANKS[example.id]
  const physical=example.id==='custom'||(x>=0&&y>=0&&(!tank||(x<=tank.height&&y<=tankVolume(example.id,tank.height)+1e-8)))
  const physicalMessage=tank?`Water depth must be between 0 and ${tank.height} m, and volume must stay within the tank’s capacity.`:'Lengths, areas, and volumes in this example must be nonnegative.'
  const unknown=known==='x'?'y':'x',unit=unknown==='y'?example.yUnit:example.xUnit
  const rateTex=variable=>String.raw`\frac{d${variable}}{dt}`
  function selectExample(id){lessonRef.current?.scrollTo({top:0});const ex=EXAMPLES.find(e=>e.id===id);setExample(ex);setExpr(ex);setX(ex.x);setY(ex.y);setKnown(ex.known);setRate(ex.rate)}
  const valid=solved?.valid&&physical
  const steps=d?[
    {title:'Name the changing quantities and write a relation',content:<><p>x is {example.xMeaning}; y is {example.yMeaning}. Use the equation for every instant, before substituting the point’s values.</p>{equation(`${d.left.toTex()}=${d.right.toTex()}`)}<p>{example.id==='cone'?'Similar triangles give r/h=3/6, so r=h/2. Substitute this into V=πr²h/3 before differentiating.':example.id==='cube'?'The tank does not grow as it fills. Its fixed base is 4 m × 4 m, so V=16h, not h³.':'A fixed ladder length or a fixed geometric constant does not change with time.'}</p></>},
    {title:'Differentiate with respect to time',content:<><p>Both x and y depend on t. Apply the chain rule to both terms.</p>{equation(String.raw`\left(${d.fx.toTex()}\right)${rateTex('x')}+\left(${d.fy.toTex()}\right)${rateTex('y')}=0`)}<p>Do not substitute x and y first: doing so would turn the relation into a constant equation and lose the rates.</p></>},
    {title:`Isolate d${unknown}/dt`,content:<>{equation(`${rateTex(unknown)}=-\\frac{${(known==='x'?d.fx:d.fy).toTex()}}{${(known==='x'?d.fy:d.fx).toTex()}}${rateTex(known)}`)}<p>You can divide only where the displayed denominator is nonzero.</p></>},
    {title:'Substitute the values at this instant',content:valid?<>{equation(`(${num(solved.fx)})${known==='x'?`(${num(rate)})`:rateTex('x')}+(${num(solved.fy)})${known==='y'?`(${num(rate)})`:rateTex('y')}=0`)}{equation(`${rateTex(unknown)}=${num(solved.unknown)}`)}</>:<p role="status">{!physical?physicalMessage:solved?.message}</p>},
    {title:'Interpret the sign and include units',content:valid?<><p><strong>d{unknown}/dt = {num(solved.unknown)} {unit}/s.</strong></p><p>{unknown==='y'?example.yMeaning:example.xMeaning} is {solved.unknown>0?'increasing':solved.unknown<0?'decreasing':'unchanged at this instant'}.{example.id==='ladder'&&unknown==='y'&&solved.unknown<0?' The ladder’s top moves downward.':''}</p></>:<p>Check the point, the known rate, and whether the unknown rate is determined before interpreting a numerical answer.</p>},
  ]:[]
  return <div className="viz-layout"><div className="viz-panel">
    <div className="viz-header"><span className="viz-title">Related Rates</span></div>
    <div className="viz-section"><label className="viz-field-label">Problem</label><select className="lesson-select" aria-label="Related rates example" value={example.id} onChange={e=>selectExample(e.target.value)}>{EXAMPLES.map(ex=><option key={ex.id} value={ex.id}>{ex.name}</option>)}</select><p className="viz-hint">{example.setup}</p></div>
    <div className="viz-section"><label className="viz-field-label">Equation in x and y</label><span className="lesson-equation">{tank?<TeX math={example.latex}/>:<MathInput equationMode="relation" value={expr.latex} onInput={(latex,ascii)=>setExpr({latex,ascii})}/>}</span><span className="viz-hint">x = {example.xMeaning}; y = {example.yMeaning}.</span></div>
    <div className="viz-section"><label className="viz-field-label">x at this instant ({example.xUnit})</label><input aria-label="Instant x" className="viz-num-input" value={xText} onChange={e=>setX(e.target.value)}/><label className="viz-field-label">y at this instant ({example.yUnit})</label><input aria-label="Instant y" className="viz-num-input" value={yText} onChange={e=>setY(e.target.value)}/><span className="viz-hint">Use pi, sqrt(…), or a decimal.</span></div>
    <div className="viz-section"><label className="viz-field-label">Known rate</label><select aria-label="Known rate" className="lesson-select" value={known} onChange={e=>setKnown(e.target.value)}><option value="x">dx/dt ({example.xUnit}/s)</option><option value="y">dy/dt ({example.yUnit}/s)</option></select><input aria-label="Known rate value" className="viz-num-input" value={rateText} onChange={e=>setRate(e.target.value)}/><span className="viz-hint">Positive means increasing; negative means decreasing.</span></div>
    <div className="lesson-message" role="status">{valid?`d${unknown}/dt = ${num(solved.unknown)} ${unit}/s`:!physical?physicalMessage:solved?.message||result.error}</div>
  </div><div className="lesson-main" ref={lessonRef}>
    {tank?<WaterTank key={example.id} id={example.id} height={x} volume={y} known={known} rate={rate} valid={physical&&Number.isFinite(rate)&&Number.isFinite(x)&&Number.isFinite(y)&&Math.abs(y-tankVolume(example.id,x))<1e-6*Math.max(1,Math.abs(y))} onChange={(h,v)=>{setX(String(h));setY(String(v))}}/>:<RateDiagram example={example} x={x} y={y}/>}
    {result.error?<div className="lesson-message" role="status">{result.error}</div>:<LessonSteps steps={steps}/>}
  </div></div>
}
