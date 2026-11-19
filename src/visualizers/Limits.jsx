import { detectHole } from '../shared/limitAnalysis'
import BoundInput from '../components/BoundInput'
import InfiniteLimits from './InfiniteLimits'
import { expressionBounds, mergeBounds } from '../shared/graphFit'
import { buildImplicitTrace } from '../shared/implicitPlot'
import { useAppearance } from '../shared/appearance'
import { graphColor } from '../shared/graphColors'
import { useState, useCallback, useMemo, useRef } from 'react'
import Plot from '../components/ThemedPlot'
import * as math from 'mathjs'
import MathInput from '../components/MathInput'
import LineColorPicker from '../components/LineColorPicker'
import ZoomControls from '../components/ZoomControls'
import usePlotView from '../shared/usePlotView'
import { sampleFunction, makeEval } from '../shared/numerics'
import { cartesianLayout, PLOT_CONFIG } from '../shared/plotDefaults'
import './Limits.css'

// Detect an implicit relation like "x^2+y^2=25" — i.e. a single '=' that is
// NOT part of a comparison operator (==, <=, >=, !=). A plain "y = x^2" never
// reaches here because mathExpr.js already strips a "name =" left-hand side.
function isImplicitEquation(expr) {
  return /(^|[^=<>!])=([^=]|$)/.test(expr)
}

// Palette for implicit curves (cycled by row index).
const IMPLICIT_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c', '#0891b2']

// Build a Plotly "constraint" contour trace that draws the curve where the
// equation holds. We move everything to one side: f(x,y) = LHS − RHS, sample it
// on a grid over the visible window, and ask Plotly to outline where f = 0.
// This works for circles, ellipses, hyperbolas, and any other implicit curve.
// Detect a removable discontinuity (a "hole") at x = target: f is undefined
// exactly at the target, yet the two-sided limit exists (left ≈ right). Returns
// the limit's y-value to mark the hole at, or null if there's no such hole.
// Try to evaluate f(limitTarget). If it's undefined (hole), approach from
// both sides to estimate the limit value for centering the view.
function estimateYAtTarget(f, target) {
  const y = f(target)
  if (Number.isFinite(y)) return y
  // Approach from both sides
  for (const d of [0.001, 0.0001, 0.00001]) {
    const yL = f(target - d)
    const yR = f(target + d)
    if (Number.isFinite(yL) && Number.isFinite(yR)) return (yL + yR) / 2
    if (Number.isFinite(yL)) return yL
    if (Number.isFinite(yR)) return yR
  }
  return 0
}

export default function Limits({ initial = {} }) {
  const { settings } = useAppearance()
  // The limit target — the value x is approaching (set in the left panel)
  const [targetValue, setLimitTarget] = useState(initial.target ?? 0)
  const limitTarget=Number.isFinite(targetValue)?targetValue:0
  // The traveling point — controlled by the slider, slides toward limitTarget
  const [sliderX, setSliderX] = useState(Number.isFinite(initial.target??0)?(initial.target??0)-10:-10)
  // How far left the slider extends from the limit target (always stored positive)
  const [sliderRange, setSliderRange] = useState(10)
  // Function expressions — latex is for display, expr is for math.js evaluation
  const [entries, setEntries] = useState(initial.entries ?? [{ id: 1, latex: '', expr: '' }])
  // Which holes the user has "filled" by clicking — set of entry ids. A filled
  // hole shows the solid limit-value point instead of the open circle.
  const entriesRef = useRef(null)
  const [focusedEntry, setFocusedEntry] = useState(null)
  const [filledHoles, setFilledHoles] = useState(new Set())

  // Compute the default y-center from the first valid expression
  let yCenter = 0
  for (const entry of entries) {
    if (!entry.expr.trim() || isImplicitEquation(entry.expr)) continue
    try {
      const f = makeEval(math.compile(entry.expr))
      yCenter = estimateYAtTarget(f, limitTarget)
      break
    } catch { /* try next */ }
  }

  // Shared zoom/pan view centered on the limit target
  const fitKey = `${limitTarget}|${entries.map(entry => entry.expr).join('|')}`
  const initialBounds = useMemo(() => mergeBounds(entries.filter(entry => entry.expr.trim()).map(entry => expressionBounds(entry.expr, limitTarget - 10, limitTarget + 10))), [entries, limitTarget])
  const view = usePlotView(10, limitTarget, yCenter, { key: fitKey, bounds: initialBounds })
  const { xMin, xMax, yMin, yMax } = view

  // Clicking a hole marker fills it in (and clicking again empties it). Each
  // hole trace carries its entry id in customdata so we know which to toggle.
  const handleClick = useCallback((data) => {
    if (!data || !data.points || !data.points.length) return
    const id = data.points[0].customdata
    if (id == null) return
    setFilledHoles(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // Clamp slider so it never overshoots the target
  const leftX = Math.min(sliderX, limitTarget)
  // Mirror on the right side of the target
  const rightX = Math.min(limitTarget + (limitTarget - leftX), xMax)
  // Has the slider reached the target?
  const atTarget = leftX >= limitTarget - 0.005

  // Called by MathInput when the user types — gives us both LaTeX and ascii-math
  function handleMathInput(id, latex, ascii) {
    setEntries(prev => prev.map(e => (e.id === id ? { ...e, latex, expr: ascii } : e)))
  }

  function addEntry() {
    const entry={id:crypto.randomUUID(),latex:'',expr:''}
    setEntries(prev=>[...prev,entry])
    setFocusedEntry(entry.id)
  }

  function deleteEntry(id) {
    const index=entries.findIndex(entry=>entry.id===id)
    const remaining=entries.filter(entry=>entry.id!==id)
    if(!remaining.length)remaining.push({id:crypto.randomUUID(),latex:'',expr:''})
    setEntries(remaining)
    const focusIndex=Math.max(0,Math.min(index-1,remaining.length-1))
    setFocusedEntry(remaining[focusIndex].id)
    requestAnimationFrame(()=>entriesRef.current?.querySelectorAll('math-field')[focusIndex]?.focus())
    setFilledHoles(prev=>{const next=new Set(prev);next.delete(id);return next})
  }

  // ── Build traces ──
  const traces = []
  const shapes = []
  const annotations = []

  entries.forEach((entry, idx) => {
    if (!entry.expr.trim()) return

    // Implicit relations (x^2+y^2=25, etc.) are drawn as a contour at LHS−RHS=0,
    // since they aren't functions of x and the limit machinery doesn't apply.
    if (isImplicitEquation(entry.expr)) {
      const color = entry.color ?? IMPLICIT_COLORS[idx % IMPLICIT_COLORS.length]
      const t = buildImplicitTrace(entry.expr, xMin, xMax, yMin, yMax, color)
      if (t) traces.push(...t.map(trace => ({...trace, drawingColor:entry.color})))
      return
    }

    try {
      const f = makeEval(math.compile(entry.expr))

      // Removable discontinuity: f is undefined at the target but the limit
      // exists. We mark it as an open circle and let the user click to fill it.
      const holeY = detectHole(f, limitTarget)

      // Base curve — thin gray so the colored traces stand out.
      // 3500 points across the full axis range so it reaches both edges.
      const base = sampleFunction(f, xMin, xMax, 3500, yMax - yMin)
      traces.push({
        x: base.xs, y: base.ys,
        type: 'scatter', mode: 'lines',
        name: entry.expr,
        line: { color: IMPLICIT_COLORS[idx % IMPLICIT_COLORS.length], width: 2, shape: 'spline' },
        drawingColor: entry.color,
        connectgaps: false,
        showlegend: true,
      })

      // Left traced path (dark blue) — from xMin to leftX
      if (leftX > xMin) {
        const steps = Math.max(50, Math.round(3500 * (leftX - xMin) / (xMax - xMin)))
        const left = sampleFunction(f, xMin, leftX, steps, yMax - yMin)
        traces.push({
          x: left.xs, y: left.ys,
          type: 'scatter', mode: 'lines',
          line: { color: '#1e3a8a', width: 3, shape: 'spline' },
          connectgaps: false,
          showlegend: false,
        })
      }

      // Right traced path (red) — from rightX to xMax
      if (rightX < xMax) {
        const steps = Math.max(50, Math.round(3500 * (xMax - rightX) / (xMax - xMin)))
        const right = sampleFunction(f, rightX, xMax, steps, yMax - yMin)
        traces.push({
          x: right.xs, y: right.ys,
          type: 'scatter', mode: 'lines',
          line: { color: '#dc2626', width: 3, shape: 'spline' },
          connectgaps: false,
          showlegend: false,
        })
      }

      // Dots on the curve
      if (atTarget) {
        // Single purple dot at the target
        const yTarget = f(limitTarget)
        if (Number.isFinite(yTarget)) {
          traces.push({
            x: [limitTarget], y: [yTarget],
            type: 'scatter', mode: 'markers',
            marker: { size: 13, color: '#6d28d9', line: { color: '#fff', width: 2 } },
            showlegend: false,
            hoverinfo: 'text',
            text: [`${entry.expr}(${limitTarget}) = ${yTarget.toFixed(6)}`],
          })
        }
      } else {
        // Left dot (dark blue)
        const yLeft = f(leftX)
        if (Number.isFinite(yLeft)) {
          traces.push({
            x: [leftX], y: [yLeft],
            type: 'scatter', mode: 'markers',
            marker: { size: 11, color: '#1e3a8a', line: { color: '#fff', width: 2 } },
            showlegend: false,
            hoverinfo: 'text',
            text: [`${entry.expr}(${leftX.toFixed(2)}) = ${yLeft.toFixed(6)}`],
          })
        }
        // Right dot (red)
        const yRight = f(rightX)
        if (Number.isFinite(yRight)) {
          traces.push({
            x: [rightX], y: [yRight],
            type: 'scatter', mode: 'markers',
            marker: { size: 11, color: '#dc2626', line: { color: '#fff', width: 2 } },
            showlegend: false,
            hoverinfo: 'text',
            text: [`${entry.expr}(${rightX.toFixed(2)}) = ${yRight.toFixed(6)}`],
          })
        }
      }

      // ── Hole marker ──
      // Open circle = the hole (limit value, function undefined here). Click it
      // to "fill" it: a solid purple dot appears at the limit value.
      if (holeY !== null) {
        const filled = filledHoles.has(entry.id)
        traces.push({
          x: [limitTarget], y: [holeY],
          type: 'scatter', mode: 'markers',
          customdata: [entry.id],
          marker: filled
            ? { size: 13, color: '#6d28d9', line: { color: '#fff', width: 2 } }
            : { size: 14, color: '#ffffff', line: { color: '#6d28d9', width: 2.5 } },
          showlegend: false,
          hoverinfo: 'text',
          text: [
            filled
              ? `f(${limitTarget}) filled in = ${holeY.toFixed(4)} (click to empty)`
              : `Hole at x = ${limitTarget}: limit = ${holeY.toFixed(4)} (click to fill)`,
          ],
        })
      }
    } catch { /* bad expression */ }
  })

  // Dashed vertical lines at the two traveling dots
  if (!atTarget) {
    shapes.push({
      type: 'line', x0: leftX, x1: leftX,
      y0: 0, y1: 1, yref: 'paper',
      line: { color: '#1e3a8a', width: 1.5, dash: 'dash' },
    })
    shapes.push({
      type: 'line', x0: rightX, x1: rightX,
      y0: 0, y1: 1, yref: 'paper',
      line: { color: '#dc2626', width: 1.5, dash: 'dash' },
    })
  }

  // Dotted vertical line at the limit target
  shapes.push({
    type: 'line', x0: limitTarget, x1: limitTarget,
    y0: 0, y1: 1, yref: 'paper',
    line: { color: atTarget ? '#6d28d9' : '#94a3b8', width: atTarget ? 2 : 1, dash: atTarget ? 'dash' : 'dot' },
  })

  // Live label showing current x value
  annotations.push({
    x: leftX, y: 1, yref: 'paper',
    text: atTarget ? `x = ${limitTarget}` : `x → ${leftX.toFixed(2)}`,
    showarrow: false,
    font: { size: 13, color: atTarget ? '#6d28d9' : '#1e293b', family: 'system-ui, sans-serif' },
    bgcolor: 'rgba(255,255,255,0.85)',
    borderpad: 4,
    xanchor: 'right', xshift: -8, yshift: -8,
  })

  if (!atTarget) {
    annotations.push({
      x: rightX, y: 1, yref: 'paper',
      text: `x → ${rightX.toFixed(2)}`,
      showarrow: false,
      font: { size: 13, color: '#1e293b', family: 'system-ui, sans-serif' },
      bgcolor: 'rgba(255,255,255,0.85)',
      borderpad: 4,
      xanchor: 'left', xshift: 8, yshift: -8,
    })
  }

  // ── Limit approach table ──
  const offsets = [0.1, 0.01, 0.001, 0.0001]
  const limitRows = []
  entries.forEach(entry => {
    if (!entry.expr.trim() || isImplicitEquation(entry.expr)) return
    try {
      const f = makeEval(math.compile(entry.expr))
      const leftVals = offsets.map(d => f(limitTarget - d))
      const rightVals = offsets.map(d => f(limitTarget + d))
      limitRows.push({ expr: entry.expr, leftVals, rightVals, offsets })
    } catch { /* skip */ }
  })

  const plotLayout = cartesianLayout({ xMin, xMax, yMin, yMax, shapes, annotations,
    showLegend: entries.filter(e => e.expr.trim()).length > 1 })
  if (entries.some(entry => isImplicitEquation(entry.expr))) {
    plotLayout.xaxis.constrain = 'domain'
    plotLayout.yaxis = { ...plotLayout.yaxis, scaleanchor: 'x', scaleratio: 1, constrain: 'domain' }
  }

  if(!Number.isFinite(targetValue))return <InfiniteLimits target={targetValue} onTarget={value=>{setLimitTarget(value);setSliderX(Number.isFinite(value)?value-10:-10)}} entries={entries} onEntries={setEntries}/>

  return (
    <div className="viz-layout">
      {/* ── Left panel ── */}
      <div className="viz-panel">
        <div className="viz-header">
          <span className="viz-title">lim x →</span>
          <BoundInput
            className="viz-num-input limit-target-input"
            value={limitTarget}
            aria-label="Limit target"
            onChange={val => {
              setLimitTarget(val)
              // Reset slider to far left so the dot starts away from the new target
              setSliderX(Number.isFinite(val)?val-view.zoom:-10)
            }}
            step="any"
          />
        </div>

        <div className="viz-section viz-hint">Enter a function or an equation, such as x² + y² = 25. Press Enter for another expression. Delete an empty row with Backspace or Delete.</div>
        <div className="expr-list" ref={entriesRef}>
          {entries.map((entry, i) => (
            <div key={entry.id} className="expr-row" tabIndex={0} role="group" aria-label={`Expression ${i+1}`} onClick={event=>{if(event.target===event.currentTarget)event.currentTarget.focus()}} onKeyDown={event=>{
              if(event.target===event.currentTarget && ['Delete','Backspace'].includes(event.key)) {event.preventDefault();deleteEntry(entry.id)}
            }}>
              <LineColorPicker number={i+1} value={entry.color} themeColor={graphColor(IMPLICIT_COLORS[i % IMPLICIT_COLORS.length],settings)} onChange={color=>setEntries(prev=>prev.map(item=>item.id===entry.id?{...item,color}:item))}/>
              <MathInput value={entry.latex} equationMode="graph"
                onInput={(latex, ascii) => handleMathInput(entry.id, latex, ascii)}
                onEnter={addEntry}
                onDeleteEmpty={() => deleteEntry(entry.id)}
                autoFocus={focusedEntry ? entry.id === focusedEntry : i === entries.length - 1}
              />
              <button className="expr-delete" aria-label={`Delete expression ${i+1}`} title="Delete expression" onClick={() => deleteEntry(entry.id)}><svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 6h12M8 3h4l1 3H7l1-3ZM6 6l1 11h6l1-11M9 9v5m2-5v5"/></svg></button>
            </div>
          ))}
        </div>

        {limitRows.length > 0 && (
          <div className="limit-table-section">
            {limitRows.map((row, ri) => (
              <div key={ri} className="limit-table-block">
                <div className="limit-table-title">f(x) = {row.expr}</div>
                <table className="limit-table">
                  <thead>
                    <tr>
                      <th>x (left)</th>
                      <th>f(x)</th>
                      <th>x (right)</th>
                      <th>f(x)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {row.offsets.map((d, j) => (
                      <tr key={j}>
                        <td>{(limitTarget - d).toFixed(4)}</td>
                        <td>{Number.isFinite(row.leftVals[j]) ? row.leftVals[j].toFixed(6) : '—'}</td>
                        <td>{(limitTarget + d).toFixed(4)}</td>
                        <td>{Number.isFinite(row.rightVals[j]) ? row.rightVals[j].toFixed(6) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Right side: graph + slider ── */}
      <div className="viz-main">
        <div className="viz-graph" onWheel={view.handleWheel}>
          <Plot
            data={traces}
            layout={plotLayout}
            config={PLOT_CONFIG}
            onRelayout={view.handleRelayout}
            onClick={handleClick}
            useResizeHandler
            style={{ width: '100%', height: '100%' }}
          />
          <ZoomControls onZoomIn={view.zoomIn} onZoomOut={view.zoomOut} onReset={view.resetView} />
        </div>

        {/* Slider moves both dots toward the limit target. The left end-label
            is editable so the user can widen the approach range. */}
        <div className="viz-slider">
          <label>
            x → <strong style={{ color: atTarget ? graphColor('#6d28d9', settings) : undefined }}>{atTarget ? limitTarget : leftX.toFixed(2)}</strong>
          </label>
          <div className="slider-track">
            <input
              type="range"
              min={limitTarget - sliderRange}
              max={limitTarget}
              step={0.01}
              value={leftX}
              onChange={e => setSliderX(parseFloat(e.target.value))}
            />
            <div className="slider-labels">
              <span
                className="slider-label-editable"
                contentEditable
                suppressContentEditableWarning
                onFocus={e => {
                  // Select all text so user can just start typing
                  const range = document.createRange()
                  range.selectNodeContents(e.target)
                  const sel = window.getSelection()
                  sel.removeAllRanges()
                  sel.addRange(range)
                }}
                onBlur={e => {
                  const raw = parseFloat(e.target.textContent)
                  if (!isNaN(raw) && raw !== 0) {
                    const positive = Math.abs(raw)
                    setSliderRange(positive)
                    setSliderX(limitTarget - positive)
                  }
                  // Reset displayed text to current value
                  e.target.textContent = String(-sliderRange)
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); e.target.blur() }
                }}
              >
                {-sliderRange}
              </span>
              <span>{limitTarget}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
