// Contours miss isolated zeros because they have no sign crossing. Refine
// strict local minima/maxima of the sampled residual and verify a zero there.
export function isolatedZeros(evaluate, xs, ys, z) {
  const points = []
  const hx = Math.abs(xs[1] - xs[0]), hy = Math.abs(ys[1] - ys[0])
  const value = (x, y) => { try { const v = evaluate(x, y); return Number.isFinite(v) ? v : NaN } catch { return NaN } }
  for (let j = 1; j < ys.length - 1; j++) for (let i = 1; i < xs.length - 1; i++) {
    const v = z[j][i]
    if (v === null) continue
    const neighbors = [z[j-1][i], z[j+1][i], z[j][i-1], z[j][i+1]]
    if (!neighbors.every(n => n !== null && (v >= 0 ? n > v : n < v))) continue
    let x = xs[i], y = ys[j]
    for (let k = 0; k < 12; k++) {
      const h = hx * .01, q = hy * .01, c = value(x, y)
      const xp = value(x+h,y), xm = value(x-h,y), yp = value(x,y+q), ym = value(x,y-q)
      const gx = (xp-xm)/(2*h), gy = (yp-ym)/(2*q)
      const xx = (xp-2*c+xm)/(h*h), yy = (yp-2*c+ym)/(q*q)
      const xy = (value(x+h,y+q)-value(x+h,y-q)-value(x-h,y+q)+value(x-h,y-q))/(4*h*q)
      const det = xx*yy-xy*xy
      if (!Number.isFinite(det) || Math.abs(det) < 1e-20) break
      const dx = (yy*gx-xy*gy)/det, dy = (xx*gy-xy*gx)/det
      if (!Number.isFinite(dx+dy) || Math.abs(dx)>hx || Math.abs(dy)>hy) break
      x -= dx; y -= dy
      if (Math.abs(dx)+Math.abs(dy)<1e-10) break
    }
    const ring = Array.from({length: 12}, (_,k) => value(x+hx*.1*Math.cos(k*Math.PI/6),y+hy*.1*Math.sin(k*Math.PI/6)))
    const scale = Math.max(...ring.map(Math.abs))
    if (scale > 0 && Math.abs(value(x,y)) <= scale*1e-7 && (ring.every(v=>v>0)||ring.every(v=>v<0)) && !points.some(p=>Math.hypot(p[0]-x,p[1]-y)<Math.min(hx,hy)*.1)) points.push([x,y])
  }
  return points
}
