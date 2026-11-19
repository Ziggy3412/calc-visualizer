import * as math from 'mathjs'
import { seriesCoefficients, UnsupportedSeriesOperation } from './taylorSeries.js'

export function taylorCoeffs(exprString, a, maxN) {
  const coeffs = []
  let node
  node = math.parse(exprString)
  try { return seriesCoefficients(node, a, maxN) }
  catch (err) { if (!(err instanceof UnsupportedSeriesOperation)) throw err }
  let fact = 1
  for (let k = 0; k <= maxN; k++) {
    if (k > 0) fact *= k          // fact = k!
    let val = NaN
    try { const v = node.evaluate({ x: a }); if (Number.isFinite(v)) val = v } catch { /* undefined */ }
    if (!Number.isFinite(val)) throw Error('This branch has no finite derivative at the selected center. Choose a center inside its real domain or a lower degree.')
    coeffs.push(val / fact)
    // Differentiate to get the next derivative for the next loop pass.
    if (k < maxN) node = math.derivative(node, 'x')
  }
  return coeffs
}
