import { integralDetailWindow } from '../shared/adaptiveIntegral'
import BoundInput from '../components/BoundInput'
import { integrateExtended,previewBounds,formatBound,texBound } from '../shared/infinity'
import { functionBounds } from '../shared/graphFit'
import { ContactToggle } from '../components/ContactPoints'
import { contactPoints, contactTrace } from '../shared/contactPoints'
import InfiniteSlices from '../components/InfiniteSlices'
import { useState, useMemo } from 'react'
import Plot from '../components/ThemedPlot'
import * as math from 'mathjs'
import TeX from '../components/TeX'
import MathInput from '../components/MathInput'
import ZoomControls from '../components/ZoomControls'
import VizSlider from '../components/VizSlider'
import usePlotView from '../shared/usePlotView'
import { sampleFunction, makeEval, fmtNum } from '../shared/numerics'
import { cartesianLayout, PLOT_CONFIG } from '../shared/plotDefaults'

// Compute the Riemann sum for n rectangles with a given rule.
// math.js sin/tan/etc. are in RADIANS — we evaluate directly and never
// convert, so the curve and rectangles are both in radians.
function riemannSum(f, a, b, n, rule) {
  const dx = (b - a) / n
  let sum = 0
  for (let i = 0; i < n; i++) {
    if (rule === 'trapezoid') {
      // Trapezoid: average of left and right heights
      const yL = f(a + i * dx)
      const yR = f(a + (i + 1) * dx)
      if (!Number.isFinite(yL) || !Number.isFinite(yR)) return NaN
      sum += ((yL + yR) / 2) * dx
      continue
    }
    let sampleX
    if (rule === 'left') sampleX = a + i * dx
    else if (rule === 'right') sampleX = a + (i + 1) * dx
    else sampleX = a + (i + 0.5) * dx // midpoint
    const y = f(sampleX)
    if (!Number.isFinite(y)) return NaN
    sum += y * dx
  }
  return sum
}

const RULES = [
  { key: 'left',      label: 'Left' },
  { key: 'right',     label: 'Right' },
  { key: 'midpoint',  label: 'Midpoint' },
  { key: 'trapezoid', label: 'Trapezoid' },
]

export default function Riemann({ initial = {} }) {
  const [highlightContacts, setHighlightContacts] = useState(false)
  const [infiniteSlices, setInfiniteSlices] = useState(false)
  const [expr, setExpr] = useState(initial.expr ?? { latex: '', ascii: '' })
  const [a, setA] = useState(initial.a ?? 0)        // left bound
  const [b, setB] = useState(initial.b ?? 5)        // right bound
  const [n, setN] = useState(initial.n ?? 5)        // number of rectangles
  const [rule, setRule] = useState(initial.rule ?? 'left')

  const [showWholeInterval,setShowWholeInterval]=useState(false)
  const f=useMemo(()=>{
    try{return expr.ascii.trim()?makeEval(math.compile(expr.ascii)):null}catch{return null}
  },[expr.ascii])
  const integral=useMemo(()=>f?integrateExtended(f,a,b):null,[f,a,b])
  const detail=useMemo(()=>integral?.converged&&Number.isFinite(a)&&Number.isFinite(b)?integralDetailWindow(integral.samples,a,b):null,[integral,a,b])
  const unbounded=!Number.isFinite(a)||!Number.isFinite(b)
  const continuous=infiniteSlices||unbounded
  const [previewA,previewB]=previewBounds(a,b)
  const focused=!!detail&&continuous&&!showWholeInterval

  // Center the view on the midpoint of [a, b], y on the function there
  const midX = (previewA + previewB) / 2
  let yCenter = 0
  if (f) {
    const y = f(midX)
    if (Number.isFinite(y)) yCenter = y
  }

  const displayA=focused?detail.a:previewA,displayB=focused?detail.b:previewB
  const graphBounds = functionBounds([f], displayA, displayB, { includeZero: true,
    points:integral?.samples.filter(([x,y])=>Number.isFinite(y)&&x>=Math.min(displayA,displayB)&&x<=Math.max(displayA,displayB))||[] })
  const view = usePlotView(10, midX, yCenter, { key: `${expr.ascii}|${a}|${b}|${focused}`, bounds: graphBounds })
  const { xMin, xMax, yMin, yMax } = view

  // ── Build traces and shapes ──
  const traces = []
  const shapes = []

  if (f) {
    // The function curve — 3500 points across the FULL axis range, linear
    // interpolation (no spline) so it lines up with the rectangles.
    const uniform = sampleFunction(f, xMin, xMax, 3500, yMax - yMin)
    // Include the integrator's resolved samples so narrow peaks are retained.
    const points=[...uniform.xs.map((x,i)=>[x,uniform.ys[i]]),...(integral?.samples||[]).filter(([x])=>x>=xMin&&x<=xMax)].sort((p,q)=>p[0]-q[0])
    const curve={xs:points.map(p=>p[0]),ys:points.map(p=>p[1])}
    traces.push({
      x: curve.xs, y: curve.ys,
      type: 'scatter', mode: 'lines',
      name: expr.ascii,
      line: { color: '#2d70b3', width: 3 },
      connectgaps: false,
    })

    if (continuous) {
      const left=Math.max(Math.min(a,b),xMin),right=Math.min(Math.max(a,b),xMax)
      const uniformArea=left<right?sampleFunction(f,left,right,1200,yMax-yMin):{xs:[],ys:[]}
      const areaPoints=[...uniformArea.xs.map((x,i)=>[x,uniformArea.ys[i]]),...(integral?.samples||[]).filter(([x])=>x>=left&&x<=right)].sort((p,q)=>p[0]-q[0])
      const area={xs:areaPoints.map(p=>p[0]),ys:areaPoints.map(p=>p[1])}
      traces.push({ x: area.xs, y: area.ys, type: 'scatter', mode: 'lines',
        fill: 'tozeroy', fillcolor: 'rgba(59,130,246,0.2)',
        line: { color: '#3b82f6', width: 0 }, showlegend: false, connectgaps: false })
    }
    // Draw the rectangles / trapezoids
    const dx = (b - a) / n
    for (let i = 0; !continuous && i < n; i++) {
      const x0 = a + i * dx
      const x1 = a + (i + 1) * dx

      if (rule === 'trapezoid') {
        // Trapezoid: draw a filled quad from (x0,0) to (x0,yL) to (x1,yR) to (x1,0)
        const yL = f(x0)
        const yR = f(x1)
        if (Number.isFinite(yL) && Number.isFinite(yR)) {
          traces.push({
            x: [x0, x0, x1, x1, x0],
            y: [0, yL, yR, 0, 0],
            type: 'scatter', mode: 'lines',
            fill: 'toself',
            fillcolor: 'rgba(59, 130, 246, 0.15)',
            line: { color: 'rgba(59, 130, 246, 0.5)', width: 1 },
            showlegend: false,
            hoverinfo: 'skip',
          })
        }
      } else {
        // Rectangle: sample at the appropriate x for this rule
        let sampleX
        if (rule === 'left') sampleX = x0
        else if (rule === 'right') sampleX = x1
        else sampleX = (x0 + x1) / 2  // midpoint

        const h = f(sampleX)
        if (Number.isFinite(h)) {
          shapes.push({
            type: 'rect',
            x0, x1,
            y0: 0, y1: h,
            fillcolor: 'rgba(59, 130, 246, 0.15)',
            line: { color: 'rgba(59, 130, 246, 0.5)', width: 1 },
          })
        }
      }
    }
  }

  if (f && highlightContacts && !continuous) traces.push(contactTrace(contactPoints(f, a, b, n, rule)))

  // Vertical dashed lines at a and b
  if(!unbounded)shapes.push(
    { type: 'line', x0: a, x1: a, y0: 0, y1: 1, yref: 'paper', line: { color: '#94a3b8', width: 1, dash: 'dash' } },
    { type: 'line', x0: b, x1: b, y0: 0, y1: 1, yref: 'paper', line: { color: '#94a3b8', width: 1, dash: 'dash' } },
  )

  // Compute the Riemann sum and true integral
  let sumValue = NaN
  let trueValue = NaN
  if (f) {
    sumValue = continuous ? integral.value : riemannSum(f, a, b, n, rule)
    trueValue = integral.value
  }

  return (
    <div className="viz-layout">
      {/* ── Left panel ── */}
      <div className="viz-panel">
        <div className="viz-header">
          <span className="viz-title">Riemann Sums & Improper Integrals</span>
        </div>

        {/* Function input */}
        <div className="viz-section">
          <label className="viz-field-label">f(x)</label>
          <MathInput value={expr.latex}
            onInput={(latex, ascii, functionLatex) => setExpr({ latex, ascii, functionLatex })}
            autoFocus
          />
        </div>

        {/* Interval [a, b] */}
        <div className="viz-section viz-row">
          <div className="viz-field">
            <label className="viz-field-label">a</label>
            <BoundInput
              
              className="viz-num-input"
              aria-label="Interval start a" value={a}
              onChange={setA}
              step="any"
            />
          </div>
          <div className="viz-field">
            <label className="viz-field-label">b</label>
            <BoundInput
              
              className="viz-num-input"
              aria-label="Interval end b" value={b}
              onChange={setB}
              step="any"
            />
          </div>
        </div>

        {unbounded&&<div className="viz-section viz-hint">Unbounded interval: {formatBound(a)} to {formatBound(b)}. The graph shows a finite preview; the calculation checks the infinite tails. Finite rectangles are unavailable over an infinite width.</div>}
        {/* Rule selector */}
        <div className="viz-section">
          <label className="viz-field-label">Rule</label>
          <div className="viz-btn-grid">
            {RULES.map(r => (
              <button
                key={r.key}
                disabled={unbounded}
                className={`viz-btn ${rule === r.key ? 'active' : ''}`}
                onClick={() => setRule(r.key)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {f&&integral&&!integral.converged&&<div className="viz-section viz-warn" role="status">{integral.message||'Could not resolve this integral reliably. Check for singularities or rapid oscillations, or use a smaller interval.'}</div>}
        {f&&detail&&<div className="viz-section"><p className="viz-hint">{focused?'Showing the narrow, non-flat part of the curve. The integral still uses the full bounds above.':'This interval is much wider than the visible feature; the curve is compressed at this scale.'}</p><button className="viz-btn" onClick={()=>{setInfiniteSlices(true);setShowWholeInterval(focused)}}>{focused?(unbounded?'Show preview window':'Show whole interval'):'Focus on curve'}</button></div>}
        {/* Results */}
        {f && (
          <div className="viz-results">
            <div className="viz-formula">
              <TeX display math={unbounded?`\\int_{${texBound(a)}}^{${texBound(b)}}f(x)\\,dx \\approx ${Number.isFinite(sumValue)?fmtNum(sumValue):'\\text{not resolved}'}`:`${continuous ? '\\lim_{n \\to \\infty}' : ''}\\sum_{i=1}^{${continuous ? 'n' : n}} f(x_i^{*}) \\, \\Delta x = ${Number.isFinite(sumValue) ? fmtNum(sumValue) : '\\text{—}'}`} />
            </div>
            <div className="viz-result-row">
              <span className="viz-result-label">{continuous ? 'Limit integral (numerical)' : 'Riemann Sum'}</span>
              <span className="viz-result-value">{fmtNum(sumValue)}</span>
            </div>
            <div className="viz-result-row">
              <span className="viz-result-label">Integral estimate</span>
              <span className="viz-result-value good">{fmtNum(trueValue)}</span>
            </div>
            <div className="viz-result-row">
              <span className="viz-result-label">{continuous ? 'Estimated integration error' : 'Difference from estimate'}</span>
              <span className="viz-result-value bad">
                {continuous ? (Number.isFinite(integral.error)?integral.error.toExponential(2):'—') : Number.isFinite(sumValue) && Number.isFinite(trueValue)
                  ? fmtNum(Math.abs(sumValue - trueValue))
                  : '—'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Right side: graph + slider ── */}
      <div className="viz-main">
        <div className="viz-graph" onWheel={view.handleWheel}>
          <Plot
            data={traces}
            layout={cartesianLayout({ xMin, xMax, yMin, yMax, shapes })}
            config={PLOT_CONFIG}
            onRelayout={view.handleRelayout}
            useResizeHandler
            style={{ width: '100%', height: '100%' }}
          />
          <ZoomControls onZoomIn={view.zoomIn} onZoomOut={view.zoomOut} onReset={view.resetView} />
        </div>

        <InfiniteSlices checked={continuous} disabled={unbounded} onChange={value=>{if(!unbounded)setInfiniteSlices(value)}} />
        <ContactToggle checked={highlightContacts} onChange={setHighlightContacts} disabled={continuous} />
        {/* Slider for n (number of rectangles) */}
        <VizSlider
          label={<>n = <strong>{continuous ? '∞' : n}</strong></>}
          min={1} max={200} step={1} value={n}
          onChange={setN} disabled={continuous}
        />
      </div>
    </div>
  )
}
