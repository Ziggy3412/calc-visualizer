// Numbers for limits as x → ±∞.
//
// Values are computed with 64-digit precision (math.js BigNumber) because
// ordinary floating point gives wrong answers at huge x: (1 + 1/x)^x at
// x = 10^15 comes out as 3.04 instead of e ≈ 2.71828. Falls back to ordinary
// numbers for anything BigNumber math cannot evaluate.
import { all, create } from 'mathjs'

const big = create(all, { number: 'BigNumber', precision: 64 })
const plain = create(all)

// Returns f(sign, k) = the function's value at x = sign · 10^k, as a plain number
// (NaN when undefined, ±Infinity when too large to represent).
// f.exact(sign, k) gives the same value but keeps numbers too big or too small
// for ordinary floating point (like e^(10^6)), for display.
export function makeInfinityEval(expr) {
  let bigCompiled = null, plainCompiled = null
  try { bigCompiled = big.compile(expr) } catch { /* fall back below */ }
  try { plainCompiled = plain.compile(expr) } catch { return null }
  function exact(sign, k) {
    if (bigCompiled) {
      try {
        const value = bigCompiled.evaluate({ x: big.bignumber(10).pow(k).times(sign) })
        if (value?.isBigNumber) return value.isNaN() ? NaN : value
        if (typeof value === 'number') return value
      } catch { /* fall back to plain numbers */ }
    }
    try {
      const value = plainCompiled.evaluate({ x: sign * 10 ** k })
      return typeof value === 'number' ? value : NaN
    } catch { return NaN }
  }
  const f = (sign, k) => toNumber(exact(sign, k))
  f.exact = exact
  // Fast ordinary-number evaluation, accurate enough for |x| up to about 10^7.
  f.plain = x => {
    try { const value = plainCompiled.evaluate({ x }); return typeof value === 'number' ? value : NaN } catch { return NaN }
  }
  return f
}

// Points for a normal-looking graph of f between 0 and sign · 10^k.
// Starts just past 0 (x = 0 is often undefined, as in 1/x).
export function sampleWindow(f, sign, k, count = 400) {
  const xs = [], ys = []
  const precise = k > 7
  for (let i = 1; i <= count; i++) {
    const t = i / count
    xs.push(sign * 10 ** k * t)
    ys.push(precise ? f(sign, k + Math.log10(t)) : f.plain(sign * 10 ** k * t))
  }
  return { xs, ys }
}

// A y-range that shows the shape without one extreme point (such as 1/x right
// next to 0, or a vertical asymptote) squashing everything else flat.
export function niceYRange(values, include = []) {
  const finite = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (!finite.length) return [-1, 1]
  const at = q => finite[Math.min(finite.length - 1, Math.max(0, Math.round(q * (finite.length - 1))))]
  let lo = Math.min(at(0.01), ...include), hi = Math.max(at(0.99), ...include)
  if (hi - lo < 1e-12 * Math.max(1, Math.abs(hi))) { const pad = Math.max(1, Math.abs(hi) * 0.5); return [lo - pad, hi + pad] }
  const pad = (hi - lo) * 0.08
  return [lo - pad, hi + pad]
}
const toNumber = value => value?.isBigNumber ? Number(value.toString()) : value

const CHECK_POWERS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]

// Reads the trend of f far out (x = 10^8 … 10^20). The result describes what
// the numbers suggest; it is not a proof.
export function analyzeInfinity(f, sign) {
  const values = CHECK_POWERS.map(k => f(sign, k))
  const tail = values.slice(-6)
  if (tail.every(Number.isNaN)) return { kind: 'undefined' }
  if (tail.some(Number.isNaN)) return { kind: 'unclear' }
  const last = values.at(-1)
  const diffs = values.slice(1).map((v, i) => v - values[i])

  const rising = diffs.every(d => d > 0 || Number.isNaN(d))
  const falling = diffs.every(d => d < 0 || Number.isNaN(d))
  const finiteDiffs = diffs.filter(Number.isFinite).map(Math.abs)
  const steady = finiteDiffs.length > 0 && Math.min(...finiteDiffs) >= 0.3 * Math.max(...finiteDiffs)
  if (rising && (last === Infinity || last > 1e6 || (steady && last - values[0] > 5))) return { kind: 'infinity', sign: 1 }
  if (falling && (last === -Infinity || last < -1e6 || (steady && values[0] - last > 5))) return { kind: 'infinity', sign: -1 }

  const recent = diffs.slice(-3)
  if (Number.isFinite(last) && recent.every(d => Math.abs(d) <= 1e-7 * (1 + Math.abs(last)))) return { kind: 'limit', value: last }

  let turns = 0
  for (let i = 1; i < diffs.length; i++) if (Math.sign(diffs[i]) !== Math.sign(diffs[i - 1]) && diffs[i] !== 0) turns++
  if (turns >= 4) {
    const size = list => Math.max(...list.map(Math.abs))
    const growing = size(values.slice(-4)) > 10 * size(values.slice(0, 4))
    return { kind: growing ? 'oscillates-growing' : 'oscillates' }
  }
  return { kind: 'unclear' }
}

const CONSTANTS = [['e', Math.E], ['π', Math.PI], ['π/2', Math.PI / 2], ['π/4', Math.PI / 4], ['1/e', 1 / Math.E], ['√2', Math.SQRT2], ['ln 2', Math.LN2]]

// A friendly name for a limit value: 2, 1/2, e, or a rounded decimal.
export function describeValue(value) {
  if (Math.abs(value) < 1e-12) return { text: '0' }
  const rounded = Math.round(value)
  if (Math.abs(value - rounded) < 1e-9 * (1 + Math.abs(value))) return { text: formatValue(rounded) }
  for (let q = 2; q <= 12; q++) {
    const p = Math.round(value * q)
    if (Math.abs(value - p / q) < 1e-10 && Math.abs(p) < 1000) return { text: `${p < 0 ? '−' : ''}${Math.abs(p)}/${q}` }
  }
  for (const [name, constant] of CONSTANTS) {
    for (const s of [1, -1]) if (Math.abs(value - s * constant) < 1e-9) return { text: `≈ ${formatValue(value)}`, name: `${s < 0 ? '−' : ''}${name}` }
  }
  return { text: `≈ ${formatValue(value)}` }
}

const SUPERSCRIPT = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }
const sup = n => String(n).split('').map(c => SUPERSCRIPT[c] ?? c).join('')

// x = ±10^k for whole k, written as 10¹²
export function formatPower(sign, k) {
  return `${sign < 0 ? '−' : ''}10${sup(k)}`
}

// Readable numbers: 1234.5, 0.5, 3.162 × 10⁴, −1 × 10¹², "undefined"
export function formatValue(value) {
  if (value?.isBigNumber) {
    if (value.isZero()) return '0'
    const size = Number(value.abs().toString())
    // Beyond floating point range: write it from the exact digits.
    if (size === 0 || size === Infinity) {
      const [mantissa, exponent] = value.toExponential(3).split('e')
      return `${Number(mantissa) < 0 ? '−' : ''}${Number(Math.abs(mantissa))} × 10${sup(Number(exponent))}`
    }
    value = Number(value.toString())
  }
  if (Number.isNaN(value)) return 'undefined'
  if (value === Infinity) return 'too large (→ ∞)'
  if (value === -Infinity) return 'too large (→ −∞)'
  if (value === 0) return '0'
  const size = Math.abs(value)
  if (size >= 1e6 || size < 1e-4) {
    const exponent = Math.floor(Math.log10(size))
    const mantissa = Number((value / 10 ** exponent).toPrecision(4))
    if (Math.abs(mantissa) === 10) return `${mantissa < 0 ? '−' : ''}1 × 10${sup(exponent + 1)}`
    return `${mantissa < 0 ? '−' : ''}${Math.abs(mantissa)} × 10${sup(exponent)}`
  }
  const text = Number(value.toPrecision(7)).toString()
  return value < 0 ? `−${text.slice(1)}` : text
}

export function verdictText(result, sign, describe = describeValue) {
  const to = sign > 0 ? '∞' : '−∞'
  switch (result.kind) {
    case 'limit': {
      const { text, name } = describe(result.value)
      return { headline: name || !text.startsWith('≈') ? `Limit appears to be ${name ?? text}` : `Limit ${text}`, detail: name ? `The values settle at ${text.replace('≈ ', '')}, which matches ${name}.` : `As x → ${to}, f(x) settles at ${text.replace('≈ ', '')}.` }
    }
    case 'infinity':
      return { headline: `f(x) → ${result.sign > 0 ? '∞' : '−∞'}`, detail: `f(x) ${result.sign > 0 ? 'grows' : 'falls'} without bound, so the limit is ${result.sign > 0 ? '∞' : '−∞'} (it does not exist as a finite number).` }
    case 'oscillates':
      return { headline: 'Limit does not exist', detail: 'f(x) keeps oscillating and never settles on one value.' }
    case 'oscillates-growing':
      return { headline: 'Limit does not exist', detail: 'f(x) swings back and forth with growing size.' }
    case 'undefined':
      return { headline: 'Not defined out here', detail: `f(x) has no real value as x → ${to}.` }
    default:
      return { headline: 'Hard to tell from numbers', detail: 'The values change too slowly to read a limit from the table. Try simplifying the expression algebraically.' }
  }
}
