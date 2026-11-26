import { useMemo, useState } from 'react'
import BoundInput from '../components/BoundInput'
import MathInput from '../components/MathInput'
import Plot from '../components/ThemedPlot'
import TeX from '../components/TeX'
import VizSlider from '../components/VizSlider'
import { cartesianLayout, PLOT_CONFIG } from '../shared/plotDefaults'
import { formatBound } from '../shared/infinity'
import { analyzeInfinity, describeValue, formatPower, formatValue, makeInfinityEval, verdictText } from '../shared/infiniteLimit'

const TABLE_POWERS = [1, 2, 3, 4, 5, 6, 8, 10, 12]
const GRAPH_POWERS = Array.from({ length: 241 }, (_, i) => i * 0.05) // x = 10^0 … 10^12
const COLORS = ['#2d70b3', '#dc2626', '#388c46']

export default function InfiniteLimits({ target, onTarget, entries, onEntries }) {
  const [power, setPower] = useState(6)
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
      curve: GRAPH_POWERS.map(k => f(sign, k)),
    }]
  }), [entries, sign])

  const probe = sign * 10 ** power
  // Use a log scale for y when every curve stays on one side of 0 and spans many
  // powers of ten, so growth like x or e^x stays readable instead of hugging the
  // axis and then shooting off at the end. All-negative curves are drawn by size
  // with a "−" on the labels, the same way the x-axis handles x → −∞.
  const allValues = functions.flatMap(entry => entry.curve.filter(Number.isFinite))
  const spansDecades = list => list.length > 0 && Math.max(...list) / Math.min(...list) > 1e4
  const ySign = allValues.length > 0 && allValues.every(v => v > 0) ? 1 : allValues.length > 0 && allValues.every(v => v < 0) ? -1 : 0
  const logY = ySign !== 0 && functions.every(entry => entry.result.kind === 'infinity') && spansDecades(allValues.map(Math.abs))
  const shownY = v => (Number.isFinite(v) ? (logY ? Math.abs(v) : v) : null)

  const traces = functions.flatMap(entry => {
    const y = entry.f(sign, power)
    return [
      { x: GRAPH_POWERS.map(k => 10 ** k), y: entry.curve.map(shownY), customdata: GRAPH_POWERS.map((k, i) => [formatValue(sign * 10 ** k), formatValue(entry.curve[i])]), type: 'scatter', mode: 'lines', line: { color: entry.color, width: 3 }, name: entry.expr, connectgaps: false, hovertemplate: 'x = %{customdata[0]}<br>f(x) = %{customdata[1]}<extra></extra>' },
      ...(Number.isFinite(y) ? [{ x: [10 ** power], y: [shownY(y)], type: 'scatter', mode: 'markers', marker: { size: 11, color: '#7c3aed' }, showlegend: false, hoverinfo: 'skip' }] : []),
    ]
  })
  const limitLines = functions.filter(entry => entry.result.kind === 'limit')
  const layout = cartesianLayout({
    xMin: 0, xMax: 1, yMin: 0, yMax: 1,
    xTitle: sign > 0 ? 'x (log scale)' : 'x (log scale, negative values)',
    yTitle: logY ? (ySign < 0 ? 'f(x) (log scale, negative values)' : 'f(x) (log scale)') : 'f(x)',
    showLegend: functions.length > 1,
    shapes: limitLines.map(entry => ({ type: 'line', xref: 'paper', x0: 0, x1: 1, y0: entry.result.value, y1: entry.result.value, line: { color: entry.color, width: 1.5, dash: 'dash' } })),
    annotations: limitLines.map(entry => ({ xref: 'paper', x: 0.01, xanchor: 'left', y: entry.result.value, yanchor: 'bottom', text: `y = ${describeValue(entry.result.value).name ?? describeValue(entry.result.value).text.replace('≈ ', '')}`, showarrow: false, font: { size: 11, color: entry.color } })),
  })
  // Like a normal number line, x increases to the right: for x → −∞ that puts −10¹² on the left.
  layout.xaxis = { ...layout.xaxis, type: 'log', range: sign > 0 ? [-0.15, 12.15] : [12.15, -0.15], autorange: false, tickprefix: sign < 0 ? '−' : '', exponentformat: 'power', dtick: 1, zeroline: false, automargin: true }
  layout.yaxis = { ...layout.yaxis, type: logY ? 'log' : 'linear', range: undefined, autorange: true, exponentformat: 'power', tickprefix: logY && ySign < 0 ? '−' : '', automargin: true }
  if (logY && ySign < 0) layout.yaxis.autorange = 'reversed' // bigger negative numbers go down, as on a normal graph
  if (logY) { layout.shapes = []; layout.annotations = [] }

  return <div className="viz-layout"><div className="viz-panel">
    <div className="viz-header"><span className="viz-title">lim x →</span><BoundInput aria-label="Limit target" className="viz-num-input limit-target-input" value={target} onChange={onTarget} /></div>
    <div className="viz-section viz-hint">Infinity is a direction, not a number you can plug in, so this looks at what f(x) does as x gets larger and larger{sign < 0 ? ' in the negative direction' : ''}. The answer below is read from the numbers. It is a strong hint, not a proof.</div>
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
    <div className="viz-graph"><Plot data={traces} layout={layout} config={{ ...PLOT_CONFIG, doubleClick: 'reset' }} useResizeHandler style={{ width: '100%', height: '100%' }} /></div>
    {sign > 0
      ? <VizSlider label={<>Explore x = <strong>{formatValue(probe)}</strong></>} min={0} max={12} step={0.1} value={power} onChange={setPower} leftLabel={formatPower(1, 0)} rightLabel={formatPower(1, 12)} />
      : <VizSlider label={<>Explore x = <strong>{formatValue(probe)}</strong></>} min={-12} max={0} step={0.1} value={-power} onChange={v => setPower(-v)} leftLabel={formatPower(-1, 12)} rightLabel={formatPower(-1, 0)} />}
  </div></div>
}
