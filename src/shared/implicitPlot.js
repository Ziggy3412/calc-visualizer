import * as math from 'mathjs'
import { isolatedZeros } from './implicitPoints.js'

export function buildImplicitTrace(expr, xMin, xMax, yMin, yMax, color, gridN = 160) {
  const idx = expr.indexOf('=')
  if (idx < 0) return null
  const lhs = expr.slice(0, idx)
  const rhs = expr.slice(idx + 1)
  let f
  // Combine into one expression so we evaluate just once per grid cell.
  try { f = math.compile(`(${lhs}) - (${rhs})`) } catch { return null }

  const xs = [], ys = [], z = []
  for (let i = 0; i <= gridN; i++) xs.push(xMin + (i * (xMax - xMin)) / gridN)
  for (let j = 0; j <= gridN; j++) ys.push(yMin + (j * (yMax - yMin)) / gridN)
  for (let j = 0; j <= gridN; j++) {
    const row = []
    for (let i = 0; i <= gridN; i++) {
      let v = null
      try { const t = f.evaluate({ x: xs[i], y: ys[j] }); if (Number.isFinite(t)) v = t } catch { /* undefined */ }
      row.push(v)
    }
    z.push(row)
  }

  const points = isolatedZeros((x,y) => f.evaluate({x,y}), xs, ys, z)
  return [{
    type: 'contour',
    x: xs, y: ys, z,
    // 'constraint' with operation '=' draws only the boundary line at value 0.
    contours: { type: 'constraint', operation: '=', value: 0 },
    line: { color, width: 3 },
    fillcolor: 'rgba(0,0,0,0)',
    showscale: false,
    hoverinfo: 'skip',
    name: expr,
    showlegend: true,
  }, ...(points.length ? [{ type: 'scatter', mode: 'markers', x: points.map(p=>p[0]), y: points.map(p=>p[1]), marker: { color, size: 10 }, name: expr, showlegend: false, hovertemplate: '(%{x:.6g}, %{y:.6g})<extra></extra>' }] : [])]
}

