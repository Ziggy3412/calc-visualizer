import { useState, useMemo, useCallback, useRef } from 'react'
import Plot from '../components/ThemedPlot'
import { compileSlope } from '../shared/slopeEquation'
import TeX from '../components/TeX'
import MathInput from '../components/MathInput'
import ZoomControls from '../components/ZoomControls'
import VizSlider from '../components/VizSlider'
import usePlotView from '../shared/usePlotView'
import { cartesianLayout, PLOT_CONFIG } from '../shared/plotDefaults'
import { traceSolution } from '../shared/slopeTrace'
import './SlopeField.css'

const CURVE_COLORS = ['#dc2626', '#7c3aed', '#0891b2', '#ea580c', '#16a34a', '#db2777']

// Example equations — clicking one fills the input field.
const EXAMPLES = [
  { label: 'x - y',      latex: 'x - y',        ascii: 'x - y' },
  { label: 'x*y',        latex: 'x \\cdot y',   ascii: 'x*y' },
  { label: 'sin(x) - y', latex: '\\sin(x) - y', ascii: 'sin(x) - y' },
  { label: '-x/y',       latex: '-x / y',       ascii: '-x/y' },
]

export default function SlopeField({ initial = {} }) {
  const [expr, setExpr] = useState(initial.expr ?? { latex: '', ascii: '' })
  const [density, setDensity] = useState(18)        // grid points per axis
  const [seeds, setSeeds] = useState(initial.seeds ?? [])            // clicked starting points

  // View window centered at origin + shared zoom/pan.
  const view = usePlotView(8, 0, 0)
  const { xMin, xMax, yMin, yMax } = view
  const bounds = { xMin, xMax, yMin, yMax }

  // Hold the Plotly graph div so we can convert a click pixel into data coords.
  const gdRef = useRef(null)

  // Compile g(x, y).
  const slope = useMemo(() => {
    if (!expr.ascii.trim()) return null
    try {
      return compileSlope(expr.ascii)
    } catch { return null }
  }, [expr.ascii])

  // Convert a browser click into plot data coordinates using Plotly's axis
  // objects, then drop a seed point there. This lets the user click ANYWHERE
  // (not just on an existing data point).
  const handleClick = useCallback((e) => {
    if(e.target.closest?.('button,input,select'))return
    const gd = gdRef.current
    if (!gd || !gd._fullLayout) return
    const xa = gd._fullLayout.xaxis
    const ya = gd._fullLayout.yaxis
    const rect = gd.getBoundingClientRect()
    // Pixels relative to the plotting area (subtract the axis pixel offset).
    const px = e.clientX - rect.left - xa._offset
    const py = e.clientY - rect.top - ya._offset
    if (px < 0 || px > xa._length || py < 0 || py > ya._length) return
    try {
      const x = xa.p2d(px)
      const y = ya.p2d(py)
      if (Number.isFinite(x) && Number.isFinite(y) && slope && Number.isFinite(slope(x,y))) {
        setSeeds(prev => [...prev, { x, y }])
      }
    } catch { /* ignore bad conversions */ }
  }, [slope])

  // ── Build the slope-field segments ──
  // One scatter trace holds every little tick: we push the two endpoints of
  // each segment followed by a null to break the line between segments.
  const traces = []

  if (slope) {
    const segX = [], segY = []
    // Segment length: a fraction of the grid spacing so ticks never overlap.
    const spacing = (xMax - xMin) / density
    const segLen = spacing * 0.42
    for (let i = 0; i <= density; i++) {
      const gx = xMin + (i * (xMax - xMin)) / density
      for (let j = 0; j <= density; j++) {
        const gy = yMin + (j * (yMax - yMin)) / density
        const m = slope(gx, gy)
        if (!Number.isFinite(m)) {
          // Undefined points have no direction segment.
          continue
        }
        // Normalize so every segment is the same visual length regardless of
        // how steep the slope is: direction (1, m)/√(1+m²).
        const norm = 1 / Math.hypot(1, m)
        const dx = segLen * norm
        const dy = segLen * m * norm
        segX.push(gx - dx / 2, gx + dx / 2, null)
        segY.push(gy - dy / 2, gy + dy / 2, null)
      }
    }
    traces.push({
      x: segX, y: segY,
      type: 'scatter', mode: 'lines',
      line: { color: '#64748b', width: 1.5 },
      hoverinfo: 'skip', showlegend: false,
    })
    // ── Solution curves through each seed (forward + backward RK4) ──
    const step = Math.min(0.05, (xMax - xMin) / 600)
    const maxSteps = 4000
    seeds.forEach((seed, idx) => {
      if(!Number.isFinite(slope(seed.x,seed.y)))return
      const color = CURVE_COLORS[idx % CURVE_COLORS.length]
      const fwd = traceSolution(slope, seed.x, seed.y, +1, step, maxSteps, bounds)
      const bwd = traceSolution(slope, seed.x, seed.y, -1, step, maxSteps, bounds)
      // Stitch backward (reversed) + forward into one continuous curve.
      const cx = bwd.xs.slice().reverse().concat(fwd.xs.slice(1))
      const cy = bwd.ys.slice().reverse().concat(fwd.ys.slice(1))
      traces.push({
        x: cx, y: cy,
        type: 'scatter', mode: 'lines',
        line: { color, width: 2.5, shape: 'linear' },
        hoverinfo: 'skip', showlegend: false,
      })
      // The seed dot.
      traces.push({
        x: [seed.x], y: [seed.y],
        type: 'scatter', mode: 'markers',
        marker: { size: 9, color, line: { color: '#fff', width: 1.5 } },
        hoverinfo: 'text', text: [`seed (${seed.x.toFixed(2)}, ${seed.y.toFixed(2)})`],
        showlegend: false,
      })
    })
  }

  return (
    <div className="viz-layout">
      {/* ── Left panel ── */}
      <div className="viz-panel">
        <div className="viz-header">
          <span className="viz-title">Slope Fields</span>
        </div>

        {/* dy/dx input */}
        <div className="viz-section">
          <label className="viz-field-label">dy/dx = g(x, y)</label>
          <MathInput equationMode="slope"
            value={expr.latex}
            onInput={(latex, ascii, functionLatex) => setExpr({ latex, ascii, functionLatex })}
            autoFocus
          />
          <div className="viz-hint">Use both x and y, e.g. <code>x - y</code>, <code>x*y</code>, <code>sin(x) - y</code></div>
        </div>

        {/* Echo the equation */}
        {expr.ascii.trim() && (
          <div className="viz-section">
            <div className="viz-formula">
              <TeX display math={`\\frac{dy}{dx} = ${expr.functionLatex || expr.latex || expr.ascii}`} />
            </div>
          </div>
        )}

        {/* Example chips — clicking one fills the input above */}
        <div className="viz-section">
          <label className="viz-field-label">Examples</label>
          <div className="viz-chips">
            {EXAMPLES.map(ex => (
              <button
                key={ex.label}
                className="viz-chip"
                onClick={() => setExpr({ latex: ex.latex, ascii: ex.ascii })}
              >
                <TeX math={ex.latex} />
              </button>
            ))}
          </div>
        </div>

        <div className="viz-section">
          <div className="viz-hint">
            <strong>Click anywhere on the graph</strong> to drop a starting point — a
            solution curve is traced through it in both directions with adaptive RK4. Traces stop when the equation is undefined or a reliable step cannot be found. Gaps in the field indicate undefined slopes.
          </div>
          <button className="viz-btn viz-danger" onClick={() => setSeeds([])}>
            Clear solutions ({seeds.length})
          </button>
        </div>
      </div>

      {/* ── Right side: graph + slider ── */}
      <div className="viz-main">
        <div className="viz-graph slf-graph" onWheel={view.handleWheel} onClick={handleClick}>
          <Plot
            data={traces}
            layout={cartesianLayout({ xMin, xMax, yMin, yMax, xTitle: 'x', yTitle: 'y' })}
            config={PLOT_CONFIG}
            onInitialized={(fig, gd) => { gdRef.current = gd }}
            onUpdate={(fig, gd) => { gdRef.current = gd }}
            onRelayout={view.handleRelayout}
            useResizeHandler
            style={{ width: '100%', height: '100%' }}
          />
          <ZoomControls onZoomIn={view.zoomIn} onZoomOut={view.zoomOut} onReset={view.resetView} />
        </div>

        {/* Grid density slider */}
        <VizSlider
          label={<>Grid density = <strong>{density}</strong></>}
          min={6} max={40} step={1} value={density}
          onChange={setDensity}
          leftLabel="sparse" rightLabel="dense"
        />
      </div>
    </div>
  )
}
