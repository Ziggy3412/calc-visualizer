import NumberInput from '../components/NumberInput'
import { taylorFocusBounds, zoomBoundsAt } from '../shared/taylorView'
import { functionBounds } from '../shared/graphFit'
import { dismissDialogOutside } from '../shared/dialogDismiss'
import { useAppearance } from '../shared/appearance'
import { graphColor } from '../shared/graphColors'
import { useState, useEffect, useMemo, useRef } from 'react'
import Plot from '../components/ThemedPlot'
import * as math from 'mathjs'
import TeX from '../components/TeX'
import MathInput from '../components/MathInput'
import ZoomControls from '../components/ZoomControls'
import VizSlider from '../components/VizSlider'
import usePlotView from '../shared/usePlotView'
import { sampleFunction, makeEval } from '../shared/numerics'
import { cartesianLayout, PLOT_CONFIG } from '../shared/plotDefaults'
import './Taylor.css'

// Evaluate the polynomial Σ c_k (x-a)^k using only the first (degree+1) terms.
function evalPoly(coeffs, a, degree, x) {
  let s = 0
  const top = Math.min(degree, coeffs.length - 1)
  for (let k = 0; k <= top; k++) {
    const c = coeffs[k]
    if (Number.isFinite(c) && c !== 0) s += c * Math.pow(x - a, k)
  }
  return s
}

// Significant digits preserve small higher-order terms instead of rounding
// them to zero. Scientific notation remains readable in a full expansion.
function fmtCoeff(x) {
  const value = Number(x.toPrecision(6)).toString()
  const [mantissa, exponent] = value.split('e')
  return exponent === undefined ? value : `${mantissa}\\times 10^{${Number(exponent)}}`
}

function buildTerms(coeffs, a, degree) {
  const terms = []
  for (let k = 0; k <= Math.min(degree, coeffs.length - 1); k++) {
    const c = coeffs[k]
    if (!Number.isFinite(c) || c === 0) continue
    let base = ''
    if (k > 0) {
      if (a === 0) base = k === 1 ? 'x' : `x^{${k}}`
      else {
        const inner = a > 0 ? `x - ${fmtCoeff(a)}` : `x + ${fmtCoeff(-a)}`
        base = k === 1 ? `(${inner})` : `(${inner})^{${k}}`
      }
    }
    const magnitude = Math.abs(c)
    const coefficient = base && magnitude === 1 ? '' : fmtCoeff(magnitude)
    const sign = c < 0 ? '-' : terms.length ? '+' : ''
    terms.push({ degree: k, latex: `${sign} ${coefficient}${base ? `\\,${base}` : ''}` })
  }
  return terms.length ? terms : [{ degree: 0, latex: '0' }]
}

function Polynomial({ terms, degree }) {
  return <div className="tay-polynomial" aria-label={`Full Taylor polynomial of degree ${degree}`}>
    <span className="tay-polynomial-prefix"><TeX math={`P_{${degree}}(x) =`} /></span>
    {terms.map(term => <span className="tay-polynomial-term" key={term.degree}><TeX math={term.latex} /></span>)}
  </div>
}

const MAX_DEGREE = 50

// Classic test functions for one-click loading. `ascii` is what math.js
// evaluates (natural log is "log" in math.js), `latex` is what's displayed.
const EXAMPLES = [
  { label: 'sin(x)',   latex: '\\sin(x)',      ascii: 'sin(x)' },
  { label: 'cos(x)',   latex: '\\cos(x)',      ascii: 'cos(x)' },
  { label: 'e^x',      latex: 'e^x',           ascii: 'e^x' },
  { label: '1/(1-x)',  latex: '\\frac{1}{1-x}', ascii: '1/(1-x)' },
  { label: 'ln(1+x)',  latex: '\\ln(1+x)',     ascii: 'log(1+x)' },
]

export default function Taylor({ initial = {} }) {
  const { settings } = useAppearance()
  const polynomialDialog = useRef(null)
  const [expr, setExpr] = useState(initial.expr ?? { latex: '', ascii: '' })
  const [center, setCenter] = useState(initial.center ?? 0)     // the center point `a`
  const [nTarget, setNTarget] = useState(initial.degree ?? 3)   // term count from the slider
  const nShown = nTarget
  const [calculation, setCalculation] = useState(null)

  // Symbolic derivatives can grow rapidly. Keep them off the UI thread and
  // cancel obsolete work while typing, changing the center, or moving degree.
  useEffect(() => {
    if (!expr.ascii.trim()) return
    let worker
    let deadline
    const request = { expression: expr.ascii, center, degree: nTarget }
    const debounce = setTimeout(() => {
      worker = new Worker(new URL('../workers/taylor.js', import.meta.url), { type: 'module' })
      worker.onmessage = ({ data }) => {
        clearTimeout(deadline)
        setCalculation(data)
        worker.terminate()
      }
      worker.onerror = () => {
        clearTimeout(deadline)
        setCalculation({ ...request, error: 'Could not calculate this expansion. Try a lower degree.' })
        worker.terminate()
      }
      deadline = setTimeout(() => {
        worker.terminate()
        setCalculation({ ...request, error: 'This expansion is taking too long. Try a lower degree or a simpler function.' })
      }, 8000)
      worker.postMessage(request)
    }, 180)
    return () => { clearTimeout(debounce); clearTimeout(deadline); worker?.terminate() }
  }, [expr.ascii, center, nTarget])
  const currentCalculation = calculation?.expression === expr.ascii && calculation?.center === center && calculation?.degree === nTarget ? calculation : null
  const coeffs = useMemo(() => currentCalculation?.coeffs || [], [currentCalculation])
  const calculating = !!expr.ascii.trim() && !currentCalculation

  // Compile the true function f(x) into a fast evaluator.
  const trueFn = useMemo(() => {
    if (!expr.ascii.trim()) return null
    try { return makeEval(math.compile(expr.ascii)) } catch { return null }
  }, [expr.ascii])

  // View centered on the center point `a` (x) and on f(a) (y).
  let yCenterBase = 0
  if (trueFn) { const v = trueFn(center); if (Number.isFinite(v)) yCenterBase = v }
  const fittedFunctions = [trueFn, ...(coeffs.length ? [x => evalPoly(coeffs, center, nShown, x)] : [])]
  const graphBounds = useMemo(() => taylorFocusBounds(trueFn, center), [trueFn, center])
  const view = usePlotView(4, 0, 0)
  const { xMin, xMax, yMin, yMax } = view
  const zoomNearCenter = factor => view.fitBounds(zoomBoundsAt({xMin,xMax,yMin,yMax},factor,center,yCenterBase))
  const fitBothCurves = () => view.fitBounds(functionBounds(fittedFunctions,xMin,xMax,{padX:false}))

  const traces = []
  const shapes = []

  if (trueFn) {
    const breakAt = yMax - yMin
    // True curve — blue, drawn thick.
    const base = sampleFunction(trueFn, xMin, xMax, 3500, breakAt)
    traces.push({
      x: base.xs, y: base.ys,
      type: 'scatter', mode: 'lines',
      name: 'f(x)',
      line: { color: '#2563eb', width: 3, shape: 'spline' },
      connectgaps: false,
    })

    // Polynomial tails may leave the viewing window without flattening the
    // local comparison or changing the viewport as the degree increases.
    if (coeffs.length) {
      const polyFn = x => evalPoly(coeffs, center, nShown, x)
      const poly = sampleFunction(polyFn, xMin, xMax, 3500, breakAt)
      traces.push({
        x: poly.xs, y: poly.ys,
        type: 'scatter', mode: 'lines',
        name: `P${nShown}(x)`,
        line: { color: '#dc2626', width: 3, shape: 'spline' },
        connectgaps: false,
      })
    }

    // Mark the center point a on the true curve (purple dot).
    const yA = trueFn(center)
    if (Number.isFinite(yA)) {
      traces.push({
        x: [center], y: [yA],
        type: 'scatter', mode: 'markers',
        marker: { size: 12, color: '#7c3aed', line: { color: '#fff', width: 2 } },
        showlegend: false,
        hoverinfo: 'text',
        text: [`center a = ${center}`],
      })
      // Vertical dashed line at the center.
      shapes.push({
        type: 'line', x0: center, x1: center, y0: 0, y1: 1, yref: 'paper',
        line: { color: '#7c3aed', width: 1.5, dash: 'dash' },
      })
    }
  }

  const polynomialTerms = useMemo(() => buildTerms(coeffs, center, nShown), [coeffs, center, nShown])

  return (
    <div className="viz-layout">
      {/* ── Left panel ── */}
      <div className="viz-panel">
        <div className="viz-header">
          <span className="viz-title">Taylor / Maclaurin Series</span>
        </div>

        {/* f(x) input */}
        <div className="viz-section">
          <label className="viz-field-label">f(x)</label>
          <MathInput
            value={expr.latex}
            onInput={(latex, ascii, functionLatex, relation) => setExpr({ latex, ascii, functionLatex, boundedBranch: !!relation?.domain })}
            autoFocus
          />
        </div>

        {/* Quick examples — clicking one fills the input above */}
        <div className="viz-section">
          <label className="viz-field-label">Classic examples</label>
          <div className="viz-chips">
            {EXAMPLES.map(ex => (
              <button
                key={ex.label}
                className="viz-chip"
                onClick={() => setExpr({ latex: ex.latex, ascii: ex.ascii })}
                title={`Load ${ex.label}`}
              >
                <TeX math={ex.latex} />
              </button>
            ))}
          </div>
        </div>

        {/* Center point a */}
        <div className="viz-section">
          <label className="viz-field-label">Center point a (0 = Maclaurin)</label>
          <NumberInput
            className="viz-num-input"
            aria-label="Taylor center" value={center}
            step="any"
            onChange={setCenter}
          />
        </div>

        {calculating && <div className="viz-section viz-hint" role="status">Calculating degree {nTarget}… You can keep editing.</div>}
        {currentCalculation?.error && <div className="viz-section viz-hint" role="status">{currentCalculation.error}</div>}
        {expr.boundedBranch && <div className="viz-section viz-hint">The series approximates the selected branch near its center. Convergence can be slow at the branch endpoints.</div>}
        {/* Current polynomial formula */}
        {coeffs.length > 0 && (
          <div className="viz-section">

            <div className="tay-legend">
              <span><span className="tay-swatch" style={{ background: graphColor('#2563eb', settings) }} /> f(x) — true curve</span>
              <span><span className="tay-swatch" style={{ background: graphColor('#dc2626', settings) }} /> P{nShown}(x) — approximation</span>
              <span><span className="tay-swatch" style={{ background: graphColor('#7c3aed', settings) }} /> center a = {center}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Right side: graph + slider ── */}
      <div className="viz-main">
        <div className="viz-graph">
          <Plot
            data={traces}
            layout={cartesianLayout({ xMin, xMax, yMin, yMax, shapes, showLegend: true })}
            config={{...PLOT_CONFIG,scrollZoom:true}}
            onRelayout={view.handleRelayout}
            useResizeHandler
            style={{ width: '100%', height: '100%' }}
          />
          <ZoomControls onZoomIn={() => zoomNearCenter(.82)} onZoomOut={() => zoomNearCenter(1/.82)} onReset={() => view.fitBounds(graphBounds)} />
        </div>

        <div className="viz-btn-row tay-view-controls" role="group" aria-label="Taylor graph view">
          <button className="viz-btn" onClick={() => view.fitBounds(graphBounds)}>Near center</button>
          <button className="viz-btn" onClick={fitBothCurves}>Fit both curves</button>
          <span className="viz-hint">Manual view — degree changes keep your zoom · Scroll to zoom · Drag to pan</span>
        </div>
        {coeffs.length > 0 && <section className="tay-expansion" aria-label="Taylor expansion">
          <div className="tay-expansion-heading">
            <span>Polynomial · degree {nShown}</span>
            <button className="viz-btn" onClick={() => polynomialDialog.current.showModal()}>Expand polynomial</button>
          </div>
          <Polynomial terms={polynomialTerms} degree={nShown} />
        </section>}

        <dialog onPointerDown={dismissDialogOutside} ref={polynomialDialog} className="tay-polynomial-dialog" aria-label="Full Taylor expansion">
          <div className="tay-dialog-header"><h2>Taylor polynomial</h2><button className="viz-btn" onClick={() => polynomialDialog.current.close()}>Close expansion</button></div>
          <div className="tay-dialog-context"><TeX math={`a = ${fmtCoeff(center)}, \\quad n = ${nShown}`} /></div>
          <div className="tay-general-form"><TeX math={String.raw`P_n(x) = \sum_{k=0}^{n} \frac{f^{(k)}(a)}{k!}(x-a)^k`} /></div>
          <Polynomial terms={polynomialTerms} degree={nShown} />
          <p className="viz-hint">Coefficients shown to six significant digits. The graph uses the unrounded values.</p>
        </dialog>

        {/* Polynomial degree slider */}
        <VizSlider
          label={<>Degree n = <strong>{nTarget}</strong></>}
          min={0} max={MAX_DEGREE} step={1} value={nTarget}
          onChange={setNTarget}
        />
      </div>
    </div>
  )
}
