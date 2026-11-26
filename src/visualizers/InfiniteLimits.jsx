import { useCallback, useMemo, useState } from 'react'
import BoundInput from '../components/BoundInput'
import MathInput from '../components/MathInput'
import Plot from '../components/ThemedPlot'
import TeX from '../components/TeX'
import VizSlider from '../components/VizSlider'
import ZoomControls from '../components/ZoomControls'
import { cartesianLayout, PLOT_CONFIG } from '../shared/plotDefaults'
import { formatBound } from '../shared/infinity'
import { analyzeInfinity, describeValue, formatPower, formatValue, makeInfinityEval, niceYRange, sampleRange, sampleWindow, verdictText } from '../shared/infiniteLimit'

const TABLE_POWERS = [1, 2, 3, 4, 5, 6, 8, 10, 12]
const COLORS = ['#2d70b3', '#dc2626', '#388c46']

// Leave a gap instead of drawing a vertical line across an asymptote (like
// 1/x at 0): break the curve where it jumps much more than the visible height.
function breakJumps(ys, height) {
  return ys.map((v, i) => {
    if (!Number.isFinite(v)) return null
    const prev = ys[i - 1]
    return i > 0 && Number.isFinite(prev) && Math.abs(v - prev) > 3 * height ? null : v
  })
}

export default function InfiniteLimits({ target, onTarget, entries, onEntries }) {
  const [power, setPower] = useState(2)
  const sign = target === Infinity ? 1 : -1
  const to = formatBound(target)

  // Expensive part (high-precision evaluation), redone only when the inputs change.
  const functions = useMemo(() => entries.flatMap((entry, i) => {
    if (!entry.expr.trim() || entry.expr.includes('=')) return []
    const f = makeInfinityEval(entry.expr)
    if (!f) return []
    const result = analyzeInfinity(f, sign)
    return [{
      ...entry,
      f,
      color: entry.color || COLORS[i % COLORS.length],
      result,
      verdict: verdictText(result, sign),
      rows: TABLE_POWERS.map(k => ({ k, value: formatValue(f.exact(sign, k)) })),
    }]
  }), [entries, sign])

  // A normal graph from 0 out to x = ±10^power. Zooming out with the slider shows
  // the function's long-run behavior with its real shape (no log scales).
  const edge = sign * 10 ** power
  const home = useMemo(() => functions.map(entry => sampleWindow(entry.f, sign, power)), [functions, sign, power])
  const limitValues = functions.filter(entry => entry.result.kind === 'limit').map(entry => entry.result.value)
  const homeY = niceYRange(home.flatMap(sample => sample.ys), limitValues)
  const homeView = { x: sign > 0 ? [0, edge] : [edge, 0], y: homeY }

  // Dragging, scrolling or the zoom buttons move away from the home view; the
  // curve is redrawn for whatever part of the plane is on screen. Moving the
  // slider or changing the function goes back home.
  const viewKey = `${sign}|${power}|${functions.map(entry => entry.expr).join(';')}`
  const [moved, setMoved] = useState(null)
  const view = moved?.key === viewKey ? moved : homeView
  const setView = useCallback(next => setMoved({ ...next, key: viewKey }), [viewKey])
  const samples = useMemo(
    () => (moved?.key === viewKey ? functions.map(entry => sampleRange(entry.f, moved.x[0], moved.x[1])) : home),
    [moved, viewKey, functions, home],
  )
  const scale = factor => {
    const [x0, x1] = view.x, [y0, y1] = view.y
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2
    setView({ x: [cx - (cx - x0) * factor, cx + (x1 - cx) * factor], y: [cy - (cy - y0) * factor, cy + (y1 - cy) * factor] })
  }
  const handleRelayout = update => {
    if (update['xaxis.autorange'] || update['yaxis.autorange']) { setMoved(null); return }
    const x = update['xaxis.range'] ?? [update['xaxis.range[0]'], update['xaxis.range[1]']]
    const y = update['yaxis.range'] ?? [update['yaxis.range[0]'], update['yaxis.range[1]']]
    if (x.every(Number.isFinite) || y.every(Number.isFinite)) setView({ x: x.every(Number.isFinite) ? x : view.x, y: y.every(Number.isFinite) ? y : view.y })
  }
  const handleWheel = event => { event.preventDefault(); scale(event.deltaY < 0 ? 0.85 : 1 / 0.85) }

  const traces = functions.flatMap((entry, i) => {
    const { xs, ys } = samples[i]
    const y = home[i].ys.at(-1) // the purple dot marks the slider's x = ±10^power
    return [
      { x: xs, y: breakJumps(ys, view.y[1] - view.y[0]), customdata: xs.map((x, j) => [formatValue(x), formatValue(ys[j])]), type: 'scatter', mode: 'lines', line: { color: entry.color, width: 3 }, name: entry.expr, connectgaps: false, hovertemplate: 'x = %{customdata[0]}<br>f(x) = %{customdata[1]}<extra></extra>' },
      ...(Number.isFinite(y) ? [{ x: [edge], y: [y], type: 'scatter', mode: 'markers', marker: { size: 11, color: '#7c3aed' }, showlegend: false, hovertemplate: `x = ${formatValue(edge)}<br>f(x) = ${formatValue(y)}<extra></extra>` }] : []),
    ]
  })
  const limitLines = functions.filter(entry => entry.result.kind === 'limit')
  const layout = cartesianLayout({
    xMin: view.x[0], xMax: view.x[1], yMin: view.y[0], yMax: view.y[1],
    xTitle: 'x', yTitle: 'f(x)',
    showLegend: functions.length > 1,
    shapes: limitLines.map(entry => ({ type: 'line', xref: 'paper', x0: 0, x1: 1, y0: entry.result.value, y1: entry.result.value, line: { color: entry.color, width: 1.5, dash: 'dash' } })),
    annotations: limitLines.map(entry => ({ xref: 'paper', x: sign > 0 ? 0.99 : 0.01, xanchor: sign > 0 ? 'right' : 'left', y: entry.result.value, yanchor: 'bottom', text: `y = ${describeValue(entry.result.value).name ?? describeValue(entry.result.value).text.replace('≈ ', '')}`, showarrow: false, font: { size: 11, color: entry.color } })),
  })
  layout.xaxis = { ...layout.xaxis, exponentformat: 'power', automargin: true }
  layout.yaxis = { ...layout.yaxis, exponentformat: 'power', automargin: true }

  return <div className="viz-layout"><div className="viz-panel">
    <div className="viz-header"><span className="viz-title">lim x →</span><BoundInput aria-label="Limit target" className="viz-num-input limit-target-input" value={target} onChange={onTarget} /></div>
    <div className="viz-section viz-hint">Infinity is a direction, not a number you can plug in, so this looks at what f(x) does as x gets larger and larger{sign < 0 ? ' in the negative direction' : ''}. Drag the slider to zoom out and watch where the graph heads. The answer below is read from the numbers. It is a strong hint, not a proof.</div>
    {entries.map(entry => <div className="viz-section" key={entry.id}><MathInput value={entry.latex} onInput={(latex, ascii) => onEntries(prev => prev.map(e => (e.id === entry.id ? { ...e, latex, expr: ascii } : e)))} /></div>)}
    <div className="viz-section"><button className="viz-btn" onClick={() => onEntries(prev => [...prev, { id: crypto.randomUUID(), expr: '', latex: '' }])}>Add function</button></div>
    {functions.map(entry => <div className="viz-section" key={entry.id}>
      <strong className="viz-title">{entry.latex ? <TeX math={`f(x) = \\displaystyle ${entry.latex}`} /> : `f(x) = ${entry.expr}`}</strong>
      <div className={`infinity-verdict infinity-verdict-${entry.result.kind}`} role="status">
        <span className="infinity-verdict-label">As x → {to}</span>
        <strong>{entry.verdict.headline}</strong>
        <span>{entry.verdict.detail}</span>
      </div>
      <table className="limit-table infinity-table"><thead><tr><th>x</th><th>f(x)</th></tr></thead>
        <tbody>{entry.rows.map(row => <tr key={row.k}><td>{formatPower(sign, row.k)}</td><td>{row.value}</td></tr>)}</tbody>
      </table>
    </div>)}
  </div><div className="viz-main">
    <div className="viz-graph" onWheel={handleWheel}>
      <Plot data={traces} layout={layout} config={{ ...PLOT_CONFIG, doubleClick: 'autosize' }} onRelayout={handleRelayout} useResizeHandler style={{ width: '100%', height: '100%' }} />
      <ZoomControls onZoomIn={() => scale(0.7)} onZoomOut={() => scale(1 / 0.7)} onReset={() => setMoved(null)} />
    </div>
    {sign > 0
      ? <VizSlider label={<>Zoom out: showing x from 0 to <strong>{formatValue(edge)}</strong></>} min={1} max={12} step={0.1} value={power} onChange={setPower} leftLabel={formatPower(1, 1)} rightLabel={formatPower(1, 12)} />
      : <VizSlider label={<>Zoom out: showing x from <strong>{formatValue(edge)}</strong> to 0</>} min={-12} max={-1} step={0.1} value={-power} onChange={v => setPower(-v)} leftLabel={formatPower(-1, 12)} rightLabel={formatPower(-1, 1)} />}
  </div></div>
}
