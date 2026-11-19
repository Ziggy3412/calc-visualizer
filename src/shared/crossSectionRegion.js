export function regionAt(top, bottom, x) {
  const first=top(x), second=bottom(x)
  if(!Number.isFinite(first)||!Number.isFinite(second)) return null
  return { lower: Math.min(first,second), upper: Math.max(first,second), width: Math.abs(first-second) }
}
export function crossSectionArea(shape, width, height=width) {
  if(!Number.isFinite(width)||width<=0)return 0
  switch(shape) {
    case 'square': return width*width
    case 'semicircle': return Math.PI*width*width/8
    case 'equilateral': return Math.sqrt(3)*width*width/4
    case 'isosceles-right': return width*width/2
    case 'rectangle': return width*Math.abs(height)
    default: return 0
  }
}
