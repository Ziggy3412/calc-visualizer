const m = String.raw
const line = (name, fn, a, b, color = '#2d70b3') => {
  const x = Array.from({ length: 301 }, (_, i) => a + (b - a) * i / 300)
  return { type: 'scatter', mode: 'lines', name, x, y: x.map(fn), line: { color, width: 3 } }
}
const points = (name, x, y) => ({ type: 'scatter', mode: 'markers', name, x, y, marker: { color: '#7c3aed', size: 9 } })
export const CUSTOM_PROOF_VISUALS = ['fermat', 'mvt', 'monotonicity', 'ftc2', 'parts', 'geometric', 'p-series', 'absolute']
export function proofVisual(id, value) {
  if (id === 'fermat') {
    const h = value, f = x => 1 - x * x
    return { traces: [line('f(x) = 1 − x²', f, -1.2, 1.2), line('Left secant: slope +h', x => 1 + h * x, -1.2, 1.2, '#dc2626'), line('Right secant: slope −h', x => 1 - h * x, -1.2, 1.2, '#388c46'), points('Extremum and nearby points', [-h, 0, h], [f(h), 1, f(h)])], formula: m`\frac{f(0+h)-f(0)}h=-h,\qquad\frac{f(0-h)-f(0)}{-h}=h`, caption: `h=${h.toFixed(2)}: left slope = +${h.toFixed(2)}, right slope = −${h.toFixed(2)}. Shrink h: both approach 0 from opposite sides.`, range: [-1.2, 1.2, -0.6, 2.1] }
  }
  if (id === 'mvt') {
    const b = value, c = b / 2
    return { traces: [line('f(x) = x²', x => x * x, 0, b), line('Secant ℓ(x) = bx', x => b * x, 0, b, '#dc2626'), line('g = f − ℓ', x => x * x - b * x, 0, b, '#388c46'), line('Horizontal tangent to g at c', () => -b * b / 4, 0, b, '#7c3aed'), points('g(0) = g(b) = 0', [0, b], [0, 0])], formula: m`g(x)=x^2-bx,\quad g(0)=g(b)=0,\quad g'(b/2)=0`, caption: `Subtracting the red secant makes the green curve’s endpoint heights equal. Rolle gives c=b/2=${c.toFixed(2)}; then f′(c)=b=${b.toFixed(2)}.`, range: [-0.1, b + 0.1, -b * b / 3, b * b * 1.1] }
  }
  if (id === 'monotonicity') {
    const b = value, a = 0.3, f = x => x ** 3, slope = (f(b) - f(a)) / (b - a), c = Math.sqrt(slope / 3)
    return { traces: [line('f(x) = x³', f, 0, 2.2), line('Secant between x₁ and x₂', x => f(a) + slope * (x - a), a, b, '#dc2626'), points('Endpoints', [a, b], [f(a), f(b)]), points('MVT point c', [c], [f(c)])], formula: m`f(x_2)-f(x_1)=f'(c)(x_2-x_1)>0`, caption: `x₁=0.3, x₂=${b.toFixed(2)}. The secant slope is ${slope.toFixed(3)}>0, matching f′(c) at c≈${c.toFixed(3)}. Positive width × positive slope gives a positive change.`, range: [-0.1, 2.3, -0.5, 11] }
  }
  if (id === 'ftc2') {
    const b = value, f = x => x * x, area = line('Signed area under f', f, 0, b)
    return { traces: [{ ...area, fill: 'tozeroy', fillcolor: 'rgba(59,130,246,0.2)' }, line('F(x) = x³/3', x => x ** 3 / 3, 0, 3, '#dc2626'), points('F(0) and F(b)', [0, b], [0, b ** 3 / 3])], formula: m`\int_0^b x^2\,dx=F(b)-F(0)=\frac{b^3}{3}`, caption: `b=${b.toFixed(2)}: blue area = ${(b ** 3 / 3).toFixed(4)}; change in red antiderivative F = ${(b ** 3 / 3).toFixed(4)}. FTC turns accumulated area into endpoint change.`, range: [-0.1, 3.2, -0.5, 10] }
  }
  if (id === 'parts') {
    const b = value, x = Array.from({ length: 301 }, (_, i) => b * i / 300), y = x.map(t => t * t)
    return { traces: [{ type: 'scatter', mode: 'lines', name: '∫v du: area below v=u²', x, y, fill: 'tozeroy', fillcolor: 'rgba(59,130,246,0.2)', line: { color: '#2d70b3', width: 3 } }, { type: 'scatter', mode: 'lines', name: '∫u dv: remaining rectangle', x: [0, 0, b, ...x.slice().reverse(), 0], y: [0, b*b, b*b, ...y.slice().reverse(), 0], fill: 'toself', fillcolor: 'rgba(239,68,68,0.18)', line: { width: 0, color: '#dc2626' } }], formula: m`u=t,\ v=t^2:\quad\int_0^b u\,dv+\int_0^b v\,du=b^3`, caption: `b=${b.toFixed(2)}. Blue area b³/3=${(b**3/3).toFixed(4)} plus red area 2b³/3=${(2*b**3/3).toFixed(4)} equals rectangle area b³=${(b**3).toFixed(4)}. Axes are u (horizontal), v (vertical).`, range: [-0.05, 1.1, -0.05, 1.15], xTitle: 'u', yTitle: 'v' }
  }
  if (id === 'geometric') {
    const n = Math.round(value), x = Array.from({ length: n + 1 }, (_, i) => i), sums = x.map(k => 2 * (1 - 0.5 ** (k + 1)))
    return { traces: [{ type: 'bar', name: 'Terms a rⁿ (a=1, r=1/2)', x, y: x.map(k => 0.5 ** k), marker: { color: '#2d70b3' } }, { type: 'scatter', mode: 'lines+markers', name: 'Partial sums', x, y: sums, line: { color: '#dc2626', width: 3 } }, line('Infinite sum = 2', () => 2, 0, Math.max(1, n), '#388c46')], formula: m`S_N=2(1-2^{-(N+1)}),\quad 2-S_N=2^{-N}`, caption: `N=${n} (N+1 terms): sum=${sums[n].toFixed(6)}, remaining tail=${(2**(-n)).toPrecision(3)}. Multiplying by r shifts the bars one place; subtracting cancels the middle terms.`, range: [-0.5, Math.max(2, n + 0.5), -0.1, 2.3], xTitle: 'n' }
  }
  if (id === 'p-series') {
    const p = value, f = x => x ** -p, x = Array.from({ length: 10 }, (_, i) => i + 1)
    return { traces: [{ type: 'bar', name: 'Terms as unit-width rectangles', x: x.map(n => n + 0.5), y: x.map(f), width: 1, opacity: 0.3, marker: { color: '#dc2626' } }, line('f(x) = x⁻ᵖ', f, 1, 11)], formula: m`\int_1^B x^{-p}\,dx=\frac{B^{1-p}-1}{1-p}\ (p\ne1)`, caption: `p=${p.toFixed(2)}: ${p > 1 ? 'the integral tail is finite, so the series converges' : 'the integral grows without bound, so the series diverges'}. Rectangles compare the discrete sum with the continuous area. At p=1 use ln B. A finite graph alone cannot prove convergence.`, range: [0.4, 11.4, -0.05, 1.2], xTitle: 'x / n' }
  }
  if (id === 'absolute') {
    const n = Math.round(value), x = Array.from({ length: 17 }, (_, i) => n + i), tails = x.map(k => { let sum=0; for(let j=n+1;j<=k;j++)sum+=(-1)**j/2**j; return Math.abs(sum) }), bounds = x.map(k => 2**(-n)*(1-2**(-(k-n))))
    return { traces: [{ type: 'scatter', mode: 'lines+markers', name: '|Sₘ − Sₙ|', x, y: tails, line: { color: '#2d70b3', width: 3 } }, { type: 'scatter', mode: 'lines+markers', name: 'Σ|aₖ| over the same tail', x, y: bounds, line: { color: '#dc2626', width: 3 } }], formula: m`a_k=(-1)^k2^{-k},\quad\left|\sum_{k=n+1}^m a_k\right|\le\sum_{k=n+1}^m|a_k|<2^{-n}`, caption: `n=${n}: every displayed blue signed-tail magnitude is below the red sum of magnitudes, which is bounded by 2⁻ⁿ=${(2**(-n)).toPrecision(3)}. Increase n to shrink both on the fixed vertical scale.`, range: [n - 0.5, n + 16.5, -0.02, 0.55], xTitle: 'm' }
  }
  throw Error(`Unknown proof visual: ${id}`)
}
export const PROOF_CONTROLS = {
  fermat: { label: 'Secant distance h', min: 0.02, max: 1, step: 0.01, initial: 0.6 },
  mvt: { label: 'Right endpoint b', min: 1, max: 3, step: 0.05, initial: 2 },
  monotonicity: { label: 'Second point x₂', min: 0.4, max: 2, step: 0.05, initial: 1.5 },
  ftc2: { label: 'Upper endpoint b', min: 0.1, max: 3, step: 0.05, initial: 2 },
  parts: { label: 'Rectangle width b', min: 0.1, max: 1, step: 0.02, initial: 1 },
  geometric: { label: 'Last index N', min: 1, max: 18, step: 1, initial: 5 },
  'p-series': { label: 'Exponent p', min: 0.5, max: 3, step: 0.05, initial: 1.5 },
  absolute: { label: 'Tail starts after n', min: 1, max: 12, step: 1, initial: 2 },
}
