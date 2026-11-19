import { functionBounds } from '../shared/graphFit'
import { useAppearance } from '../shared/appearance'
import { graphColor } from '../shared/graphColors'
import { useState } from 'react'
import Plot from '../components/ThemedPlot'
import * as math from 'mathjs'
import TeX from '../components/TeX'
import MathInput from '../components/MathInput'
import ZoomControls from '../components/ZoomControls'
import usePlotView from '../shared/usePlotView'
import { sampleFunction, makeEval, findSignChanges, findStationaryPoints, fmtNum } from '../shared/numerics'
import { cartesianLayout, PLOT_CONFIG } from '../shared/plotDefaults'
import './PVA.css'

// Symbolic derivative via math.js, returns the node's compiled form + display
function deriveAndCompile(exprString, variable) {
  const node = math.parse(exprString)
  const dNode = math.derivative(node, variable)
  return { compiled: dNode.compile(), latex: dNode.toTex(), expr: dNode.toString() }
}

// ── Analysis helpers (concavity / inflection / critical points) ──
//
// All three boil down to: "where does some derivative cross zero?"
//   • Inflection points  → where f''(x) changes sign
//   • Stationary points  → where f'(x) vanishes (with or without a sign change)
//   • Concavity shading  → the intervals between inflection points,
//                          tinted by the sign of f'' inside each.
// The zero-crossing scan itself (findSignChanges) lives in shared/numerics.js.

// Build concave-up / concave-down bands. The inflection x-values split the
// view into intervals; inside each interval f'' keeps one sign, so we sample
// the midpoint to decide the tint (+1 = concave up, −1 = concave down).
function buildConcavityBands(fpp, min, max, inflections) {
  const cuts = inflections.filter(r => r > min && r < max).sort((a, b) => a - b)
  const bounds = [min, ...cuts, max]
  const bands = []
  for (let i = 0; i < bounds.length - 1; i++) {
    const a = bounds[i], b = bounds[i + 1]
    const v = fpp((a + b) / 2)
    if (Number.isFinite(v) && v !== 0) bands.push({ x0: a, x1: b, sign: v < 0 ? -1 : 1 })
  }
  return bands
}

export default function PVA({ initial = {} }) {
  const { settings } = useAppearance()
  const [expr, setExpr] = useState(initial.expr ?? { latex: '', ascii: '' })
  // Which graphs are visible — multiple can be toggled on at once
  const [activeGraphs, setActiveGraphs] = useState(new Set(initial.graphs ?? ['x']))
  // Cursor position on the x axis
  const [cursorX, setCursorX] = useState(initial.cursorX ?? 0)
  // Which curves show a tangent line at the cursor (any subset of x/v/a)
  const [tangents, setTangents] = useState(new Set(initial.tangents ?? []))
  // Analysis overlays on the position curve (any subset of the three)
  const [overlays, setOverlays] = useState(new Set(initial.overlays ?? []))

  // View centered at the origin + shared zoom/pan


  // Generic Set-state toggler
  function toggleIn(setter) {
    return (key) => setter(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }
  const toggleGraph = toggleIn(setActiveGraphs)
  const toggleTangent = toggleIn(setTangents)
  const toggleOverlay = toggleIn(setOverlays)

  // Compile f(x), f'(x), f''(x), and f'''(x) (for the tangent on f'') into
  // NaN-safe plain evaluators.
  let f = null, fp = null, fpp = null, fppp = null
  let fpLatex = '', fppLatex = ''

  if (expr.ascii.trim()) {
    try {
      f = makeEval(math.compile(expr.ascii))
      const d1 = deriveAndCompile(expr.ascii, 'x')
      fp = makeEval(d1.compiled)
      fpLatex = d1.latex
      const d2 = deriveAndCompile(d1.expr, 'x')
      fpp = makeEval(d2.compiled)
      fppLatex = d2.latex
      // f'''(x) — only needed for the tangent line on f''
      try {
        fppp = makeEval(deriveAndCompile(d2.expr, 'x').compiled)
      } catch { /* third derivative may not exist */ }
    } catch {
      // If parse/derivative fails, leave as null
    }
  }

  const visibleFunctions = [activeGraphs.has('x') && f, activeGraphs.has('v') && fp, activeGraphs.has('a') && fpp].filter(Boolean)
  const graphBounds = functionBounds(visibleFunctions, cursorX - 10, cursorX + 10)
  const view = usePlotView(10, 0, 0, { key: `${expr.ascii}|${[...activeGraphs].sort().join(',')}|${cursorX}`, bounds: graphBounds })
  const { xMin, xMax, yMin, yMax } = view

  // Colors: f = black, f' = red, f'' = blue
  const graphInfo = {
    x: { fn: f,   color: '#000000', label: 'f',   fullLabel: 'f(x)',   tangentSlope: fp },
    v: { fn: fp,  color: '#ef4444', label: "f'",  fullLabel: "f'(x)",  tangentSlope: fpp },
    a: { fn: fpp, color: '#3b82f6', label: "f''", fullLabel: "f''(x)", tangentSlope: fppp },
  }

  // ── Build traces and shapes ──
  const traces = []
  const shapes = []

  // Draw every toggled-on graph
  for (const key of ['x', 'v', 'a']) {
    if (!activeGraphs.has(key)) continue
    const info = graphInfo[key]
    if (!info.fn) continue

    // The curve — sampled across the full axis range so it reaches both edges
    const curve = sampleFunction(info.fn, xMin, xMax, 3500, yMax - yMin)
    traces.push({
      x: curve.xs, y: curve.ys,
      type: 'scatter', mode: 'lines',
      name: info.fullLabel,
      line: { color: info.color, width: 3, shape: 'spline' },
      connectgaps: false,
    })

    // Dot at cursor position on this curve
    const yVal = info.fn(cursorX)
    if (Number.isFinite(yVal)) {
      traces.push({
        x: [cursorX], y: [yVal],
        type: 'scatter', mode: 'markers',
        marker: { size: 11, color: info.color, line: { color: '#fff', width: 2 } },
        showlegend: false,
        hoverinfo: 'text',
        text: [`${info.fullLabel} = ${yVal.toFixed(4)}`],
      })
    }

    // Tangent line on this curve (slope comes from the next derivative)
    if (tangents.has(key) && info.tangentSlope) {
      const slope = info.tangentSlope(cursorX)
      if (Number.isFinite(yVal) && Number.isFinite(slope)) {
        const delta = view.zoom * 0.3
        traces.push({
          x: [cursorX - delta, cursorX + delta],
          y: [yVal - slope * delta, yVal + slope * delta],
          type: 'scatter', mode: 'lines',
          line: { color: info.color, width: 2, dash: 'dash' },
          showlegend: false,
          hoverinfo: 'skip',
        })
      }
    }
  }

  // ── Analysis overlays on the position curve f(x) ──
  // Inflection x's are needed both for the inflection dots and to split the
  // concavity bands, so compute them once if either overlay is on.
  const needInflection = overlays.has('inflection') || overlays.has('concavity')
  const inflectionXs = (needInflection && fpp)
    ? findSignChanges(fpp, xMin, xMax, 1500) : []

  // Concavity shading: tint each interval between inflection points. Blue =
  // concave up (f'' > 0, matches the f'' curve colour); red = concave down.
  if (overlays.has('concavity') && fpp) {
    const bands = buildConcavityBands(fpp, xMin, xMax, inflectionXs)
    for (const b of bands) {
      shapes.push({
        type: 'rect', xref: 'x', yref: 'paper',
        x0: b.x0, x1: b.x1, y0: 0, y1: 1,
        fillcolor: b.sign > 0 ? 'rgba(59,130,246,0.10)' : 'rgba(239,68,68,0.10)',
        line: { width: 0 }, layer: 'below',
      })
    }
  }

  // Inflection dots: where f'' changes sign, placed on the f(x) curve.
  if (overlays.has('inflection') && f && inflectionXs.length) {
    const ixs = [], iys = [], itext = []
    for (const x of inflectionXs) {
      const y = f(x)
      if (Number.isFinite(y)) { ixs.push(x); iys.push(y); itext.push(`Inflection (x = ${x.toFixed(2)})`) }
    }
    traces.push({
      x: ixs, y: iys, type: 'scatter', mode: 'markers+text',
      marker: { symbol: 'diamond', size: 12, color: '#a855f7', line: { color: '#fff', width: 1.5 } },
      text: ixs.map(() => 'IP'), textposition: 'top center',
      textfont: { color: '#a855f7', size: 11 },
      showlegend: false, hoverinfo: 'text', hovertext: itext,
    })
  }

  // Critical dots: where f'(x) = 0 (maxima/minima of position). Distinct
  // marker (orange star) so they don't get confused with inflection diamonds.
  if (overlays.has('critical') && f && fp) {
    const criticalXs = findStationaryPoints(fp, fpp, xMin, xMax, 1500)
    const cxs = [], cys = [], ctext = []
    for (const x of criticalXs) {
      const y = f(x)
      if (Number.isFinite(y)) { cxs.push(x); cys.push(y); ctext.push(`Critical (x = ${x.toFixed(2)})`) }
    }
    traces.push({
      x: cxs, y: cys, type: 'scatter', mode: 'markers+text',
      marker: { symbol: 'star', size: 13, color: '#f59e0b', line: { color: '#fff', width: 1.5 } },
      text: cxs.map(() => 'C'), textposition: 'bottom center',
      textfont: { color: '#d97706', size: 11 },
      showlegend: false, hoverinfo: 'text', hovertext: ctext,
    })
  }

  // Dashed vertical cursor line
  shapes.push({
    type: 'line', x0: cursorX, x1: cursorX,
    y0: 0, y1: 1, yref: 'paper',
    line: { color: '#94a3b8', width: 1.5, dash: 'dash' },
  })

  // Current values at the cursor for the info panel
  const fVal = f ? f(cursorX) : NaN
  const fpVal = fp ? fp(cursorX) : NaN
  const fppVal = fpp ? fpp(cursorX) : NaN

  return (
    <div className="viz-layout">
      {/* ── Left panel ── */}
      <div className="viz-panel">
        <div className="viz-header">
          <span className="viz-title">Position / Velocity / Acceleration</span>
        </div>

        {/* f(x) input */}
        <div className="viz-section">
          <label className="viz-field-label">f(x) — position</label>
          <MathInput value={expr.latex}
            onInput={(latex, ascii, functionLatex) => setExpr({ latex, ascii, functionLatex })}
            autoFocus
          />
        </div>

        {/* Derived functions display */}
        {f && (
          <div className="viz-section">
            <div className="pva-deriv-row">
              <span className="pva-deriv-label" style={{ color: graphColor('#000000', settings) }}>f(x)</span>
              <span className="pva-deriv-expr"><TeX math={expr.functionLatex || expr.latex || expr.ascii} /></span>
            </div>
            {fp && (
              <div className="pva-deriv-row">
                <span className="pva-deriv-label" style={{ color: graphColor('#ef4444', settings) }}>f'</span>
                <span className="pva-deriv-expr"><TeX math={fpLatex} /></span>
              </div>
            )}
            {fpp && (
              <div className="pva-deriv-row">
                <span className="pva-deriv-label" style={{ color: graphColor('#3b82f6', settings) }}>f''</span>
                <span className="pva-deriv-expr"><TeX math={fppLatex} /></span>
              </div>
            )}
          </div>
        )}

        {/* Values at cursor */}
        {f && (
          <div className="viz-section">
            <div className="viz-field-label">At x = {cursorX.toFixed(2)}</div>
            <div className="pva-val-row">
              <span style={{ color: graphColor('#000000', settings) }}>f(x)</span>
              <span className="pva-val">{fmtNum(fVal, 4)}</span>
            </div>
            <div className="pva-val-row">
              <span style={{ color: graphColor('#ef4444', settings) }}>f'(x)</span>
              <span className="pva-val">{fmtNum(fpVal, 4)}</span>
            </div>
            <div className="pva-val-row">
              <span style={{ color: graphColor('#3b82f6', settings) }}>f''(x)</span>
              <span className="pva-val">{fmtNum(fppVal, 4)}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Right side: graph + slider ── */}
      <div className="viz-main">
        <div className="viz-graph" onWheel={view.handleWheel}>
          {/* Curve toggle buttons — multiple can be active at once */}
          <div className="viz-toggle pva-graph-tabs">
            {['x', 'v', 'a'].map(key => (
              <button
                key={key}
                className={`viz-toggle-btn ${activeGraphs.has(key) ? 'active' : ''}`}
                style={{ '--tab-color': graphColor(graphInfo[key].color, settings) }}
                onClick={() => toggleGraph(key)}
              >
                {graphInfo[key].label}
              </button>
            ))}
          </div>

          <Plot
            data={traces}
            layout={cartesianLayout({ xMin, xMax, yMin, yMax, shapes, xTitle: 'x' })}
            config={PLOT_CONFIG}
            onRelayout={view.handleRelayout}
            useResizeHandler
            style={{ width: '100%', height: '100%' }}
          />
          <ZoomControls onZoomIn={view.zoomIn} onZoomOut={view.zoomOut} onReset={view.resetView} />
        </div>

        {/* Cursor slider — range matches the visible graph view */}
        <div className="viz-slider">
          <label>x = <strong>{cursorX.toFixed(2)}</strong></label>
          <div className="slider-track">
            <input type="range" min={xMin} max={xMax} step={0.01}
              value={cursorX} onChange={e => setCursorX(parseFloat(e.target.value))} />
            <div className="slider-labels">
              <span>{xMin.toFixed(1)}</span>
              <span>{xMax.toFixed(1)}</span>
            </div>
          </div>
        </div>

        {/* Tangent toggles — pick which curves show a tangent line */}
        {f && (
          <div className="viz-check-row">
            <span className="viz-check-row-label">Tangent lines:</span>
            {['x', 'v', 'a'].map(key => (
              activeGraphs.has(key) && graphInfo[key].fn && (
                <label key={key} className="viz-check" style={{ color: graphColor(graphInfo[key].color, settings) }}>
                  <input
                    type="checkbox"
                    checked={tangents.has(key)}
                    onChange={() => toggleTangent(key)}
                  />
                  {graphInfo[key].fullLabel}
                </label>
              )
            ))}
          </div>
        )}

        {/* Analysis overlays on the position curve f(x) */}
        {f && (
          <div className="viz-check-row pva-overlays">
            <span className="viz-check-row-label">Position analysis:</span>
            <label className="viz-check pva-overlay-conc">
              <input type="checkbox" checked={overlays.has('concavity')} onChange={() => toggleOverlay('concavity')} />
              Concavity shading
            </label>
            <label className="viz-check pva-overlay-infl">
              <input type="checkbox" checked={overlays.has('inflection')} onChange={() => toggleOverlay('inflection')} />
              Inflection points
            </label>
            <label className="viz-check pva-overlay-crit">
              <input type="checkbox" checked={overlays.has('critical')} onChange={() => toggleOverlay('critical')} />
              Critical points
            </label>
          </div>
        )}
      </div>
    </div>
  )
}
