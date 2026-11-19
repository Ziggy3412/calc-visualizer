import { graphColor } from '../shared/graphColors'
import Plot from 'react-plotly.js'
import { useAppearance } from '../shared/appearance'

function recolor(value, settings) {
  if (typeof value === 'string') return graphColor(value, settings)
  if (Array.isArray(value)) {
    if (!value.length || typeof value[0] === 'number' || value[0] === null) return value
    return value.map(item => recolor(item, settings))
  }
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, recolor(item, settings)]))
  return value
}
export default function ThemedPlot({ preserveTraceColors = false, ...props }) {
  const { settings } = useAppearance()
  const data = (props.data || []).map(trace => {
    const { drawingColor, ...plotTrace } = trace
    const result = preserveTraceColors ? { ...plotTrace } : recolor(plotTrace, settings)
    if (drawingColor) {
      if (result.line) result.line = { ...result.line, color: drawingColor }
      if (result.colorscale) result.colorscale = [[0, drawingColor], [1, drawingColor]]
    }
    if (result.line?.width >= 2) result.line = { ...result.line, width: settings.lineWidth }
    return result
  })
  const layout = recolor(props.layout || {}, settings)
  layout.paper_bgcolor = settings.graphBackground
  layout.plot_bgcolor = settings.graphBackground
  layout.font = { ...layout.font, color: settings.graphText, size: 12 * settings.textSize / 14 }
  for (const name of ['xaxis', 'yaxis']) if (layout[name]) layout[name] = { ...layout[name], showgrid: settings.showGrid, zeroline: settings.showAxes, gridcolor: settings.gridColor, zerolinecolor: settings.axisColor, tickfont: { color: settings.graphText }, showticklabels: settings.showAxes }
  if (layout.polar) {
    layout.polar.bgcolor = settings.graphBackground
    for (const name of ['radialaxis', 'angularaxis']) layout.polar[name] = { ...layout.polar[name], showgrid: settings.showGrid, gridcolor: settings.gridColor, tickfont: { color: settings.graphText }, showticklabels: settings.showAxes }
  }
  if (layout.legend) layout.legend = { ...layout.legend, bgcolor: settings.graphBackground, font: { color: settings.graphText } }
  return <Plot {...props} data={data} layout={layout} />
}
