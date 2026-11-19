import { functionBounds } from '../shared/graphFit'
import Plot from './ThemedPlot'
import ZoomControls from './ZoomControls'
import { useAppearance } from '../shared/appearance'
import usePlotView from '../shared/usePlotView'
import { sampleFunction } from '../shared/numerics'
import { cartesianLayout, PLOT_CONFIG } from '../shared/plotDefaults'
import { contactPoints } from '../shared/contactPoints'

export default function RevolutionProfile({ hasCurve, d1, d2, hasSecond, a, b, funcOf, axisOrient, c, isSurface, sliceCount, ringCount, infiniteSlices, highlightContacts, showSlice, repT }) {
  const { settings } = useAppearance()
  const middle = (a+b)/2
  const value = hasCurve ? d1(middle) : 0
  const height = Number.isFinite(value) ? value/2 : 0
  const center = funcOf === 'y' ? [height,middle] : [middle,height]
  const initialZoom = Math.max(4, Math.abs(b-a)*.8, Math.abs(height)*1.5)
  const sourceBounds = hasCurve ? functionBounds([d1,...(!isSurface && hasSecond ? [d2] : [])],a,b,{includeZero:!isSurface}) : null
  const graphBounds = sourceBounds && (funcOf === 'y' ? {xMin:sourceBounds.yMin,xMax:sourceBounds.yMax,yMin:sourceBounds.xMin,yMax:sourceBounds.xMax} : sourceBounds)
  if(graphBounds) { if(axisOrient==='h'){graphBounds.yMin=Math.min(graphBounds.yMin,c);graphBounds.yMax=Math.max(graphBounds.yMax,c)}else{graphBounds.xMin=Math.min(graphBounds.xMin,c);graphBounds.xMax=Math.max(graphBounds.xMax,c)} }
  const view = usePlotView(initialZoom, ...center, { key: `${a}|${b}|${funcOf}|${axisOrient}|${c}|${JSON.stringify(graphBounds)}`, bounds: graphBounds })
  const point = (t,v) => funcOf === 'y' ? [v,t] : [t,v]
  const {xMin,xMax,yMin,yMax}=view
  const traces=[], shapes=[]
  const rgba = (hex,alpha) => `rgba(${[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)).join(',')},${alpha})`
  if (hasCurve) {
    if (!isSurface) {
      const loop=[]
      for(let i=0;i<=250;i++) { const t=a+(b-a)*i/250; const v=d1(t); loop.push(Number.isFinite(v) ? point(t,v) : [null,null]) }
      for(let i=250;i>=0;i--) { const t=a+(b-a)*i/250; const v=d2(t); loop.push(Number.isFinite(v) ? point(t,v) : [null,null]) }
      if(loop.length)loop.push(loop[0])
      traces.push({type:'scatter',mode:'lines',x:loop.map(p=>p[0]),y:loop.map(p=>p[1]),fill:'toself',fillcolor:rgba(settings.regionColor,.18),line:{width:0},hoverinfo:'skip',showlegend:false,connectgaps:false})
    }
    const lo=funcOf==='y'?yMin:xMin, hi=funcOf==='y'?yMax:xMax
    for(const [fn,color,name] of [[d1,settings.curve1,'Curve 1'],...(!isSurface&&hasSecond?[[d2,settings.curve2,'Curve 2']]:[])]) {
      const sample=sampleFunction(fn,lo,hi,1800,Math.max(xMax-xMin,yMax-yMin))
      const points=sample.xs.map((t,i)=>point(t,sample.ys[i]))
      traces.push({type:'scatter',mode:'lines',x:points.map(p=>p[0]),y:points.map(p=>p[1]),line:{color,width:3},name,connectgaps:false})
    }
    const count=isSurface?ringCount:sliceCount
    if(!infiniteSlices && !isSurface)for(let i=0;i<count;i++) {
      const t=a+(i+.5)*(b-a)/count, u=d1(t), v=d2(t)
      if(!Number.isFinite(u)||!Number.isFinite(v))continue
      const p=point(t,u),q=point(t,v)
      shapes.push({type:'line',x0:p[0],y0:p[1],x1:q[0],y1:q[1],line:{color:rgba(settings.sliceColor,.45),width:1}})
    }
    if(!isSurface && showSlice && !infiniteSlices) {
      const u=d1(repT),v=d2(repT),p=point(repT,u),q=point(repT,v)
      if(Number.isFinite(u)&&Number.isFinite(v))traces.push({type:'scatter',mode:'lines',x:[p[0],q[0]],y:[p[1],q[1]],line:{color:settings.sliceColor,width:4},name:'Selected slice'})
    }
    if(highlightContacts&&!infiniteSlices) {
      const points=contactPoints(d1,a,b,count).map(([t,v])=>point(t,v))
      traces.push({type:'scatter',mode:'markers',x:points.map(p=>p[0]),y:points.map(p=>p[1]),marker:{color:settings.curve3,size:9,line:{color:settings.graphBackground,width:1}},name:'Touch points',hovertemplate:'(%{x:.5g}, %{y:.5g})<extra></extra>'})
    }
  }
  for(const t of [a,b]) {
    shapes.push(funcOf==='y'?{type:'line',y0:t,y1:t,x0:0,x1:1,xref:'paper',line:{color:settings.axisColor,width:1,dash:'dot'}}:{type:'line',x0:t,x1:t,y0:0,y1:1,yref:'paper',line:{color:settings.axisColor,width:1,dash:'dot'}})
  }
  traces.push(axisOrient==='h'
    ?{type:'scatter',mode:'lines',x:[xMin,xMax],y:[c,c],line:{color:settings.axisColor,width:2,dash:'dash'},name:`Axis: y = ${c}`}
    :{type:'scatter',mode:'lines',x:[c,c],y:[yMin,yMax],line:{color:settings.axisColor,width:2,dash:'dash'},name:`Axis: x = ${c}`})
  const layout=cartesianLayout({...view,shapes,showLegend:true})
  layout.legend={...layout.legend,x:0,xanchor:'left',y:1,yanchor:'top'}
  layout.xaxis.constrain='domain'
  layout.yaxis={...layout.yaxis,scaleanchor:'x',scaleratio:1,constrain:'domain'}
  return <div className="source-2d-wrap" onWheel={view.handleWheel} aria-label="2D source graph">
    <Plot preserveTraceColors data={traces} layout={layout} config={PLOT_CONFIG} onRelayout={view.handleRelayout} useResizeHandler style={{width:'100%',height:'100%'}} />
    <ZoomControls onZoomIn={view.zoomIn} onZoomOut={view.zoomOut} onReset={view.resetView} />
    <div className="scene-key-hint">{isSurface?'The curve revolves around the dashed axis.':'The shaded region revolves around the dashed axis.'}</div>
  </div>
}
