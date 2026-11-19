// Analytic examples: no numerical scan is used to claim theorem hypotheses.
export const DEMO_IDS = ['ivt', 'evt', 'squeeze', 'mvt', 'rolle', 'ftc1', 'integral-mvt']
export function theoremDemo(id, position = 0.5, counterexample = false) {
  const p = Math.max(0, Math.min(1, position))
  const a = -1, b = 2
  if (id === 'ivt') {
    const target = -0.9 + 1.8 * p
    const c = Math.cbrt(target)
    return counterexample ? {
      fn: x => x < 0 ? -1 : 1, domain: [-1, 1], range: [-1.5, 1.5], level: target,
      breaks: [0], open: [[0, -1]], points: [[0, 1]],
      formula: String.raw`f(x)=-1\ (x<0),\quad f(x)=1\ (x\ge0)`,
      readout: `N = ${target.toFixed(3)} is skipped: this jump function takes only −1 and 1.`,
      hypothesis: 'Continuity fails at x=0. Opposite endpoint signs alone do not guarantee a zero.',
      label: 'Target height N',
    } : {
      fn: x => x ** 3, domain: [-1, 1], range: [-1.5, 1.5], level: target,
      points: [[-1, -1], [1, 1], [c, target]], formula: String.raw`f(x)=x^3,\quad[-1,1]`,
      readout: `N = ${target.toFixed(3)}; c = ∛N ≈ ${c.toFixed(4)}; f(c) = N.`,
      hypothesis: 'A polynomial is continuous on [−1,1]. Every chosen N lies strictly between −1 and 1.', label: 'Target height N',
    }
  }
  if (id === 'mvt' || id === 'rolle') {
    const left = id === 'rolle' ? -1 : 0
    const right = id === 'rolle' ? 1 : 1 + 2 * p
    const c = (left + right) / 2
    if (counterexample) return {
      fn: Math.abs, domain: [-1, 1], range: [-0.7, 1.7], level: 1,
      points: [[-1, 1], [1, 1], [0, 0]], formula: String.raw`f(x)=|x|,\quad[-1,1]`,
      readout: 'Secant slope = 0. The derivative is −1 for x<0 and +1 for x>0; at zero it does not exist. No matching tangent exists.',
      hypothesis: 'Continuity holds, but differentiability fails at the corner. Both MVT and Rolle require differentiability throughout the open interval.',
    }
    const fn = id === 'rolle' ? x => x * x - 1 : x => x * x
    const slope = left + right
    return {
      fn, domain: [left, right], range: id === 'rolle' ? [-1.6, 0.8] : [-1, right * right + 1],
      points: [[left, fn(left)], [right, fn(right)], [c, fn(c)]],
      lines: [{ x: [left, right], y: [fn(left), fn(right)], name: 'Endpoint secant', color: 'var(--curve2)' },
        { x: [left, right], y: [fn(c) + slope * (left - c), fn(c) + slope * (right - c)], name: 'Parallel tangent at c', color: 'var(--curve3)' }],
      formula: id === 'rolle' ? String.raw`f(x)=x^2-1,\quad[-1,1]` : String.raw`f(x)=x^2,\quad[0,${right.toFixed(2)}]`,
      readout: `Secant slope = ${slope.toFixed(3)}; c = ${c.toFixed(3)}; f′(c) = 2c = ${slope.toFixed(3)}.`,
      hypothesis: id === 'rolle' ? 'The polynomial is continuous and differentiable, and f(−1)=f(1)=0. Its horizontal tangent is at c=0.' : 'The polynomial is continuous on the closed interval and differentiable throughout its interior. The marked tangent is parallel to the secant.',
      ...(id === 'mvt' ? { label: 'Right endpoint b' } : {}),
    }
  }
  if (id === 'evt') return counterexample ? {
    fn: x => x, domain: [0, 1], range: [-0.3, 1.3], open: [[0, 0], [1, 1]],
    formula: String.raw`f(x)=x,\quad x\in(0,1)`,
    readout: 'Infimum = 0 and supremum = 1, but neither is attained. There is no absolute minimum or maximum.',
    hypothesis: 'The domain is bounded but not closed. Open endpoints are excluded.',
  } : {
    fn: x => x * x, domain: [a, b], range: [-0.8, 5], points: [[a, 1], [0, 0], [b, 4]],
    formula: String.raw`f(x)=x^2,\quad[-1,2]`, readout: 'Absolute minimum = 0 at x=0. Absolute maximum = 4 at the endpoint x=2.',
    hypothesis: 'x² is continuous and [−1,2] is closed and bounded. Compare both endpoints and the interior critical point.',
  }
  if (id === 'ftc1') {
    const x = 0.2 + 2.8 * p
    return {
      fn: t => t * t, domain: [0, 3], range: [-1, 10], points: [[x, x * x]], area: [0, x],
      formula: String.raw`f(t)=t^2,\quad A(x)=\int_0^x t^2\,dt=\frac{x^3}{3}`,
      readout: `x = ${x.toFixed(3)}; A(x) ≈ ${(x ** 3 / 3).toFixed(4)}; A′(x) = f(x) ≈ ${(x * x).toFixed(4)}.`,
      hypothesis: 'The shaded region is accumulated area A(x). Its rate of change is the height f(x), not the accumulated area itself.', label: 'Upper bound x',
    }
  }
  if (id === 'integral-mvt') {
    const right = 1 + 2 * p, average = right * right / 3, c = right / Math.sqrt(3)
    return {
      fn: x => x * x, domain: [0, right], range: [-1, right * right + 1], level: average, area: [0, right],
      points: [[c, average]], rectangle: [0, right, average],
      formula: String.raw`f(x)=x^2,\quad f_{\mathrm{avg}}=\frac{b^2}{3},\quad c=\frac b{\sqrt3}`,
      readout: `b = ${right.toFixed(3)}; average height = ${average.toFixed(4)} at c ≈ ${c.toFixed(4)}. Rectangle and curved region both have area ${(right ** 3 / 3).toFixed(4)}.`,
      hypothesis: 'Continuity ensures the average height is attained. The dashed rectangle has the same area as the region under the curve.', label: 'Right endpoint b',
    }
  }
  if (id === 'squeeze') {
    const radius = 0.06 + 0.94 * (1 - p)
    return {
      fn: x => x === 0 ? 0 : x * x * Math.sin(1 / x), domain: [-radius, radius], range: [-1.2, 1.2],
      bounds: [x => x * x, x => -x * x], points: [],
      formula: String.raw`-x^2\le x^2\sin(1/x)\le x^2\quad(x\ne0)`,
      open: [[0, 0]],
      readout: `Within |x|≤${radius.toFixed(3)}, the magnitude is at most ${ (radius * radius).toFixed(5)}. Both bounds tend to zero as x→0.`,
      hypothesis: 'The vertical scale stays fixed while the horizontal window shrinks. The hole at zero does not affect the limit.', label: 'Window radius |x|',
    }
  }
  throw Error(`Unknown theorem demonstration: ${id}`)
}
