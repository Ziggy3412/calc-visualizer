// Sample locations that determine the heights of finite slices.
export function contactPoints(f, a, b, count, rule = 'midpoint') {
  const points = []
  if (!f || count < 1) return points
  for (let i = 0; i < (rule === 'trapezoid' ? count + 1 : count); i++) {
    const offset = rule === 'right' ? 1 : rule === 'midpoint' ? 0.5 : 0
    const x = a + (i + offset) * (b - a) / count
    const y = f(x)
    if (Number.isFinite(y)) points.push([x, y])
  }
  return points
}
export function contactTrace(points) {
  return { x: points.map(p => p[0]), y: points.map(p => p[1]), type: 'scatter', mode: 'markers', name: 'Touch points', showlegend: false,
    marker: { size: 10, color: '#7c3aed', line: { color: '#ffffff', width: 2 } },
    hovertemplate: 'Sample: (%{x:.5g}, %{y:.5g})<extra></extra>' }
}
