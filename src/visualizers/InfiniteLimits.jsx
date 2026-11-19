import {useMemo,useState} from 'react'
import * as math from 'mathjs'
import BoundInput from '../components/BoundInput'
import MathInput from '../components/MathInput'
import Plot from '../components/ThemedPlot'
import VizSlider from '../components/VizSlider'
import ZoomControls from '../components/ZoomControls'
import usePlotView from '../shared/usePlotView'
import {functionBounds} from '../shared/graphFit'
import {makeEval,sampleFunction} from '../shared/numerics'
import {cartesianLayout,PLOT_CONFIG} from '../shared/plotDefaults'
import {formatBound} from '../shared/infinity'
const number=value=>Number.isFinite(value)?Number(value.toPrecision(7)).toString():'undefined / out of range'
export default function InfiniteLimits({target,onTarget,entries,onEntries}) {
 const [power,setPower]=useState(1)
 const direction=target===Infinity?1:-1,probe=direction*10**power
 const functions=useMemo(()=>entries.flatMap(entry=>{
  try {return entry.expr.trim()&&!entry.expr.includes('=')?[{...entry,f:makeEval(math.compile(entry.expr))}]:[]}catch{return []}
 }),[entries])
 const low=Math.min(probe*.5,probe*1.25),high=Math.max(probe*.5,probe*1.25)
 const bounds=functionBounds(functions.map(entry=>entry.f),low,high)
 const view=usePlotView(10,probe,0,{key:`${target}|${power}|${entries.map(e=>e.expr).join('|')}`,bounds})
 const traces=functions.flatMap((entry,i)=>{
  const curve=sampleFunction(entry.f,view.xMin,view.xMax,2000,view.yMax-view.yMin),y=entry.f(probe)
  return [{x:curve.xs,y:curve.ys,type:'scatter',mode:'lines',line:{color:entry.color||['#2d70b3','#dc2626','#388c46'][i%3],width:3},name:entry.expr,connectgaps:false},...(Number.isFinite(y)?[{x:[probe],y:[y],type:'scatter',mode:'markers',marker:{size:10,color:'#7c3aed'},showlegend:false}]:[])]
 })
 return <div className="viz-layout"><div className="viz-panel">
  <div className="viz-header"><span className="viz-title">lim x →</span><BoundInput aria-label="Limit target" className="viz-num-input limit-target-input" value={target} onChange={onTarget}/></div>
  <div className="viz-section viz-hint">Infinity is a direction, not a point to substitute. Move the magnitude slider to inspect larger {direction>0?'positive':'negative'} inputs. Table values suggest behavior; they do not prove a limit exists.</div>
  {entries.map(entry=><div className="viz-section" key={entry.id}><MathInput value={entry.latex} onInput={(latex,ascii)=>onEntries(prev=>prev.map(e=>e.id===entry.id?{...e,latex,expr:ascii}:e))}/></div>)}
  <div className="viz-section"><button className="viz-btn" onClick={()=>onEntries(prev=>[...prev,{id:crypto.randomUUID(),expr:'',latex:''}])}>Add function</button></div>
  {functions.map(entry=><div className="viz-section" key={entry.id}><strong className="viz-title">f(x) = {entry.expr}</strong><table className="limit-table"><thead><tr><th>x → {formatBound(target)}</th><th>f(x)</th></tr></thead><tbody>{[1,2,3,4,6,8,12].map(k=>{const x=direction*10**k;return <tr key={k}><td>{number(x)}</td><td>{number(entry.f(x))}</td></tr>})}</tbody></table></div>)}
 </div><div className="viz-main"><div className="viz-graph" onWheel={view.handleWheel}><Plot data={traces} layout={cartesianLayout({...view,xTitle:'x',yTitle:'f(x)'})} config={PLOT_CONFIG} onRelayout={view.handleRelayout} useResizeHandler style={{width:'100%',height:'100%'}}/><ZoomControls onZoomIn={view.zoomIn} onZoomOut={view.zoomOut} onReset={view.resetView}/></div><VizSlider label={<>Explore x = <strong>{number(probe)}</strong></>} min={0} max={12} step={.1} value={power} onChange={setPower} leftLabel="|x| = 1" rightLabel="|x| = 10¹²"/></div></div>
}
