import { samplePolar } from '../shared/polar'
import {integrateExtended,previewBounds,formatBound,texBound} from '../shared/infinity'
import {parseNumberDraft} from '../shared/numberInput'
import { useState, useEffect, useRef } from 'react'
import Plot from '../components/ThemedPlot'
import * as math from 'mathjs'
import TeX from '../components/TeX'
import MathInput from '../components/MathInput'
import ZoomControls from '../components/ZoomControls'
import { fmtNum } from '../shared/numerics'
import './Polar.css'

// Polar area: (1/2) ∫ r² dθ via Simpson's rule
function polarArea(fn, thetaMin, thetaMax, n = 200) {
  if (n < 2) n = 2
  if (n % 2 !== 0) n++
  const h = (thetaMax - thetaMin) / n
  let sum = 0
  try {
    const rA = fn.evaluate({ theta: thetaMin, x: thetaMin })
    const rB = fn.evaluate({ theta: thetaMax, x: thetaMax })
    if (!Number.isFinite(rA) || !Number.isFinite(rB)) return NaN
    sum += rA * rA + rB * rB
    for (let i = 1; i < n; i++) {
      const theta = thetaMin + i * h
      const r = fn.evaluate({ theta, x: theta })
      if (!Number.isFinite(r)) return NaN
      sum += (i % 2 === 0 ? 2 : 4) * r * r
    }
    return 0.5 * (h / 3) * sum
  } catch { return NaN }
}

// Format a radian value as a LaTeX string using π
function formatPiLatex(val) {
  if (!Number.isFinite(val)) return '?'
  const ratio = val / Math.PI
  if (Math.abs(ratio) < 0.001) return '0'
  if (Math.abs(ratio - 1) < 0.001) return '\\pi'
  if (Math.abs(ratio + 1) < 0.001) return '-\\pi'
  if (Math.abs(ratio - 2) < 0.001) return '2\\pi'
  if (Math.abs(ratio + 2) < 0.001) return '-2\\pi'
  if (Math.abs(ratio - 0.5) < 0.001) return '\\tfrac{\\pi}{2}'
  if (Math.abs(ratio + 0.5) < 0.001) return '-\\tfrac{\\pi}{2}'
  if (Math.abs(ratio - 0.25) < 0.001) return '\\tfrac{\\pi}{4}'
  if (Math.abs(ratio - 0.75) < 0.001) return '\\tfrac{3\\pi}{4}'
  if (Math.abs(ratio - 1.5) < 0.001) return '\\tfrac{3\\pi}{2}'
  return val.toFixed(2)
}

// Display-friendly version (no LaTeX)
function formatPi(val) {
  if (!Number.isFinite(val)) return '—'
  const ratio = val / Math.PI
  if (Math.abs(ratio) < 0.001) return '0'
  if (Math.abs(ratio - 1) < 0.001) return 'π'
  if (Math.abs(ratio + 1) < 0.001) return '-π'
  if (Math.abs(ratio - 2) < 0.001) return '2π'
  if (Math.abs(ratio - 0.5) < 0.001) return 'π/2'
  if (Math.abs(ratio - 0.25) < 0.001) return 'π/4'
  return val.toFixed(3)
}

export default function Polar({ initial = {} }) {
  const [expr, setExpr] = useState(initial.expr ?? { latex: '', ascii: '' })
  // Store θ bounds as strings so users can type expressions like "2*pi"
  const [thetaStartStr, setThetaStartStr] = useState(initial.thetaStartStr ?? formatBound(initial.thetaStart ?? 0))
  const [thetaEndStr, setThetaEndStr] = useState(initial.thetaEndStr ?? (initial.thetaEnd === undefined ? '2*pi' : formatBound(initial.thetaEnd)))
  const [boundThetaStart, setThetaStart] = useState(initial.thetaStart ?? 0)
  const [boundThetaEnd, setThetaEnd] = useState(initial.thetaEnd ?? 2 * Math.PI)

  const [thetaStart,thetaEnd]=previewBounds(boundThetaStart,boundThetaEnd,2*Math.PI)
  const unbounded=!Number.isFinite(boundThetaStart)||!Number.isFinite(boundThetaEnd)
  // Radial zoom: null = auto-fit to the curve. The zoom buttons override it.
  // uiRev is bumped whenever a button changes the view so Plotly re-applies the
  // range; between bumps it preserves the user's mouse zoom/pan (uirevision).
  const [radialMax, setRadialMax] = useState(null)
  const [uiRev, setUiRev] = useState(0)

  // Re-fit the radial axis (called whenever the function or θ bounds change)
  function refitRadial() {
    setRadialMax(null)
    setUiRev(r => r + 1)
  }

  // Animation — two separate phases:
  //   'draw'  → traces the curve r(θ) from start to end (no shading)
  //   'sweep' → keeps the full curve and shades/sweeps the area (integration)
  //   'idle'  → static full curve + full shaded region (so areas display)
  const [mode, setMode] = useState('idle')
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(1) // 0..1 fraction of current phase
  const animRef = useRef(null)
  const lastTimeRef = useRef(null)

  // Parse a math expression string into a number (e.g. "2*pi" → 6.283…)
  function parseThetaInput(str, fallback) {
    const infinity=parseNumberDraft(str,true)
    if(infinity!==null&&!Number.isFinite(infinity))return infinity
    try {
      const val = math.evaluate(str)
      return Number.isFinite(val) ? val : fallback
    } catch { return fallback }
  }

  function handleThetaStartChange(val) {
    setThetaStartStr(val)
    setThetaStart(parseThetaInput(val, boundThetaStart))
    // Reset to static full view and re-fit the axis when bounds change
    setPlaying(false); setMode('idle'); setProgress(1)
    refitRadial()
  }

  function handleThetaEndChange(val) {
    setThetaEndStr(val)
    setThetaEnd(parseThetaInput(val, boundThetaEnd))
    setPlaying(false); setMode('idle'); setProgress(1)
    refitRadial()
  }

  // Draw phase plays a touch faster; sweep takes ~4 s
  const duration = mode === 'draw' ? 3 : 4

  useEffect(() => {
    if (!playing) {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      lastTimeRef.current = null
      return
    }

    function tick(timestamp) {
      if (lastTimeRef.current === null) lastTimeRef.current = timestamp
      const dt = (timestamp - lastTimeRef.current) / 1000
      lastTimeRef.current = timestamp

      setProgress(prev => {
        const next = prev + dt / duration
        if (next >= 1) { setPlaying(false); return 1 }
        return next
      })
      animRef.current = requestAnimationFrame(tick)
    }

    animRef.current = requestAnimationFrame(tick)
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [playing, duration])

  // Phase 1: animate the curve being drawn
  function handleDraw() {
    if (playing && mode === 'draw') { setPlaying(false); return } // pause
    setMode('draw')
    if (progress >= 1 || mode !== 'draw') setProgress(0) // restart if finished
    setPlaying(true)
  }

  // Phase 2: animate the area sweep (integration)
  function handleSweep() {
    if (playing && mode === 'sweep') { setPlaying(false); return } // pause
    setMode('sweep')
    if (progress >= 1 || mode !== 'sweep') setProgress(0)
    setPlaying(true)
  }

  function resetAnim() {
    setPlaying(false); setMode('idle'); setProgress(1)
  }

  // Resolve how far the curve is drawn and how far the region is shaded
  const range = thetaEnd - thetaStart
  let curveFrac = 1, shadeFrac = 1 // 'idle' → everything shown
  if (mode === 'draw')  { curveFrac = progress; shadeFrac = 0 }
  if (mode === 'sweep') { curveFrac = 1;        shadeFrac = progress }
  const curveEnd = thetaStart + curveFrac * range
  const shadeEnd = thetaStart + shadeFrac * range

  // Compile the expression (MathInput already normalizes θ → "theta")
  let compiled = null
  try {
    if (expr.ascii.trim()) {
      compiled = math.compile(expr.ascii)
      compiled.evaluate({ theta: 0, x: 0 }) // test
    }
  } catch { compiled = null }

  // ── Build traces ──
  const traces = []

  if (compiled) {
    // The curve — drawn up to curveEnd (grows during the "draw" phase)
    const full = samplePolar(compiled, thetaStart, curveEnd, 500)
    traces.push({
      type: 'scatterpolar',
      r: full.rs,
      theta: full.thetas,
      thetaunit: 'radians',
      mode: 'lines',
      name: 'r(θ)',
      line: { color: '#2d70b3', width: 3 },
    })

    // Moving dot at the tip of the curve while it's being drawn
    if (mode === 'draw' && curveEnd < thetaEnd - 0.001) {
      try {
        const rTip = compiled.evaluate({ theta: curveEnd, x: curveEnd })
        if (Number.isFinite(rTip)) {
          traces.push({
            type: 'scatterpolar',
            r: [Math.abs(rTip)],
            theta: [rTip >= 0 ? curveEnd : curveEnd + Math.PI],
            thetaunit: 'radians',
            mode: 'markers',
            marker: { size: 9, color: '#2d70b3' },
            showlegend: false,
            hoverinfo: 'skip',
          })
        }
      } catch { /* skip */ }
    }

    // Shaded region — from thetaStart to shadeEnd (grows during the "sweep" phase)
    if (shadeFrac > 0.001) {
      const swept = samplePolar(compiled, thetaStart, shadeEnd, 300)
      // Close the region through the origin for fill
      const fillR = [0, ...swept.rs, 0]
      const fillTheta = [
        swept.thetas[0] ?? thetaStart,
        ...swept.thetas,
        swept.thetas[swept.thetas.length - 1] ?? shadeEnd,
      ]

      traces.push({
        type: 'scatterpolar',
        r: fillR,
        theta: fillTheta,
        thetaunit: 'radians',
        mode: 'lines',
        fill: 'toself',
        fillcolor: 'rgba(59, 130, 246, 0.15)',
        line: { color: 'rgba(59, 130, 246, 0.3)', width: 1 },
        showlegend: false,
        hoverinfo: 'skip',
      })
    }

    // Radial sweep line — only during the integration sweep
    if (mode === 'sweep' && shadeEnd < thetaEnd - 0.01) {
      try {
        const rVal = compiled.evaluate({ theta: shadeEnd, x: shadeEnd })
        if (Number.isFinite(rVal)) {
          traces.push({
            type: 'scatterpolar',
            r: [0, Math.abs(rVal)],
            theta: [shadeEnd, rVal >= 0 ? shadeEnd : shadeEnd + Math.PI],
            thetaunit: 'radians',
            mode: 'lines+markers',
            line: { color: '#ef4444', width: 2, dash: 'dash' },
            marker: { size: [0, 8], color: '#ef4444' },
            showlegend: false,
            hoverinfo: 'skip',
          })
        }
      } catch { /* skip */ }
    }
  }

  // With no function entered there are no data traces, and Plotly would fall
  // back to default Cartesian axes. Add an empty scatterpolar trace so the
  // polar grid always renders.
  if (traces.length === 0) {
    traces.push({ type: 'scatterpolar', r: [], theta: [], mode: 'lines', showlegend: false, hoverinfo: 'skip' })
  }

  // Compute areas — swept area reflects the current shaded sweep
  let sweptArea = NaN, totalArea = NaN
  if (compiled) {
    sweptArea = polarArea(compiled, thetaStart, shadeEnd)
    totalArea = unbounded?integrateExtended(t=>{const r=compiled.evaluate({theta:t,x:t});return typeof r==='number'&&Number.isFinite(r)?r*r/2:NaN},boundThetaStart,boundThetaEnd).value:polarArea(compiled, thetaStart, thetaEnd)
  }

  // Auto-scale the radial axis to fit the curve
  let autoMaxR = 5
  if (compiled) {
    const samples = samplePolar(compiled, thetaStart, thetaEnd, 200)
    const validRs = samples.rs.filter(r => r !== null && Number.isFinite(r))
    if (validRs.length > 0) {
      autoMaxR = Math.max(1, Math.max(...validRs.map(Math.abs)) * 1.2)
    }
  }
  // Effective radial range: a manual zoom level if set, else the auto fit
  const maxR = radialMax ?? autoMaxR

  // Zoom controls — bump uiRev so Plotly applies the new range
  function zoomIn()   { setRadialMax(Math.max(0.1, maxR * 0.8)); setUiRev(r => r + 1) }
  function zoomOut()  { setRadialMax(maxR * 1.25); setUiRev(r => r + 1) }
  function zoomHome() { setRadialMax(null); setUiRev(r => r + 1) }

  return (
    <div className="viz-layout">
      {/* ── Left panel ── */}
      <div className="viz-panel">
        <div className="viz-header">
          <span className="viz-title">Polar Integration</span>
        </div>

        {/* Function input */}
        <div className="viz-section">
          <label className="viz-field-label">r(θ) — type "theta" for θ</label>
          <MathInput value={expr.latex} equationMode="polar" independent="theta" dependent="r"
            onInput={(latex, ascii, functionLatex) => { setExpr({ latex, ascii, functionLatex }); refitRadial() }}
            autoFocus
          />
        </div>

        {/* Theta range — accepts math expressions like "pi/2" or "2*pi" */}
        <div className="viz-section viz-row">
          <div className="viz-field">
            <label className="viz-field-label">θ start</label>
            <input
              type="text"
              className="viz-num-input"
              aria-label="Polar start angle" value={thetaStartStr}
              onChange={e => handleThetaStartChange(e.target.value)}
            />
            <span className="polar-pi-hint">= {Number.isFinite(boundThetaStart)?formatPi(boundThetaStart):formatBound(boundThetaStart)}</span><div className="bound-infinity-buttons"><button onClick={()=>handleThetaStartChange("-∞")}>−∞</button><button onClick={()=>handleThetaStartChange("∞")}>+∞</button></div>
          </div>
          <div className="viz-field">
            <label className="viz-field-label">θ end</label>
            <input
              type="text"
              className="viz-num-input"
              aria-label="Polar end angle" value={thetaEndStr}
              onChange={e => handleThetaEndChange(e.target.value)}
            />
            <span className="polar-pi-hint">= {Number.isFinite(boundThetaEnd)?formatPi(boundThetaEnd):formatBound(boundThetaEnd)}</span><div className="bound-infinity-buttons"><button onClick={()=>handleThetaEndChange("-∞")}>−∞</button><button onClick={()=>handleThetaEndChange("∞")}>+∞</button></div>
          </div>
        </div>

        {unbounded&&<div className="viz-section viz-hint">Infinite angular range: the drawing and sweep show a finite 2π preview. Total area estimates the full improper integral, counting repeated sweeps. A missing estimate means convergence was not established.</div>}
        {/* Two-phase animation: draw the curve, then sweep the area */}
        <div className="viz-section">
          <div className="viz-btn-row">
            <button
              className={`viz-btn ${playing && mode === 'draw' ? 'playing' : ''}`}
              onClick={handleDraw}
            >
              {playing && mode === 'draw' ? 'Pause' : 'Draw curve'}
            </button>
            <button
              className={`viz-btn ${playing && mode === 'sweep' ? 'playing' : ''}`}
              onClick={handleSweep}
            >
              {playing && mode === 'sweep' ? 'Pause' : 'Sweep area'}
            </button>
          </div>
          <button className="viz-btn" onClick={resetAnim}>
            Reset
          </button>
        </div>

        {/* Results */}
        {compiled && (
          <div className="viz-results">
            <div className="viz-formula">
              <TeX display math={`A = \\frac{1}{2}\\int_{${(unbounded?texBound(boundThetaStart):formatPiLatex(thetaStart))}}^{${(unbounded?texBound(boundThetaEnd):formatPiLatex(thetaEnd))}} r^2 \\, d\\theta`} />
            </div>
            <div className="viz-result-row">
              <span className="viz-result-label">Swept Area</span>
              <span className="viz-result-value">{fmtNum(sweptArea)}</span>
            </div>
            <div className="viz-result-row">
              <span className="viz-result-label">Total Area</span>
              <span className="viz-result-value accent">{fmtNum(totalArea)}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Right side: polar graph ── */}
      <div className="viz-main">
        <div className="viz-graph">
          <ZoomControls onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={zoomHome} />
          <Plot
            data={traces}
            layout={{
              autosize: true,
              margin: { t: 30, r: 30, b: 30, l: 30 },
              dragmode: 'pan', // left-mouse drag pans the plot
              uirevision: uiRev, // preserve mouse zoom/pan until a button bumps it
              polar: {
                // Always show the full circle so the plot never crops to a
                // sector or rotates when only part of the curve is drawn/swept.
                sector: [0, 360],
                hole: 0,
                radialaxis: {
                  range: [0, maxR],
                  showgrid: true,
                  gridcolor: '#e0e0e0',
                  showline: false,
                  angle: 90,
                  tickfont: { size: 11, color: '#94a3b8' },
                },
                angularaxis: {
                  showgrid: true,
                  gridcolor: '#e0e0e0',
                  showline: false,
                  direction: 'counterclockwise',
                  rotation: 0, // 0° fixed at the right (standard math orientation)
                  tickfont: { size: 11, color: '#94a3b8' },
                },
                bgcolor: '#ffffff',
              },
              paper_bgcolor: '#ffffff',
              showlegend: false,
              hovermode: 'closest',
            }}
            config={{ responsive: true, displayModeBar: false, scrollZoom: true }}
            useResizeHandler
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </div>
    </div>
  )
}
