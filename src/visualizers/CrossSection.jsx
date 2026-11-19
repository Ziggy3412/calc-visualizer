import BoundInput from '../components/BoundInput'
import UnboundedNotice from '../components/UnboundedNotice'
import useExtendedBounds from '../shared/useExtendedBounds'
import { integrateExtended,texBound } from '../shared/infinity'
import FitSceneControls from '../components/FitSceneControls'
import { functionBounds } from '../shared/graphFit'
import { regionAt, crossSectionArea } from '../shared/crossSectionRegion'
import ContactPoints, { ContactToggle } from '../components/ContactPoints'
import { contactPoints, contactTrace } from '../shared/contactPoints'
import KeyboardOrbitControls from '../components/KeyboardOrbitControls'
import { useAppearance } from '../shared/appearance'
import SceneLighting from '../components/SceneLighting'
import InfiniteSlices from '../components/InfiniteSlices'
import { useState, useEffect, useRef, useMemo } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { GizmoHelper, GizmoViewcube, Line, Edges } from '@react-three/drei'
import * as THREE from 'three'
import Plot from '../components/ThemedPlot'
import * as math from 'mathjs'
import TeX from '../components/TeX'
import MathInput from '../components/MathInput'
import ZoomControls from '../components/ZoomControls'
import VizSlider from '../components/VizSlider'
import usePlotView from '../shared/usePlotView'
import { sampleFunction, makeEval, integrateSimpson, fmtNum } from '../shared/numerics'
import { cartesianLayout, PLOT_CONFIG } from '../shared/plotDefaults'
import './CrossSection.css'

// ─── Geometry helpers ───────────────────────────────────────────

// Resample a polygon to exactly M evenly-spaced points along its perimeter
function resamplePolygon(verts, M) {
  const n = verts.length
  const edgeLengths = []
  let perimeter = 0
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    const len = Math.hypot(verts[j][0] - verts[i][0], verts[j][1] - verts[i][1])
    edgeLengths.push(len)
    perimeter += len
  }
  if (perimeter === 0) return new Array(M).fill(null).map(() => [0, 0])

  const step = perimeter / M
  const result = []
  for (let k = 0; k < M; k++) {
    let target = k * step
    let acc = 0
    for (let i = 0; i < n; i++) {
      if (acc + edgeLengths[i] >= target - 1e-12 || i === n - 1) {
        const t = edgeLengths[i] > 0 ? Math.min(1, (target - acc) / edgeLengths[i]) : 0
        const j = (i + 1) % n
        result.push([
          verts[i][0] + t * (verts[j][0] - verts[i][0]),
          verts[i][1] + t * (verts[j][1] - verts[i][1]),
        ])
        break
      }
      acc += edgeLengths[i]
    }
  }
  return result
}

// Get cross-section outline for a given shape and base length s.
// Each point is [base, extent]:
//   - `base`   runs 0..s   → laid flat in the x-y plane (the curve's region)
//   - `extent` runs 0..up  → the cross-section standing up out of that plane
// Every shape rises from the base plane (extent >= 0), so the solid grows
// straight up rather than straddling the floor.
// Returns exactly M points forming a closed outline.
function getCrossSection(shape, s, h, M) {
  if (s <= 0) return new Array(M).fill(null).map(() => [0, 0])

  switch (shape) {
    case 'square':
      return resamplePolygon([[0, 0], [s, 0], [s, s], [0, s]], M)
    case 'semicircle': {
      // Arc from (0,0) through (s/2, s/2) to (s,0), centered on z
      const r = s / 2
      const raw = []
      const arcN = Math.max(M, 32)
      for (let i = 0; i <= arcN; i++) {
        const angle = Math.PI * (1 - i / arcN)
        raw.push([r + r * Math.cos(angle), r * Math.sin(angle)])
      }
      return resamplePolygon(raw, M)
    }
    case 'equilateral':
      return resamplePolygon([
        [0, 0], [s, 0], [s / 2, s * Math.sqrt(3) / 2],
      ], M)
    case 'isosceles-right':
      return resamplePolygon([[0, 0], [s, 0], [0, s]], M)
    case 'rectangle':
      return resamplePolygon([
        [0, 0], [s, 0], [s, h], [0, h],
      ], M)
    default:
      return new Array(M).fill(null).map(() => [0, 0])
  }
}

// Base length s is the nonnegative distance between the two boundaries.
// fH is the optional rectangle height. The base position is kept separately.
function sizesAt(fS, fH, shape, x) {
  let s = fS(x)
  s = Number.isFinite(s) ? Math.max(0, s) : 0
  let h = s
  if (shape === 'rectangle' && fH) {
    const hv = fH(x)
    h = Number.isFinite(hv) ? Math.abs(hv) : s
  }
  return { s, h }
}

// Build the solid as a lofted BufferGeometry connecting adjacent outlines
function createSolidGeometry(fS, fH, fBase, a, b, shape) {
  const segments = 80
  const M = 32
  const positions = []
  const indices = []

  for (let i = 0; i <= segments; i++) {
    const x = a + (b - a) * i / segments
    const { s, h } = sizesAt(fS, fH, shape, x)
    const outline = getCrossSection(shape, s, h, M)
    const offset = Number.isFinite(fBase(x)) ? fBase(x) : 0
    for (let j = 0; j < M; j++) {
      // x → X (sweep axis), extent → Y (up), base → -Z (flat in x-y plane,
      // receding away from the viewer so f(x) reads the same way as in 2D)
      positions.push(x, outline[j][1], -(offset + outline[j][0]))
    }
  }

  // Lateral surface — connect adjacent outlines with triangle pairs
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < M; j++) {
      const j1 = (j + 1) % M
      const curr = i * M
      const next = (i + 1) * M
      indices.push(curr + j, next + j, curr + j1)
      indices.push(curr + j1, next + j, next + j1)
    }
  }

  // End caps (fan triangulation from first vertex)
  for (let j = 1; j < M - 1; j++) indices.push(0, j, j + 1)
  const lastBase = segments * M
  for (let j = 1; j < M - 1; j++) indices.push(lastBase, lastBase + j + 1, lastBase + j)

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

// Create a cross-section slice as a thick 3D PRISM, centered at x and
// extruded by `thickness` along the x-axis (like a coin), so the slices stack
// flush into a stair-step solid instead of looking like floating plates.
function createSliceGeometry(fS, fH, fBase, x, shape, thickness) {
  const { s, h } = sizesAt(fS, fH, shape, x)
  if (s <= 0) return null

  const M = 32
  const outline = getCrossSection(shape, s, h, M)
  const x0 = x - thickness / 2
  const x1 = x + thickness / 2
  const positions = []
  const idx = []

  // Two rings: front face at x0 (even indices) and back face at x1 (odd).
  // base → -Z (flat), extent → Y (up); see createSolidGeometry
  for (const [base, extent] of outline) {
    positions.push(x0, extent, -(fBase(x) + base))
    positions.push(x1, extent, -(fBase(x) + base))
  }
  // Side walls connecting the two faces
  for (let j = 0; j < M; j++) {
    const jn = (j + 1) % M
    const a0 = 2 * j, b0 = 2 * j + 1, c0 = 2 * jn, d0 = 2 * jn + 1
    idx.push(a0, c0, b0, b0, c0, d0)
  }
  // Front and back caps (fan triangulation)
  for (let j = 1; j < M - 1; j++) {
    idx.push(0, 2 * j, 2 * (j + 1))           // front cap
    idx.push(1, 2 * (j + 1) + 1, 2 * j + 1)   // back cap (reversed winding)
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return geo
}

// ─── 3D Scene ───────────────────────────────────────────────────

function Scene3D({ hasCurve, fS, fH, fBase, fTop, fBottom, a, b, shape, sliceCount, animProgress, controlsRef, display, infiniteSlices, highlightContacts }) {
  const { settings } = useAppearance()
  const solidGeo = useMemo(() => {
    if (!hasCurve) return null
    return createSolidGeometry(fS, fH, fBase, a, b, shape)
  }, [hasCurve, fS, fH, fBase, a, b, shape])

  // Clipping plane reveals the solid from left (x=a) to right
  const clipPlane = useMemo(() => {
    if (animProgress >= 1) return null
    const endX = a + animProgress * (b - a)
    const direction=b>=a?1:-1
    return new THREE.Plane(new THREE.Vector3(-direction, 0, 0), direction*endX)
  }, [a, b, animProgress])

  // Individual slice geometries
  const slices = useMemo(() => {
    if (!hasCurve || infiniteSlices || sliceCount < 1) return []
    const result = []
    const dx = (b - a) / sliceCount
    for (let i = 0; !infiniteSlices && i < sliceCount; i++) {
      const x = a + (i + 0.5) * dx
      // Only show slices within the animation progress
      if ((i + 0.5) / sliceCount > animProgress) continue
      // Full slice width → flush stacking (stair-step solid)
      const geo = createSliceGeometry(fS, fH, fBase, x, shape, Math.abs(dx))
      if (geo) result.push({ geo, x })
    }
    return result
  }, [hasCurve, fS, fH, fBase, a, b, shape, sliceCount, animProgress, infiniteSlices])

  useEffect(() => () => slices.forEach(s => s.geo.dispose()), [slices])
  useEffect(() => () => solidGeo?.dispose(), [solidGeo])

  const profiles = useMemo(() => {
    if(!hasCurve)return []
    return [fTop,fBottom].map(fn=>Array.from({length:201},(_,i)=>{
      const x=a+(b-a)*i/200, y=fn(x)
      return Number.isFinite(y)?[x,0,-y]:null
    }).filter(Boolean)).filter(points=>points.length>1)
  },[hasCurve,fTop,fBottom,a,b])
  const {camera,invalidate}=useThree()
  const fit=useMemo(()=>{
    let lower=0,upper=0,tall=0
    if(hasCurve)for(let i=0;i<=80;i++) {
      const x=a+(b-a)*i/80, base=fBase(x), {s,h}=sizesAt(fS,fH,shape,x)
      if(Number.isFinite(base)){lower=Math.min(lower,base);upper=Math.max(upper,base+s)}
      tall=Math.max(tall,h)
    }
    return { target:[(a+b)/2,tall*.35,-(lower+upper)/2], distance:Math.max(5,Math.abs(b-a),upper-lower,tall)*1.3 }
  },[hasCurve,fS,fH,fBase,shape,a,b])
  useEffect(()=>{
    camera.position.set(fit.target[0]+fit.distance,fit.target[1]+fit.distance*.8,fit.target[2]+fit.distance)
    camera.lookAt(...fit.target)
    invalidate()
  },[camera,invalidate,fit])

  return (
    <>
      {/* Lighting, grid and gizmo match the Solids of Revolution tab so both
          3D scenes share the same look. */}
<SceneLighting target={fit.target} />

      {highlightContacts && !infiniteSlices && <ContactPoints points={slices.flatMap(s => [fTop,fBottom].map(fn=>[s.x,0,-fn(s.x)])).filter(p=>p.every(Number.isFinite))} />}
      <KeyboardOrbitControls controlsRef={controlsRef} makeDefault target={fit.target} />
      <GizmoHelper alignment="top-right" margin={[80, 80]}>
        <GizmoViewcube />
      </GizmoHelper>
      <gridHelper visible={settings.showGrid} args={[24, 24, settings.axisColor, settings.gridColor]} />

      {/* The solid body — Transparent or inverted Wireframe (filled faces,
          clear white frame), matching the Solids of Revolution tab. */}
      {solidGeo &&
        (display === 'wire' ? (
          <group>
            <mesh geometry={solidGeo}>
              <meshStandardMaterial color={settings.solidColor} roughness={0.38} metalness={0.08} transparent opacity={0.6} side={THREE.DoubleSide}
                depthWrite={false} clippingPlanes={clipPlane ? [clipPlane] : []} />
            </mesh>
            <mesh geometry={solidGeo}>
              <meshBasicMaterial color={settings.wireColor} wireframe transparent opacity={0.9}
                depthWrite={false} clippingPlanes={clipPlane ? [clipPlane] : []} />
            </mesh>
          </group>
        ) : (
          <mesh geometry={solidGeo}>
            <meshStandardMaterial color={settings.solidColor} roughness={0.38} metalness={0.08} transparent opacity={0.42} side={THREE.DoubleSide}
              depthWrite={false} clippingPlanes={clipPlane ? [clipPlane] : []} />
          </mesh>
        ))}

      {/* Individual slices — thick prisms with outlined borders */}
      {slices.map((s, i) => (
        <mesh key={i} geometry={s.geo} renderOrder={i + 1}>
          <meshStandardMaterial
            color={settings.sliceColor}
            transparent
            opacity={0.45}
            side={THREE.DoubleSide}
            depthWrite={false}
            depthTest
          />
          <Edges threshold={15} color={settings.sliceColor} />
        </mesh>
      ))}

      {profiles.map((points,i)=><Line key={i} points={points} color={i?settings.curve2:settings.curve1} lineWidth={2} />)}
    </>
  )
}

// ─── 2D View (Plotly) ───────────────────────────────────────────

function View2D({ hasCurve, fTop, fBottom, a, b, sliceCount, xMin, xMax, yMin, yMax, onRelayout, infiniteSlices, highlightContacts }) {
  const traces=[],shapes=[]
  if(hasCurve) {
    for(const [fn,color,name] of [[fTop,'#2d70b3','Top boundary'],[fBottom,'#dc2626','Bottom boundary']]) {
      const curve=sampleFunction(fn,xMin,xMax,2500,yMax-yMin)
      const samples=curve.xs.map((x,i)=>[x,curve.ys[i]])
      for(const x of [a,b]){const y=fn(x);if(x>=xMin&&x<=xMax&&Number.isFinite(y))samples.push([x,y])}
      samples.sort((p,q)=>p[0]-q[0])
      traces.push({x:samples.map(p=>p[0]),y:samples.map(p=>p[1]),type:'scatter',mode:'lines',line:{color,width:3},name,connectgaps:false})
    }
    const points=[]
    for(let i=0;i<=600;i++){const x=a+(b-a)*i/600;const r=regionAt(fTop,fBottom,x);points.push(r?[x,r.upper]:[null,null])}
    for(let i=600;i>=0;i--){const x=a+(b-a)*i/600;const r=regionAt(fTop,fBottom,x);points.push(r?[x,r.lower]:[null,null])}
    if(points.length)points.push(points[0])
    traces.push({x:points.map(p=>p[0]),y:points.map(p=>p[1]),type:'scatter',mode:'lines',fill:'toself',fillcolor:'rgba(59,130,246,0.12)',line:{width:0},hoverinfo:'skip',showlegend:false,connectgaps:false})
    const dx=(b-a)/sliceCount
    for(let i=0;!infiniteSlices&&i<sliceCount;i++) {
      const x=a+(i+.5)*dx, r=regionAt(fTop,fBottom,x)
      if(r&&r.width>0)shapes.push({type:'rect',x0:a+i*dx,x1:a+(i+1)*dx,y0:r.lower,y1:r.upper,fillcolor:'rgba(245,158,11,0.12)',line:{color:'rgba(245,158,11,0.5)',width:1}})
    }
    if(highlightContacts&&!infiniteSlices)traces.push(contactTrace([...contactPoints(fTop,a,b,sliceCount),...contactPoints(fBottom,a,b,sliceCount)]))
  }
  for(const x of [a,b])shapes.push({type:'line',x0:x,x1:x,y0:0,y1:1,yref:'paper',line:{color:'#94a3b8',width:1,dash:'dash'}})
  const layout=cartesianLayout({xMin,xMax,yMin,yMax,shapes,showLegend:true})
  layout.xaxis.constrain='domain'
  layout.yaxis={...layout.yaxis,scaleanchor:'x',scaleratio:1,constrain:'domain'}
  layout.legend={...layout.legend,x:0,xanchor:'left',y:1,yanchor:'top'}
  return <Plot data={traces} layout={layout} config={PLOT_CONFIG} onRelayout={onRelayout} useResizeHandler style={{width:'100%',height:'100%'}} />
}

// ─── Main Component ─────────────────────────────────────────────

const SHAPES = [
  { key: 'square',          label: 'Square' },
  { key: 'semicircle',      label: 'Semicircle' },
  { key: 'equilateral',     label: 'Equil. Triangle' },
  { key: 'isosceles-right', label: 'Iso. Right △' },
  { key: 'rectangle',       label: 'Rectangle' },
]

// KaTeX area formulas for each shape
const AREA_FORMULAS = {
  'square':          'A(x) = [w(x)]^2',
  'semicircle':      'A(x) = \\tfrac{\\pi}{2} \\left(\\tfrac{w(x)}{2}\\right)^2',
  'equilateral':     'A(x) = \\tfrac{\\sqrt{3}}{4} [w(x)]^2',
  'isosceles-right': 'A(x) = \\tfrac{1}{2} [w(x)]^2',
  'rectangle':       'A(x) = w(x) \\cdot h(x)',
}

export default function CrossSection({ initial = {} }) {
  const [highlightContacts, setHighlightContacts] = useState(false)
  const [infiniteSlices, setInfiniteSlices] = useState(false)
  const [expr, setExpr] = useState(initial.expr ?? { latex: '', ascii: '' })
  const [bottomExpr,setBottomExpr]=useState(initial.bottomExpr ?? {latex:'',ascii:''})
  const [topBranch,setTopBranch]=useState('upper')
  const [bottomBranch,setBottomBranch]=useState('lower')
  const [heightExpr, setHeightExpr] = useState({ latex: '', ascii: '' })
  const {a,b,boundA,boundB,setA,setB,unbounded,reach,setReach}=useExtendedBounds(initial,0,3)
  const [shape, setShape] = useState(initial.shape ?? 'square')
  const [sliceCount, setSliceCount] = useState(8)
  const [view3d, setView3d] = useState(initial.view3d ?? true)
  const [display, setDisplay] = useState('glass') // 3D appearance: 'glass' | 'wire'

  // Ref to the 3D OrbitControls
  const controlsRef = useRef(null)

  // Animation
  const [playing, setPlaying] = useState(false)
  const [animProgress, setAnimProgress] = useState(1)
  const animRef = useRef(null)
  const lastTimeRef = useRef(null)

  useEffect(() => {
    if (!playing) {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      lastTimeRef.current = null
      return
    }
    function tick(ts) {
      if (!lastTimeRef.current) lastTimeRef.current = ts
      const dt = (ts - lastTimeRef.current) / 1000
      lastTimeRef.current = ts
      setAnimProgress(prev => {
        const next = prev + dt / 4
        if (next >= 1) { setPlaying(false); return 1 }
        return next
      })
      animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [playing])

  function togglePlay() {
    if (playing) { setPlaying(false) }
    else {
      if (animProgress >= 1) setAnimProgress(0)
      setPlaying(true)
    }
  }
  function resetAnim() { setPlaying(false); setAnimProgress(1) }

  // Compile expressions into NaN-safe evaluators, memoized on the typed text
  // so the 3D geometry isn't rebuilt on every unrelated render.
  const fTop=useMemo(()=>{
    try{return expr.ascii.trim()?makeEval(math.compile(expr.ascii)):null}catch{return null}
  },[expr.ascii])
  const fBottom=useMemo(()=>{
    if(!bottomExpr.latex.trim())return ()=>0
    try{return bottomExpr.ascii.trim()?makeEval(math.compile(bottomExpr.ascii)):null}catch{return null}
  },[bottomExpr.ascii,bottomExpr.latex])
  const fS=useMemo(()=>fTop&&fBottom ? x=>regionAt(fTop,fBottom,x)?.width ?? NaN : null,[fTop,fBottom])
  const fBase=useMemo(()=>fTop&&fBottom ? x=>regionAt(fTop,fBottom,x)?.lower ?? NaN : null,[fTop,fBottom])
  function useBothBranches(){
    setTopBranch('upper');setBottomBranch('lower')
    setBottomExpr(prev=>prev.latex===expr.latex?prev:{latex:expr.latex,ascii:''})
    const bounds=expr.domain || [a,b]
    if(expr.domain){setA(bounds[0]);setB(bounds[1])}
    let low=Infinity,high=-Infinity
    try {
      const other=makeEval(math.compile(expr.oppositeExpression))
      for(let i=0;i<=100;i++)for(const fn of [fTop,other]) {
        const y=fn(bounds[0]+(bounds[1]-bounds[0])*i/100)
        if(Number.isFinite(y)){low=Math.min(low,y);high=Math.max(high,y)}
      }
    } catch { /* Fit the interval even if the other branch is not available yet. */ }
    view.fitView(Math.max(4,Math.abs(bounds[1]-bounds[0])*.65,Number.isFinite(high-low)?(high-low)*.65:0))
  }

  const fH = useMemo(() => {
    if (shape !== 'rectangle' || !heightExpr.ascii.trim()) return null
    try {
      const compiled = math.compile(heightExpr.ascii)
      compiled.evaluate({ x: 0 })
      return makeEval(compiled)
    } catch { return null }
  }, [shape, heightExpr.ascii])

  const hasCurve = !!fS

  function fullIntegral(fn,lo,hi,n) {
    return unbounded?integrateExtended(fn,Math.min(boundA,boundB),Math.max(boundA,boundB)).value:integrateSimpson(fn,lo,hi,n)
  }
  // Volume: ∫ A(x) dx with the shape's area formula (Simpson's, NaN-safe)
  let volume = NaN
  if (hasCurve) {
    volume = fullIntegral((x) => {
      if(!Number.isFinite(fS(x))||(shape==='rectangle'&&fH&&!Number.isFinite(fH(x))))return NaN
      const { s, h } = sizesAt(fS, fH, shape, x)
      return crossSectionArea(shape, s, h)
    }, Math.min(a,b), Math.max(a,b), 400)
  }

  const midX=(a+b)/2
  let low=Infinity,high=-Infinity
  if(hasCurve)for(let i=0;i<=100;i++) {
    const r=regionAt(fTop,fBottom,a+(b-a)*i/100)
    if(r){low=Math.min(low,r.lower);high=Math.max(high,r.upper)}
  }
  const ySpan=Number.isFinite(high-low)?high-low:0
  const yCenter=Number.isFinite(low+high)?(low+high)/2:0
  const graphBounds = functionBounds([fTop,fBottom], a, b)
  const view=usePlotView(Math.max(4,Math.abs(b-a)*.65,ySpan*.65),midX,yCenter, { key: `${expr.ascii}|${bottomExpr.ascii}|${a}|${b}`, bounds: graphBounds })

  return (
    <div className="viz-layout">
      {/* ── Left panel ── */}
      <div className="viz-panel">
        <div className="viz-header">
          <span className="viz-title">Volume by Cross Section</span>
        </div>
        {unbounded&&<UnboundedNotice a={a} b={b} boundA={boundA} boundB={boundB} reach={reach} setReach={setReach}/>}

        <div className="viz-section">
          <label className="viz-field-label">Top boundary</label>
          <MathInput value={expr.latex} branchValue={topBranch} onBranchChange={setTopBranch}
            onInput={(latex,ascii,functionLatex,relation)=>setExpr({latex,ascii,functionLatex,hasBranches:!!relation?.branches,domain:relation?.domain,oppositeExpression:relation?.oppositeExpression})} autoFocus />
          {expr.hasBranches&&<button className="viz-btn" onClick={useBothBranches}>Use both branches</button>}
        </div>
        <div className="viz-section">
          <label className="viz-field-label">Bottom boundary (blank = 0)</label>
          <MathInput value={bottomExpr.latex} defaultBranch="lower" branchValue={bottomBranch} onBranchChange={setBottomBranch}
            onInput={(latex,ascii,functionLatex)=>setBottomExpr({latex,ascii,functionLatex})} />
          <span className="viz-hint">The cross-section base is the distance between the boundaries, including below the x-axis.</span>
        </div>

        {/* Rectangle height input */}
        {shape === 'rectangle' && (
          <div className="viz-section">
            <label className="viz-field-label">h(x) — rectangle height</label>
            <MathInput onInput={(latex, ascii, functionLatex) => setHeightExpr({ latex, ascii, functionLatex })} />
          </div>
        )}

        <div className="viz-section viz-row">
          <div className="viz-field">
            <label className="viz-field-label">a</label>
            <BoundInput className="viz-num-input" aria-label="Interval start a" value={boundA}
              onChange={setA} step="any" />
          </div>
          <div className="viz-field">
            <label className="viz-field-label">b</label>
            <BoundInput className="viz-num-input" aria-label="Interval end b" value={boundB}
              onChange={setB} step="any" />
          </div>
        </div>

        {/* Cross-section shape selector */}
        <div className="viz-section">
          <label className="viz-field-label">Cross Section Shape</label>
          <div className="viz-chips">
            {SHAPES.map(s => (
              <button key={s.key}
                className={`viz-chip ${shape === s.key ? 'active' : ''}`}
                onClick={() => setShape(s.key)}
              >{s.label}</button>
            ))}
          </div>
        </div>

        {/* Animation controls */}
        <div className="viz-section viz-btn-row">
          <button className={`viz-btn ${playing ? 'playing' : ''}`} onClick={togglePlay}>
            {playing ? 'Pause' : 'Play'}
          </button>
          <button className="viz-btn" onClick={resetAnim}>Reset</button>
        </div>

        {/* Results */}
        {hasCurve && (
          <div className="viz-results">
            <div className="viz-formula">
              <TeX display math={String.raw`w(x)=|f_{\mathrm{top}}(x)-f_{\mathrm{bottom}}(x)|`} />
              <TeX display math={AREA_FORMULAS[shape] || ''} />
            </div>
            <div className="viz-formula">
              <TeX display math={`V = \\int_{${texBound(Math.min(boundA,boundB))}}^{${texBound(Math.max(boundA,boundB))}} A(x) \\, dx`} />
            </div>
            <div className="viz-result-row">
              <span className="viz-result-label">Volume</span>
              <span className="viz-result-value accent">{fmtNum(volume)}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Right side ── */}
      <div className="viz-main">
        {/* 2D / 3D toggle */}
        <div className="viz-toggle" aria-label="Graph dimension">
          <button aria-pressed={!view3d} className={`viz-toggle-btn ${!view3d ? 'active' : ''}`}
            onClick={() => setView3d(false)}>2D</button>
          <button aria-pressed={view3d} className={`viz-toggle-btn ${view3d ? 'active' : ''}`}
            onClick={() => setView3d(true)}>3D</button>
        </div>

        <InfiniteSlices checked={infiniteSlices} onChange={setInfiniteSlices} />
        <ContactToggle checked={highlightContacts} onChange={setHighlightContacts} disabled={infiniteSlices} />
        {/* Slice count slider */}
        <VizSlider
          label={<>Slices = <strong>{infiniteSlices ? '∞' : sliceCount}</strong></>}
          min={1} max={50} step={1} value={sliceCount}
          onChange={setSliceCount} disabled={infiniteSlices}
        />

        {/* Transparent / Wireframe toggle (3D only) */}
        {view3d && (
          <div className="viz-toggle">
            <button className={`viz-toggle-btn ${display === 'glass' ? 'active' : ''}`}
              onClick={() => setDisplay('glass')}>Transparent</button>
            <button className={`viz-toggle-btn ${display === 'wire' ? 'active' : ''}`}
              onClick={() => setDisplay('wire')}>Wireframe</button>
          </div>
        )}

        <div className="viz-graph">
          {view3d && <div className="scene-key-hint">Click the 3D view · Arrow keys rotate · Shift + arrows pan</div>}
          {!view3d ? (
            <div className="cs-2d-wrap" onWheel={view.handleWheel}>
              <View2D hasCurve={hasCurve} fTop={fTop} fBottom={fBottom} a={a} b={b} sliceCount={sliceCount}
                xMin={view.xMin} xMax={view.xMax} yMin={view.yMin} yMax={view.yMax}
                onRelayout={view.handleRelayout} infiniteSlices={infiniteSlices} highlightContacts={highlightContacts} />
              <ZoomControls onZoomIn={view.zoomIn} onZoomOut={view.zoomOut} onReset={view.resetView} />
            </div>
          ) : (
            // localClippingEnabled lets the reveal animation clip the solid
            <Canvas camera={{ position: [b + 3, 4, 5], fov: 50 }} gl={{ localClippingEnabled: true }}>
              <FitSceneControls fitKey={`${expr.ascii}|${bottomExpr.ascii}|${heightExpr.ascii}|${a}|${b}|${shape}`} />
              <Scene3D hasCurve={hasCurve} fS={fS} fH={fH} fBase={fBase} fTop={fTop} fBottom={fBottom} a={a} b={b} shape={shape}
                sliceCount={sliceCount} animProgress={animProgress}
                controlsRef={controlsRef} display={display} infiniteSlices={infiniteSlices} highlightContacts={highlightContacts} />
            </Canvas>
          )}
        </div>
      </div>
    </div>
  )
}
