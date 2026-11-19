// Plotly polar traces require nonnegative radii. A negative polar radius is
// the same point at a positive radius with the angle shifted by pi.
export function samplePolar(fn, thetaMin, thetaMax, steps) {
  const thetas = [], rs = []
  const dTheta = (thetaMax-thetaMin)/steps
  for (let i=0; i<=steps; i++) {
    const theta=thetaMin+i*dTheta
    try {
      const r=fn.evaluate({theta,x:theta})
      thetas.push(Number.isFinite(r)&&r<0?theta+Math.PI:theta)
      rs.push(Number.isFinite(r)?Math.abs(r):null)
    } catch { thetas.push(theta); rs.push(null) }
  }
  return {thetas,rs}
}
