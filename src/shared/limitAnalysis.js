// Sampling can suggest a removable hole, but is not a proof of a limit.
// Both sides must approach each other AND stabilize as the offsets shrink.
export function detectHole(f, target) {
  if (!Number.isFinite(target) || Number.isFinite(f(target))) return null
  const pairs = [1e-3, 1e-4, 1e-5, 1e-6].map(d => [f(target-d), f(target+d)])
  if (!pairs.every(pair => pair.every(Number.isFinite))) return null
  const [left, right] = pairs.at(-1)
  const estimate = (left + right) / 2
  const tolerance = 1e-4 * (1 + Math.abs(estimate))
  if (Math.abs(left-right) > tolerance) return null
  for (let i = pairs.length-2; i < pairs.length; i++) {
    if (pairs[i].some((value, side) => Math.abs(value-pairs[i-1][side]) > tolerance)) return null
  }
  return estimate
}
