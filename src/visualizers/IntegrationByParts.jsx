import BoundInput from '../components/BoundInput'
import UnboundedNotice from '../components/UnboundedNotice'
import useExtendedBounds from '../shared/useExtendedBounds'
import { integrateExtended } from '../shared/infinity'
import { paddedBounds } from '../shared/graphFit'
import { useAppearance } from '../shared/appearance'
import { graphColor } from '../shared/graphColors'
import { useState, useEffect, useRef, useMemo } from 'react'
import Plot from '../components/ThemedPlot'
import * as math from 'mathjs'
import TeX from '../components/TeX'
import MathInput from '../components/MathInput'
import ZoomControls from '../components/ZoomControls'
import VizSlider from '../components/VizSlider'
import usePlotView from '../shared/usePlotView'
import { makeEval, integrateSimpson, cumulativeIntegral, fmtNum } from '../shared/numerics'
import { cartesianLayout, PLOT_CONFIG } from '../shared/plotDefaults'
import './IntegrationByParts.css'

// ── Integration by parts:  ∫ u dv = uv − ∫ v du ──
//
// The user supplies u(x) and dv/dx = w(x) (so dv = w(x) dx). math.js can
// differentiate symbolically (for du) but NOT integrate symbolically, so we
// build v(x) = ∫ from a to x of w(t) dt numerically with cumulativeIntegral,
// choosing v(a) = 0 as the natural starting point (any other constant would
// shift the picture but cancel out of the final identity).
//
// The geometric picture (Apostol's classic proof): plot the parametric curve
// (u(t), v(t)) for t from a to b in the u–v plane. Because v(a) = 0, the big
// rectangle [0, u(b)] × [0, v(b)] splits EXACTLY into two regions along that
// curve — the area under it (∫ v du) and the area left of it (∫ u dv) — with
// no gap and no overlap. That's the "rectangle-subtraction diagram."

// Round a number for display in formulas / results.
const fmt = (x) => fmtNum(x, 4)

// True if the array is entirely non-decreasing or entirely non-increasing
// (small wiggles below the tolerance are ignored). The rectangle picture only
// draws two clean, non-overlapping regions when both u(t) and v(t) move in a
// single direction across [a, b].
function isMonotonic(arr, tol = 1e-9) {
  let dir = 0
  for (let i = 1; i < arr.length; i++) {
    const d = arr[i] - arr[i - 1]
    if (Math.abs(d) < tol) continue
    const s = d > 0 ? 1 : -1
    if (dir === 0) dir = s
    else if (s !== dir) return false
  }
  return true
}

// Linear-interpolation lookup over a uniform grid — used to turn the
// cumulative-integral sample array for v(x) back into a plain function of x
// (needed to evaluate v(t)·du/dt when checking ∫ v du independently).
function makeLookup(xs, vs) {
  const n = xs.length
  if (n < 2) return () => vs[0] ?? NaN
  const x0 = xs[0], x1 = xs[n - 1]
  const h = (x1 - x0) / (n - 1)
  return (x) => {
    if (h === 0) return vs[0]
    let idx = (x - x0) / h
    if (idx <= 0) return vs[0]
    if (idx >= n - 1) return vs[n - 1]
    const i0 = Math.floor(idx)
    const frac = idx - i0
    return vs[i0] * (1 - frac) + vs[i0 + 1] * frac
  }
}

// Classic LIATE-flavoured examples: pick u so it gets SIMPLER when
// differentiated, and dv so it stays easy to (numerically) integrate.
// Bounds are chosen so u(t) and v(t) both climb the whole way — a clean
// rectangle picture on first load.
const EXAMPLES = [
  { label: 'x·eˣ',     uLatex: 'x',            uAscii: 'x',       dvLatex: 'e^x',       wAscii: 'e^x',    a: 0, b: 2 },
  { label: 'x·sin(x)', uLatex: 'x',            uAscii: 'x',       dvLatex: '\\sin(x)',  wAscii: 'sin(x)', a: 0, b: 1.4 },
  { label: 'ln(x)',    uLatex: '\\ln(x)',      uAscii: 'log(x)',  dvLatex: '1',         wAscii: '1',      a: 1, b: 3 },
  { label: 'x·ln(x)',  uLatex: '\\ln(x)',      uAscii: 'log(x)',  dvLatex: 'x',         wAscii: 'x',      a: 1, b: 3 },
  { label: 'x²·eˣ',    uLatex: 'x^2',          uAscii: 'x^2',     dvLatex: 'e^x',       wAscii: 'e^x',    a: 0, b: 2 },
  { label: 'arctan(x)', uLatex: '\\arctan(x)', uAscii: 'atan(x)', dvLatex: '1',         wAscii: '1',      a: 0, b: 2 },
]

const GRID_STEPS = 600

export default function IntegrationByParts({ initial = {} }) {
  const { settings } = useAppearance()
  const [exprU, setExprU] = useState({ latex: 'x', ascii: 'x' })
  const [exprW, setExprW] = useState({ latex: 'e^x', ascii: 'e^x' })
  const {a,b,boundA,boundB,setA,setB,unbounded,reach,setReach}=useExtendedBounds(initial,0,2)

  // Sweep animation: reveal ∈ [0,1] is how far along [a,b] the picture has
  // drawn, so the two regions visibly grow out of the curve as it's played.
  const [playing, setPlaying] = useState(false)
  const [reveal, setReveal] = useState(1)
  const animRef = useRef(null)
  const lastRef = useRef(null)

  useEffect(() => {
    if (!playing) {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      lastRef.current = null
      return
    }
    function tick(ts) {
      if (!lastRef.current) lastRef.current = ts
      const dt = (ts - lastRef.current) / 1000
      lastRef.current = ts
      setReveal((p) => {
        const n = p + dt / 3.5
        if (n >= 1) { setPlaying(false); return 1 }
        return n
      })
      animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [playing])

  function togglePlay() {
    if (playing) { setPlaying(false); return }
    if (reveal >= 1) setReveal(0)
    lastRef.current = null
    setPlaying(true)
  }
  function resetSweep() { setPlaying(false); setReveal(1) }
  function onSweepSlider(v) { setPlaying(false); setReveal(v) }

  function loadExample(ex) {
    setExprU({ latex: ex.uLatex, ascii: ex.uAscii })
    setExprW({ latex: ex.dvLatex, ascii: ex.wAscii })
    setA(ex.a)
    setB(ex.b)
    setPlaying(false)
    setReveal(1)
  }

  const hasBothInputs = exprU.ascii.trim() !== '' && exprW.ascii.trim() !== ''
  const validInterval = Number.isFinite(a) && Number.isFinite(b) && b > a
  const hasCurve = hasBothInputs && validInterval

  // Compile u(x), du/dx (symbolic), and w(x) = dv/dx.
  const uFn = useMemo(() => {
    if (!exprU.ascii.trim()) return null
    try { return makeEval(math.compile(exprU.ascii)) } catch { return null }
  }, [exprU.ascii])

  const duNode = useMemo(() => {
    if (!exprU.ascii.trim()) return null
    try { return math.derivative(math.parse(exprU.ascii), 'x') } catch { return null }
  }, [exprU.ascii])
  const duFn = useMemo(() => (duNode ? makeEval(duNode.compile()) : null), [duNode])
  const duLatex = useMemo(() => {
    if (!duNode) return "u'"
    try { return duNode.toTex() } catch { return "u'" }
  }, [duNode])

  const wFn = useMemo(() => {
    if (!exprW.ascii.trim()) return null
    try { return makeEval(math.compile(exprW.ascii)) } catch { return null }
  }, [exprW.ascii])

  // v(x) = ∫ from a to x of w(t) dt, sampled on a uniform grid, v(a) = 0.
  const cumulative = useMemo(() => {
    if (!wFn || !validInterval) return { xs: [], vs: [] }
    try { return cumulativeIntegral(wFn, a, b, GRID_STEPS) } catch { return { xs: [], vs: [] } }
  }, [wFn, a, b, validInterval])

  const uArr = useMemo(() => {
    if (!uFn || !cumulative.xs.length) return []
    return cumulative.xs.map((t) => { const v = uFn(t); return Number.isFinite(v) ? v : NaN })
  }, [uFn, cumulative])
  const vArr = cumulative.vs

  const N = uArr.length - 1 // last valid index
  const ready = hasCurve && N > 0 && uArr.every(Number.isFinite) && vArr.every(Number.isFinite)

  // ── Numeric identity check (always over the FULL interval, independent of
  // the sweep animation) ──
  const vLookup = useMemo(() => makeLookup(cumulative.xs, vArr), [cumulative, vArr])

  const lhs = useMemo(() => { // ∫ u dv
    if (!ready || !uFn || !wFn) return NaN
    return integrateSimpson((t) => uFn(t) * wFn(t), a, b, GRID_STEPS)
  }, [ready, uFn, wFn, a, b])

  const improper=useMemo(()=>unbounded&&uFn&&wFn?integrateExtended(x=>uFn(x)*wFn(x),boundA,boundB):null,[unbounded,uFn,wFn,boundA,boundB])
  const boundary = ready ? uArr[N] * vArr[N] - uArr[0] * vArr[0] : NaN // uv |_a^b

  const rhsInt = useMemo(() => { // ∫ v du, computed independently as a check
    if (!ready || !duFn) return NaN
    return integrateSimpson((t) => vLookup(t) * duFn(t), a, b, GRID_STEPS)
  }, [ready, duFn, vLookup, a, b])

  const checkDiff = Math.abs(lhs + rhsInt - boundary)
  const checkTol = Math.max(1e-3, Math.abs(boundary) * 1e-3)
  const checksOut = Number.isFinite(checkDiff) && checkDiff < checkTol

  const monotonicPicture = ready && isMonotonic(uArr) && isMonotonic(vArr)

  // ── The (u, v) plane view ──
  const uLo = ready ? Math.min(0, ...uArr) : -1
  const uHi = ready ? Math.max(0, ...uArr) : 1
  const vLo = ready ? Math.min(0, ...vArr) : -1
  const vHi = ready ? Math.max(0, ...vArr) : 1
  const centerU = (uLo + uHi) / 2
  const centerV = (vLo + vHi) / 2
  const halfSpan = Math.max(uHi - uLo, vHi - vLo) / 2 || 1
  const graphBounds = ready ? paddedBounds([[0,0], ...uArr.map((u,i) => [u,vArr[i]])]) : null
  const view = usePlotView(halfSpan * 1.18, centerU, centerV, { key: `${exprU.ascii}|${exprW.ascii}|${a}|${b}`, bounds: graphBounds })
  const { xMin, xMax, yMin, yMax } = view

  const traces = []
  const shapes = []

  if (ready) {
    const idx = Math.max(1, Math.round(reveal * N))
    const cu = uArr.slice(0, idx + 1)
    const cv = vArr.slice(0, idx + 1)

    if (monotonicPicture) {
      // Region under the curve, u(a) → u(now), down to the u-axis: ∫ v du.
      traces.push({
        x: [cu[0], ...cu, cu[cu.length - 1]],
        y: [0, ...cv, 0],
        type: 'scatter', mode: 'none', fill: 'toself',
        fillcolor: 'rgba(56,189,248,0.38)',
        name: '∫ v du  (under the curve)',
        hoverinfo: 'skip',
      })
      // Region left of the curve, v=0 → v(now), over to the v-axis: ∫ u dv.
      traces.push({
        x: [0, ...cu, 0],
        y: [cv[0], ...cv, cv[cv.length - 1]],
        type: 'scatter', mode: 'none', fill: 'toself',
        fillcolor: 'rgba(245,158,11,0.32)',
        name: '∫ u dv  (left of the curve)',
        hoverinfo: 'skip',
      })
    }

    // The curve (u(t), v(t)) itself.
    traces.push({
      x: cu, y: cv,
      type: 'scatter', mode: 'lines',
      line: { color: '#1e3a8a', width: 3, shape: 'spline' },
      name: 'path (u(t), v(t))',
      hoverinfo: 'skip',
    })

    // Start point t = a.
    traces.push({
      x: [uArr[0]], y: [vArr[0]],
      type: 'scatter', mode: 'markers',
      marker: { size: 9, color: '#7c3aed', line: { color: '#fff', width: 2 } },
      showlegend: false, hoverinfo: 'text', text: [`t = a = ${fmt(a)}`],
    })
    // Current sweep position (== t = b once fully revealed).
    const tNow = a + (idx / N) * (b - a)
    traces.push({
      x: [cu[cu.length - 1]], y: [cv[cv.length - 1]],
      type: 'scatter', mode: 'markers',
      marker: { size: 10, color: '#dc2626', line: { color: '#fff', width: 2 } },
      showlegend: false, hoverinfo: 'text',
      text: [`t = ${fmt(tNow)}   u=${fmt(cu[cu.length - 1])}  v=${fmt(cv[cv.length - 1])}`],
    })

    // Dashed guide rectangle to the FULL endpoint — the "goal" the sweep
    // grows toward, making the rectangle-subtraction reading explicit.
    shapes.push({
      type: 'rect', x0: 0, x1: uArr[N], y0: 0, y1: vArr[N],
      line: { color: '#94a3b8', width: 1.5, dash: 'dot' },
      fillcolor: 'rgba(0,0,0,0)',
    })
  }

  // ── Formulas ──
  const uLatex = exprU.functionLatex || exprU.latex || 'u'
  const dvLatex = exprW.functionLatex || exprW.latex || 'w(x)'
  const substLatex = `u = ${uLatex}, \\qquad dv = ${dvLatex}\\,dx`
  const duFormulaLatex = `du = ${duLatex}\\,dx, \\qquad v = \\int_{${fmt(a)}}^{x} ${dvLatex}\\,dt`

  return (
    <div className="viz-layout">
      {/* ── Left panel ── */}
      <div className="viz-panel">
        <div className="viz-header">
          <span className="viz-title">Integration by Parts</span>
        </div>
        {unbounded&&<UnboundedNotice a={a} b={b} boundA={boundA} boundB={boundB} reach={reach} setReach={setReach} identity/>}

        {/* u(x) input */}
        <div className="viz-section">
          <label className="viz-field-label">u(x)</label>
          <MathInput value={exprU.latex} onInput={(latex, ascii, functionLatex) => setExprU({ latex, ascii, functionLatex })} autoFocus />
        </div>

        {/* dv/dx input */}
        <div className="viz-section">
          <label className="viz-field-label">dv/dx = w(x)  (so dv = w(x)·dx)</label>
          <MathInput value={exprW.latex} onInput={(latex, ascii, functionLatex) => setExprW({ latex, ascii, functionLatex })} />
          <div className="viz-hint">
            v(x) is built by integrating this numerically from a, choosing v(a) = 0.
          </div>
        </div>

        {/* Classic examples */}
        <div className="viz-section">
          <label className="viz-field-label">Classic examples</label>
          <div className="viz-chips">
            {EXAMPLES.map((ex) => (
              <button key={ex.label} className="viz-chip" onClick={() => loadExample(ex)} title={`Load ∫ ${ex.label} dx`}>
                {ex.label}
              </button>
            ))}
          </div>
          <div className="viz-hint">
            Tip — LIATE: prefer <strong>L</strong>ogarithmic, <strong>I</strong>nverse-trig, <strong>A</strong>lgebraic,
            {' '}<strong>T</strong>rigonometric, then <strong>E</strong>xponential for u — earlier in that list usually
            works best.
          </div>
        </div>

        {/* Interval */}
        <div className="viz-section">
          <div className="viz-row">
            <div className="viz-field">
              <label className="viz-field-label">x from (a)</label>
              <BoundInput className="viz-num-input" aria-label="Interval start a" value={boundA} step="any"
                onChange={setA} />
            </div>
            <div className="viz-field">
              <label className="viz-field-label">to (b)</label>
              <BoundInput className="viz-num-input" aria-label="Interval end b" value={boundB} step="any"
                onChange={setB} />
            </div>
          </div>
          {!validInterval && <div className="viz-warn">⚠ b must be greater than a.</div>}
        </div>

        {improper&&<div className="lesson-message" role="status">Original improper integral: {improper.converged?fmtNum(improper.value):'no convergent estimate found'}. The identity below is for the finite preview.</div>}
        {/* Formulas + results */}
        {ready && (
          <div className="viz-results">
            <div className="viz-formula">
              <TeX display math="\int u\,dv \;=\; uv - \int v\,du" />
            </div>
            <div className="viz-formula ibp-subst">
              <TeX display math={substLatex} />
              <TeX display math={duFormulaLatex} />
            </div>

            <div className="viz-result-row">
              <span className="viz-result-label">∫ u dv</span>
              <span className="viz-result-value accent">{fmtNum(lhs)}</span>
            </div>
            <div className="viz-result-row">
              <span className="viz-result-label">uv |ᵇₐ</span>
              <span className="viz-result-value">{fmtNum(boundary)}</span>
            </div>
            <div className="viz-result-row">
              <span className="viz-result-label">∫ v du</span>
              <span className="viz-result-value">{fmtNum(rhsInt)}</span>
            </div>
            <div className="viz-result-row">
              <span className="viz-result-label">Check: uv|ᵇₐ − ∫v du − ∫u dv</span>
              <span className={`viz-result-value ${checksOut ? 'good' : 'bad'}`}>{fmtNum(checkDiff)}</span>
            </div>
            <div className="viz-hint">
              {checksOut
                ? 'The two sides of the identity match (up to numerical rounding).'
                : 'These should match — try a smaller interval or a smoother dv.'}
            </div>

            {!monotonicPicture && (
              <div className="viz-warn">
                ⚠ u and v aren't both climbing the whole way across [a, b], so the picture below can't split
                cleanly into two regions here — the identity above still holds numerically.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Right side: the (u, v) rectangle-subtraction picture ── */}
      <div className="viz-main">
        <div className="viz-graph" onWheel={view.handleWheel}>
          <Plot
            data={traces}
            layout={cartesianLayout({ xMin, xMax, yMin, yMax, xTitle: 'u', yTitle: 'v', shapes, showLegend: true })}
            config={PLOT_CONFIG}
            onRelayout={view.handleRelayout}
            useResizeHandler
            style={{ width: '100%', height: '100%' }}
          />
          <ZoomControls onZoomIn={view.zoomIn} onZoomOut={view.zoomOut} onReset={view.resetView} />
        </div>

        <div className="viz-section viz-btn-row">
          <button className={`viz-btn ${playing ? 'playing' : ''}`} onClick={togglePlay} disabled={!ready}>
            {playing ? 'Pause' : 'Play sweep'}
          </button>
          <button className="viz-btn" onClick={resetSweep} disabled={!ready}>Reset</button>
        </div>

        <VizSlider
          label={<>Sweep t = <strong>{ready ? fmt(a + reveal * (b - a)) : '—'}</strong></>}
          min={0} max={1} step={0.002} value={reveal}
          onChange={onSweepSlider}
          leftLabel={fmt(a)} rightLabel={fmt(b)}
        />

        <div className="ibp-legend">
          <span><span className="ibp-swatch" style={{ background: graphColor('rgba(56,189,248,0.7)', settings) }} /> ∫v du — area under the curve</span>
          <span><span className="ibp-swatch" style={{ background: graphColor('rgba(245,158,11,0.7)', settings) }} /> ∫u dv — area left of the curve</span>
          <span><span className="ibp-swatch" style={{ background: graphColor('#1e3a8a', settings) }} /> path traced by (u(t), v(t))</span>
        </div>
      </div>
    </div>
  )
}
