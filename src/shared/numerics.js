// Shared numeric helpers used by every visualizer tab.
//
// The key idea used everywhere is "asymptote-safe" sampling: we take LOTS of
// points (3500 by default) and break the line whenever the value jumps more
// than the whole visible y-height between two neighbouring samples. A smooth
// curve (sin, x², …) only ever moves a tiny amount between dense samples, so
// it stays continuous — but at a tan-style vertical asymptote the value leaps
// from huge-positive to huge-negative, which we catch and turn into a gap.

// Wrap a compiled math.js expression into a plain (t) => number evaluator.
// Returns NaN for undefined / non-finite values so callers can just check
// Number.isFinite() instead of wrapping every call in try/catch.
export function makeEval(compiled, varName = 'x') {
  if (!compiled) return () => NaN
  return (t) => {
    try {
      const v = compiled.evaluate({ [varName]: t })
      return typeof v === 'number' && Number.isFinite(v) ? v : NaN
    } catch {
      return NaN
    }
  }
}

// Sample a plain (x) => number function over [min, max].
// `breakAt` is the visible y-range height (yMax − yMin): a jump larger than
// that between consecutive samples is treated as an asymptote and the line is
// broken with a null so Plotly (connectgaps: false) leaves a gap.
export function sampleFunction(fn, min, max, steps = 3500, breakAt = 0) {
  const xs = [], ys = []
  const dx = (max - min) / steps
  let prevX = null, prevY = null
  for (let i = 0; i <= steps; i++) {
    const x = min + i * dx
    const v = fn(x)
    const y = Number.isFinite(v) ? v : null
    if (prevY !== null && y !== null && breakAt > 0 && Math.abs(y - prevY) > breakAt) {
      xs.push((prevX + x) / 2)
      ys.push(null)
    }
    xs.push(x)
    ys.push(y)
    prevX = x
    prevY = y
  }
  return { xs, ys }
}

// Simpson estimates require finite samples. Undefined samples must not be
// silently replaced by zero, which can make a divergent integral look finite.
export function integrateSimpson(f, a, b, n = 600) {
  if (![a, b, n].every(Number.isFinite)) return NaN
  if (a === b) return 0
  n = Math.ceil(n)
  if (n < 2) n = 2
  if (n % 2 !== 0) n++
  const h = (b - a) / n
  let sum = 0
  for (let i = 0; i <= n; i++) {
    let v = f(a + i * h)
    if (!Number.isFinite(v)) return NaN
    const w = i === 0 || i === n ? 1 : i % 2 ? 4 : 2
    sum += w * v
  }
  return (h / 3) * sum
}

// Given a bracket [a, b] where fn changes sign, zero in on the actual crossing
// with bisection (repeatedly halve the interval, keep the half that still
// straddles zero). 40 halvings is far more than enough precision.
export function refineCrossing(fn, a, b) {
  let fa = fn(a)
  if (!Number.isFinite(fa)) return (a + b) / 2
  for (let i = 0; i < 40; i++) {
    const m = (a + b) / 2
    const fm = fn(m)
    if (!Number.isFinite(fm)) return NaN
    if (fm === 0) return m
    // Keep whichever half still has opposite signs at its ends
    if ((fm < 0) === (fa < 0)) { a = m; fa = fm } else { b = m }
  }
  return (a + b) / 2
}

// Locate genuine sign changes, including zeros exactly on the sampling grid.
// Verify the refined residual so poles and jumps cannot masquerade as zeros.
export function findSignChanges(fn, min, max, steps = 1500) {
  if (![min, max, steps].every(Number.isFinite) || max <= min || steps < 2) return []
  steps = Math.ceil(steps)
  const roots = [], dx = (max - min) / steps
  const sample = x => { try { const y = fn(x); return Number.isFinite(y) ? y : NaN } catch { return NaN } }
  let previousX = min, previous = sample(min)
  for (let i = 1; i <= steps; i++) {
    const x = min + i * dx, value = sample(x)
    if (value === 0 && i < steps) {
      const next = sample(min + (i + 1) * dx)
      if (Number.isFinite(previous) && previous !== 0 && Number.isFinite(next) && next !== 0 && (previous < 0) !== (next < 0)) roots.push(x)
    } else if (Number.isFinite(previous) && Number.isFinite(value) && previous !== 0 && value !== 0 && (previous < 0) !== (value < 0)) {
      const root = refineCrossing(sample, previousX, x)
      const residual = sample(root)
      if (Number.isFinite(residual) && Math.abs(residual) <= Math.max(Math.abs(previous), Math.abs(value)) * 1e-6) roots.push(root)
    }
    previousX = x; previous = value
  }
  return roots
}

// Cumulative integral: walks from `a` to `b` in `steps` equal hops and returns
// the running total at each hop, using the trapezoid rule. Useful whenever a
// tab needs v(x) = ∫ from a to x of w(t) dt as a plain function of x (e.g.
// Integration by Parts, where the user supplies dv but v itself has to be
// built up numerically, with v(a) = 0 as the natural starting point).
// Returns { xs, vs } — both arrays have steps+1 uniformly spaced entries.
export function cumulativeIntegral(fn, a, b, steps = 600) {
  if (![a, b, steps].every(Number.isFinite) || steps < 1) return { xs: [], vs: [] }
  steps = Math.ceil(steps)
  const xs = [a], vs = [0]
  const h = (b - a) / steps
  let prevX = a
  let prevF = fn(a)
  if (!Number.isFinite(prevF)) prevF = NaN
  let running = 0
  for (let i = 1; i <= steps; i++) {
    const x = a + i * h
    let f = fn(x)
    if (!Number.isFinite(f)) f = NaN
    running += ((prevF + f) / 2) * (x - prevX)
    xs.push(x)
    vs.push(running)
    prevX = x
    prevF = f
  }
  return { xs, vs }
}

// Format a number for the results panels: round to `digits` decimals, then
// drop the trailing zeros ("3.140000" → "3.14"). Non-finite → an em dash.
export function fmtNum(v, digits = 6) {
  if (!Number.isFinite(v)) return '—'
  return String(parseFloat(v.toFixed(digits)))
}

// A stationary point can be a zero of f' without a sign change (e.g. x^3).
// Extrema of f' supply those candidates; verify f' really approaches zero.
export function findStationaryPoints(first, second, min, max, steps = 1500) {
  const roots = findSignChanges(first, min, max, steps)
  if (!second) return roots
  const h = (max-min)/steps
  for (const x of findSignChanges(second, min, max, steps)) {
    const values = [first(x-h), first(x), first(x+h)]
    if (!values.every(Number.isFinite)) continue
    const scale = Math.max(Math.abs(values[0]), Math.abs(values[2]))
    if (Math.abs(values[1]) <= scale*1e-7 && !roots.some(root => Math.abs(root-x)<h*1e-3)) roots.push(x)
  }
  return roots.sort((a,b)=>a-b)
}
