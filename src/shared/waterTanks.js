export const WATER_TANKS = {
  cone: { height:6, radius:3, areaFactor:Math.PI/12 },
  cube: { height:4, side:4, areaFactor:16 },
}
export function tankVolume(id,height) {
  return id==='cone' ? Math.PI*height**3/12 : 16*height
}
export function tankHeight(id,volume) {
  return id==='cone' ? Math.cbrt(12*volume/Math.PI) : volume/16
}
export function advanceTank(id,height,known,rate,seconds) {
  const tank=WATER_TANKS[id]
  const next=known==='x' ? height+rate*seconds : tankHeight(id,tankVolume(id,height)+rate*seconds)
  const bounded=Math.max(0,Math.min(tank.height,next))
  return {height:bounded,volume:tankVolume(id,bounded),atEnd:bounded===0||bounded===tank.height}
}
