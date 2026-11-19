import { taylorCoeffs } from '../shared/taylorCoefficients.js'

self.onmessage = ({ data }) => {
  const { expression, center, degree } = data
  try { self.postMessage({ expression, center, degree, coeffs: taylorCoeffs(expression, center, degree) }) }
  catch (err) { self.postMessage({ expression, center, degree, error: err.message || 'Could not calculate this expansion.' }) }
}
