export function graphColor(value, settings) {
  const groups = [
    ['curve1', ['#2d70b3', '#2563eb', '#3b82f6', '#1e3a8a', '#000000']],
    ['curve2', ['#dc2626', '#ef4444', '#c74440']], ['curve3', ['#7c3aed', '#6d28d9', '#9333ea', '#a855f7']],
    ['curve4', ['#16a34a', '#388c46', '#10b981']], ['curve5', ['#f59e0b', '#d97706', '#ea580c', '#b45309']],
    ['curve6', ['#0891b2', '#38bdf8']], ['graphBackground', ['#ffffff', '#fff']],
    ['graphText', ['#1e293b', '#64748b', '#94a3b8', '#cbd5e1']],
  ]
  const lower = value.toLowerCase()
  for (const [key, values] of groups) if (values.includes(lower)) return settings[key]
  const rgba = lower.match(/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/)
  if (rgba) {
    const hex = '#' + rgba.slice(1,4).map(v => Number(v).toString(16).padStart(2, '0')).join('')
    const mapped = graphColor(hex, settings)
    if (mapped !== hex) return `rgba(${[1,3,5].map(i => parseInt(mapped.slice(i, i + 2), 16)).join(',')},${rgba[4]})`
  }
  return value
}
