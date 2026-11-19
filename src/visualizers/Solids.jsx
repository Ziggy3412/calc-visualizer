import BoundInput from '../components/BoundInput'
import UnboundedNotice from '../components/UnboundedNotice'
import useExtendedBounds from '../shared/useExtendedBounds'
import { integrateExtended,texBound } from '../shared/infinity'
import NumberInput from '../components/NumberInput'
import FitSceneControls from '../components/FitSceneControls'
import RevolutionProfile from '../components/RevolutionProfile'
import ContactPoints, { ContactToggle } from '../components/ContactPoints'
import { contactPoints } from '../shared/contactPoints'
import KeyboardOrbitControls from '../components/KeyboardOrbitControls'
import { useAppearance } from '../shared/appearance'
import SceneLighting from '../components/SceneLighting'
import InfiniteSlices from '../components/InfiniteSlices'
import { useState, useEffect, useRef, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { GizmoHelper, GizmoViewcube, Line, Html, Edges } from '@react-three/drei'
import * as THREE from 'three'
import * as math from 'mathjs'
import TeX from '../components/TeX'
import MathInput from '../components/MathInput'
import VizSlider from '../components/VizSlider'
import { makeEval, integrateSimpson, findSignChanges, fmtNum } from '../shared/numerics'
import './Solids.css'

// Round a number for display in formulas (3 decimals, trailing zeros dropped).
const fmt = (x) => fmtNum(x, 3)

// ─── Geometry helpers ───────────────────────────────────────────

function buildGeo(positions, indices) {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setIndex(indices)
  g.computeVertexNormals()
  return g
}

// A point of the region's boundary in the flat (X, Y) plane.
// funcOf 'x' → the curve value is a height y, so point = (t, value).
// funcOf 'y' → the curve value is an x position, so point = (value, t).
function planePoint(value, t, funcOf) {
  return funcOf === 'y' ? [value, t] : [t, value]
}

// Revolve a flat point (px, py) by angle theta around the axis of revolution.
//   axisOrient 'h' → horizontal axis y = c (runs along X)
//   axisOrient 'v' → vertical axis   x = c (runs along Y)
function revolve(px, py, axisOrient, c, theta) {
  if (axisOrient === 'h') {
    const r = py - c
    return [px, c + r * Math.cos(theta), r * Math.sin(theta)]
  }
  const r = px - c
  return [c + r * Math.cos(theta), py, r * Math.sin(theta)]
}

// Sample the region's closed boundary loop: curve 1 forward (a→b), then
// curve 2 back (b→a). Revolving this loop sweeps out the whole solid — the
// hole appears automatically when the region doesn't touch the axis.
function regionLoop(d1, d2, a, b, funcOf, segments) {
  const pts = []
  for (let i = 0; i <= segments; i++) {
    const t = a + ((b - a) * i) / segments
    let v = d1(t)
    if (!Number.isFinite(v)) v = 0
    pts.push(planePoint(v, t, funcOf))
  }
  for (let i = segments; i >= 0; i--) {
    const t = a + ((b - a) * i) / segments
    let v = d2(t)
    if (!Number.isFinite(v)) v = 0
    pts.push(planePoint(v, t, funcOf))
  }
  return pts
}

// Build the solid of revolution by revolving the boundary loop from 0 to
// `sweep` radians. For a partial sweep we add the flat region as end caps so
// it reads as a solid wedge.
function createSolidGeo(d1, d2, a, b, funcOf, axisOrient, c, sweep, segments = 60, radials = 64) {
  const loop = regionLoop(d1, d2, a, b, funcOf, segments)
  const L = loop.length
  const positions = []
  const indices = []

  // Swept lateral surface (this already includes the outer wall, inner wall
  // (the hole) and the end caps at t=a / t=b, because the loop contains them).
  for (let j = 0; j <= radials; j++) {
    const theta = (sweep * j) / radials
    for (let k = 0; k < L; k++) {
      const [px, py] = loop[k]
      const p = revolve(px, py, axisOrient, c, theta)
      positions.push(p[0], p[1], p[2])
    }
  }
  for (let j = 0; j < radials; j++) {
    for (let k = 0; k < L; k++) {
      const k2 = (k + 1) % L
      const a0 = j * L + k
      const b0 = j * L + k2
      const c0 = (j + 1) * L + k
      const d0 = (j + 1) * L + k2
      indices.push(a0, c0, b0, b0, c0, d0)
    }
  }

  // Flat region caps at the start and end angles (only needed when partial)
  if (sweep < 2 * Math.PI - 1e-3) {
    addRegionCap(positions, indices, d1, d2, a, b, funcOf, axisOrient, c, 0, segments)
    addRegionCap(positions, indices, d1, d2, a, b, funcOf, axisOrient, c, sweep, segments)
  }

  return buildGeo(positions, indices)
}

// Triangulate the flat region (between the two curves) at a given angle.
function addRegionCap(positions, indices, d1, d2, a, b, funcOf, axisOrient, c, theta, segments) {
  const base = positions.length / 3
  for (let i = 0; i <= segments; i++) {
    const t = a + ((b - a) * i) / segments
    let v1 = d1(t)
    let v2 = d2(t)
    if (!Number.isFinite(v1)) v1 = 0
    if (!Number.isFinite(v2)) v2 = 0
    const pp1 = planePoint(v1, t, funcOf)
    const pp2 = planePoint(v2, t, funcOf)
    const q1 = revolve(pp1[0], pp1[1], axisOrient, c, theta)
    const q2 = revolve(pp2[0], pp2[1], axisOrient, c, theta)
    positions.push(q1[0], q1[1], q1[2])
    positions.push(q2[0], q2[1], q2[2])
  }
  for (let i = 0; i < segments; i++) {
    const a0 = base + 2 * i
    const b0 = a0 + 1
    const c0 = base + 2 * (i + 1)
    const d0 = c0 + 1
    indices.push(a0, c0, b0, b0, c0, d0)
  }
}

// The flat region on its own (used to always show the un-revolved 2D region).
function createRegionGeo(d1, d2, a, b, funcOf, axisOrient, c, segments = 60) {
  const positions = []
  const indices = []
  addRegionCap(positions, indices, d1, d2, a, b, funcOf, axisOrient, c, 0, segments)
  return buildGeo(positions, indices)
}

// ─── Surface-of-revolution skin (for the Surface Area mode) ──────
//
// Surface area measures the OUTER SKIN of the revolved shape, not the filled
// volume. So we revolve ONLY curve 1 (not the closed region) and build a thin
// shell with no fill and no end caps — it reads as a surface, not a solid.
function createSurfaceSkinGeo(d1, a, b, funcOf, axisOrient, c, sweep, segments = 160, radials = 90) {
  const positions = []
  const indices = []
  for (let i = 0; i <= segments; i++) {
    const t = a + ((b - a) * i) / segments
    let v = d1(t)
    if (!Number.isFinite(v)) v = 0
    const pp = planePoint(v, t, funcOf)
    for (let j = 0; j <= radials; j++) {
      const theta = (sweep * j) / radials
      const p = revolve(pp[0], pp[1], axisOrient, c, theta)
      positions.push(p[0], p[1], p[2])
    }
  }
  const stride = radials + 1
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < radials; j++) {
      const a0 = i * stride + j
      const b0 = i * stride + j + 1
      const c0 = (i + 1) * stride + j
      const d0 = (i + 1) * stride + j + 1
      indices.push(a0, c0, b0, b0, c0, d0)
    }
  }
  return buildGeo(positions, indices)
}

// A full circumference ring at independent position t — the 2π·radius circle
// each point of the curve traces out as it revolves.
function surfaceRing(d1, t, funcOf, axisOrient, c, segs = 64) {
  let v = d1(t)
  if (!Number.isFinite(v)) v = 0
  const pp = planePoint(v, t, funcOf)
  const pts = []
  for (let j = 0; j <= segs; j++) {
    const theta = (2 * Math.PI * j) / segs
    pts.push(revolve(pp[0], pp[1], axisOrient, c, theta))
  }
  return pts
}

// Radius (distance from the axis of revolution) of curve 1 at position t.
// For a horizontal axis y=c the radius is measured in y; for a vertical axis
// x=c it's measured in x.
function surfaceRadius(d1, t, funcOf, axisOrient, c) {
  let v = d1(t)
  if (!Number.isFinite(v)) v = 0
  const pp = planePoint(v, t, funcOf)
  return axisOrient === 'h' ? Math.abs(pp[1] - c) : Math.abs(pp[0] - c)
}

// A point in the slicing plane perpendicular to the axis (for disk/washer
// slices), at independent position t and radial distance r.
function perpPoint(t, r, theta, axisOrient, c) {
  if (axisOrient === 'h') return [t, c + r * Math.cos(theta), r * Math.sin(theta)]
  return [c + r * Math.cos(theta), t, r * Math.sin(theta)]
}

// Outer / inner radii of a disk-or-washer slice at independent position t.
function diskRadii(d1, d2, t, c) {
  let v1 = d1(t)
  let v2 = d2(t)
  if (!Number.isFinite(v1)) v1 = 0
  if (!Number.isFinite(v2)) v2 = 0
  const e1 = v1 - c
  const e2 = v2 - c
  const overlap = e1 * e2 < 0 // axis passes through the region
  const Rout = Math.max(Math.abs(e1), Math.abs(e2))
  const Rin = overlap ? 0 : Math.min(Math.abs(e1), Math.abs(e2))
  return { Rout, Rin }
}

// Disk / washer slice as a short CYLINDER of thickness `thickness` spanning
// [t - thickness/2, t + thickness/2] along the axis. Outer wall (Rout), inner
// wall (Rin → 0 gives a solid disk), and the two annular end caps.
function createDiskSliceGeo(d1, d2, t, axisOrient, c, thickness, radials = 48) {
  const { Rout, Rin } = diskRadii(d1, d2, t, c)
  const t0 = t - thickness / 2
  const t1 = t + thickness / 2
  const positions = []
  const indices = []
  // Per angle step: outer@t0, outer@t1, inner@t0, inner@t1
  for (let j = 0; j <= radials; j++) {
    const th = (2 * Math.PI * j) / radials
    const o0 = perpPoint(t0, Rout, th, axisOrient, c)
    const o1 = perpPoint(t1, Rout, th, axisOrient, c)
    const i0 = perpPoint(t0, Rin, th, axisOrient, c)
    const i1 = perpPoint(t1, Rin, th, axisOrient, c)
    positions.push(o0[0], o0[1], o0[2])
    positions.push(o1[0], o1[1], o1[2])
    positions.push(i0[0], i0[1], i0[2])
    positions.push(i1[0], i1[1], i1[2])
  }
  for (let j = 0; j < radials; j++) {
    const base = j * 4
    const nb = (j + 1) * 4
    indices.push(base + 0, nb + 0, base + 1, base + 1, nb + 0, nb + 1) // outer wall
    indices.push(base + 2, nb + 2, base + 3, base + 3, nb + 2, nb + 3) // inner wall
    indices.push(base + 1, nb + 1, base + 3, base + 3, nb + 1, nb + 3) // cap at t1
    indices.push(base + 0, nb + 0, base + 2, base + 2, nb + 0, nb + 2) // cap at t0
  }
  return buildGeo(positions, indices)
}

// A point on a cylindrical shell of radius `rad` at dependent value depVal.
function shellPoint(depVal, rad, theta, axisOrient, c) {
  if (axisOrient === 'v') return [c + rad * Math.cos(theta), depVal, rad * Math.sin(theta)]
  return [depVal, c + rad * Math.cos(theta), rad * Math.sin(theta)]
}

// Height (dependent extent) and radius of a shell at independent position t.
function shellInfo(d1, d2, t, c) {
  let v1 = d1(t)
  let v2 = d2(t)
  if (!Number.isFinite(v1)) v1 = 0
  if (!Number.isFinite(v2)) v2 = 0
  const top = Math.max(v1, v2)
  const bot = Math.min(v1, v2)
  return { rad: Math.abs(t - c), top, bot, h: top - bot }
}

// Concentric cylindrical shell at independent position t, built as a
// thick-walled open tube: an outer wall (radius rad + thickness/2), an inner
// wall (radius rad - thickness/2), and the top/bottom annular caps joining
// them. The wall thickness lets the user see the shells nest into each other.
function createShellSliceGeo(d1, d2, t, axisOrient, c, thickness, radials = 48) {
  const { rad, top, bot } = shellInfo(d1, d2, t, c)
  const Ro = rad + thickness / 2
  const Ri = Math.max(0, rad - thickness / 2)
  const positions = []
  const indices = []
  // Per angle step push 4 verts: outer-bottom, outer-top, inner-bottom, inner-top
  for (let j = 0; j <= radials; j++) {
    const th = (2 * Math.PI * j) / radials
    const ob = shellPoint(bot, Ro, th, axisOrient, c)
    const ot = shellPoint(top, Ro, th, axisOrient, c)
    const ib = shellPoint(bot, Ri, th, axisOrient, c)
    const it = shellPoint(top, Ri, th, axisOrient, c)
    positions.push(ob[0], ob[1], ob[2])
    positions.push(ot[0], ot[1], ot[2])
    positions.push(ib[0], ib[1], ib[2])
    positions.push(it[0], it[1], it[2])
  }
  for (let j = 0; j < radials; j++) {
    const base = j * 4
    const nb = (j + 1) * 4
    indices.push(base + 0, nb + 0, base + 1, base + 1, nb + 0, nb + 1) // outer wall
    indices.push(base + 2, nb + 2, base + 3, base + 3, nb + 2, nb + 3) // inner wall
    indices.push(base + 1, nb + 1, base + 3, base + 3, nb + 1, nb + 3) // top cap
    indices.push(base + 0, nb + 0, base + 2, base + 2, nb + 0, nb + 2) // bottom cap
  }
  return buildGeo(positions, indices)
}

// ─── 3D Scene ───────────────────────────────────────────────────

function Scene3D({
  hasCurve, d1, d2, a, b, funcOf, axisOrient, c,
  method, compatible, sliceCount, repT, showSlice,
  sweep01, reveal01, display, target,
  measure, ringCount, infiniteSlices, highlightContacts,
}) {
  const { settings } = useAppearance()
  const sweep = Math.max(0.0001, sweep01 * 2 * Math.PI)
  const isSurface = measure === 'surface'

  // The revolving solid (rebuilt as the sweep angle grows). Only needed in the
  // Volume mode — Surface Area mode draws the thin skin instead.
  const solidGeo = useMemo(() => {
    if (!hasCurve || isSurface) return null
    try {
      return createSolidGeo(d1, d2, a, b, funcOf, axisOrient, c, sweep)
    } catch {
      return null
    }
  }, [hasCurve, isSurface, d1, d2, a, b, funcOf, axisOrient, c, sweep])

  useEffect(() => () => solidGeo && solidGeo.dispose(), [solidGeo])

  // The surface-of-revolution skin (Surface Area mode only).
  const surfaceGeo = useMemo(() => {
    if (!hasCurve || !isSurface) return null
    try {
      return createSurfaceSkinGeo(d1, a, b, funcOf, axisOrient, c, sweep)
    } catch {
      return null
    }
  }, [hasCurve, isSurface, d1, a, b, funcOf, axisOrient, c, sweep])

  useEffect(() => () => surfaceGeo && surfaceGeo.dispose(), [surfaceGeo])

  // Representative circumference rings (the 2π·radius circles being summed).
  const rings = useMemo(() => {
    if (!hasCurve || !isSurface || infiniteSlices || ringCount < 1) return []
    const out = []
    for (let k = 0; k < ringCount; k++) {
      const t = a + ((k + 0.5) * (b - a)) / ringCount
      const r = surfaceRadius(d1, t, funcOf, axisOrient, c)
      if (r > 1e-4) out.push(surfaceRing(d1, t, funcOf, axisOrient, c))
    }
    return out
  }, [hasCurve, isSurface, infiniteSlices, ringCount, d1, a, b, funcOf, axisOrient, c])

  // The flat 2D region, always shown in its plane
  const regionGeo = useMemo(() => {
    if (!hasCurve) return null
    try {
      return createRegionGeo(d1, d2, a, b, funcOf, axisOrient, c)
    } catch {
      return null
    }
  }, [hasCurve, d1, d2, a, b, funcOf, axisOrient, c])

  useEffect(() => () => regionGeo && regionGeo.dispose(), [regionGeo])

  // Representative slices, positioned at evenly spaced midpoints.
  // Shells get a wall thickness ≈ the subinterval width and are ordered
  // inner→outer (by radius) so they reveal nesting outward from the axis.
  const slices = useMemo(() => {
    if (!hasCurve || isSurface || infiniteSlices || !compatible || sliceCount < 1) return []
    const fullWidth = Math.abs((b - a) / sliceCount)
    // Disks stack flush (full slice width → no gaps, a stair-step solid).
    // Shells keep a small radial gap so the nesting stays visible.
    const diskThickness = fullWidth
    const shellThickness = fullWidth * 0.85
    const out = []
    for (let i = 0; i < sliceCount; i++) {
      const t = a + ((i + 0.5) * (b - a)) / sliceCount
      try {
        const geo =
          method === 'shell'
            ? createShellSliceGeo(d1, d2, t, axisOrient, c, shellThickness)
            : createDiskSliceGeo(d1, d2, t, axisOrient, c, diskThickness)
        out.push({ t, geo, radius: Math.abs(t - c) })
      } catch {
        /* skip */
      }
    }
    // Shells nest outward from the axis → reveal nearest-the-axis first.
    // Disks/washers stay in t order (left→right for x, bottom→top for y).
    if (method === 'shell') out.sort((s1, s2) => s1.radius - s2.radius)
    return out
  }, [hasCurve, isSurface, infiniteSlices, compatible, sliceCount, d1, d2, a, b, axisOrient, c, method])

  useEffect(() => () => slices.forEach((s) => s.geo.dispose()), [slices])

  // The single draggable "representative slice" highlighted opaque
  const repInfo = useMemo(() => {
    if (!showSlice || !hasCurve || isSurface || infiniteSlices || !compatible) return null
    try {
      if (method === 'shell') {
        const { rad, top, h } = shellInfo(d1, d2, repT, c)
        const thickness = Math.abs((b - a) / Math.max(1, sliceCount)) * 0.85
        const geo = createShellSliceGeo(d1, d2, repT, axisOrient, c, thickness)
        const label = shellPoint(top, rad, 0.5, axisOrient, c)
        return { geo, label, text: `r = ${rad.toFixed(2)},  h = ${h.toFixed(2)}` }
      }
      const { Rout, Rin } = diskRadii(d1, d2, repT, c)
      const thickness = Math.abs((b - a) / Math.max(1, sliceCount)) // full width
      const geo = createDiskSliceGeo(d1, d2, repT, axisOrient, c, thickness)
      const label = perpPoint(repT, Rout, 0.5, axisOrient, c)
      const text = Rin > 1e-4 ? `R = ${Rout.toFixed(2)},  r = ${Rin.toFixed(2)}` : `R = ${Rout.toFixed(2)}`
      return { geo, label, text }
    } catch {
      return null
    }
  }, [showSlice, hasCurve, isSurface, infiniteSlices, compatible, method, d1, d2, repT, axisOrient, c, b, a, sliceCount])

  useEffect(() => () => repInfo && repInfo.geo.dispose(), [repInfo])

  // Boundary curve lines drawn in the flat plane (z = 0)
  const curveLines = useMemo(() => {
    if (!hasCurve) return { c1: null, c2: null }
    const steps = 120
    const c1 = []
    const c2 = []
    for (let i = 0; i <= steps; i++) {
      const t = a + ((b - a) * i) / steps
      const v1 = d1(t)
      const v2 = d2(t)
      if (Number.isFinite(v1)) {
        const p = planePoint(v1, t, funcOf)
        c1.push([p[0], p[1], 0])
      }
      if (Number.isFinite(v2)) {
        const p = planePoint(v2, t, funcOf)
        c2.push([p[0], p[1], 0])
      }
    }
    return { c1: c1.length > 1 ? c1 : null, c2: c2.length > 1 ? c2 : null }
  }, [hasCurve, d1, d2, a, b, funcOf])

  // Axis of revolution as a long line
  const axisPoints = useMemo(() => {
    const big = Math.max(8, Math.abs(a), Math.abs(b)) + 4
    if (axisOrient === 'h') return [[-big, c, 0], [big, c, 0]]
    return [[c, -big, 0], [c, big, 0]]
  }, [axisOrient, c, a, b])

  // How many slices have been revealed by the integrate phase. They pop in
  // one at a time (staggered) in the order built above — inner→outer for
  // shells, left→right / bottom→top for disks/washers.
  const revealCount = Math.ceil(reveal01 * slices.length - 1e-9)

  // Render a revolved mesh (the solid or the surface skin) in the chosen view
  // mode. Glass = see-through, Solid = opaque, Wireframe = frame only. Shared
  // by both the Volume and Surface Area modes so the toggle works everywhere.
  function revolvedMesh(geo, color, edgeColor) {
    if (!geo) return null
    if (display === 'wire') {
      return (
        <group>
          {/* Inverted wireframe: faces filled with colour, frame lines white. */}
          <mesh geometry={geo}>
            <meshStandardMaterial color={color} roughness={0.38} metalness={0.08} transparent opacity={0.55} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          <mesh geometry={geo}>
            <meshBasicMaterial color={settings.wireColor} wireframe transparent opacity={0.9} depthWrite={false} />
          </mesh>
        </group>
      )
    }
    const solidView = display === 'solid'
    return (
      <mesh geometry={geo} renderOrder={0}>
        <meshStandardMaterial
          color={color}
          metalness={0.1}
          roughness={0.38}
          transparent={!solidView}
          opacity={solidView ? 1 : 0.42}
          side={THREE.DoubleSide}
          depthWrite={solidView}
          depthTest
        />
        {/* Outline the silhouette/rims of the revolved cylinder so its shape
            reads clearly in both glass and solid views. */}
        <Edges threshold={15} color={edgeColor} />
      </mesh>
    )
  }

  return (
    <>
<SceneLighting target={target} />

      {hasCurve && highlightContacts && !infiniteSlices && <ContactPoints points={isSurface
        ? contactPoints(d1, a, b, ringCount).map(([t, value]) => [...planePoint(value, t, funcOf), 0])
        : slices.slice(0, revealCount).flatMap(s => [d1, d2].map(f => { const value = f(s.t); return Number.isFinite(value) ? [...planePoint(value, s.t, funcOf), 0] : null }).filter(Boolean))} />}
      <KeyboardOrbitControls makeDefault target={target} />
      <GizmoHelper alignment="top-right" margin={[80, 80]}>
        <GizmoViewcube />
      </GizmoHelper>
      <gridHelper visible={settings.showGrid} args={[24, 24, settings.axisColor, settings.gridColor]} />

      {/* Axis of revolution */}
      {settings.showAxes && <Line points={axisPoints} color={settings.axisColor} lineWidth={2} />}

      {/* Flat 2D region in its plane (Volume mode only). meshBasicMaterial is
          unlit, so the green shows uniformly from both the +z and -z sides. */}
      {!isSurface && regionGeo && (
        <mesh geometry={regionGeo}>
          <meshBasicMaterial color={settings.regionColor} transparent opacity={0.42} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}
      {curveLines.c1 && <Line points={curveLines.c1} color={settings.curve1} lineWidth={2} />}
      {curveLines.c2 && <Line points={curveLines.c2} color={settings.curve4} lineWidth={2} />}

      {/* Volume mode: the revolving filled solid */}
      {!isSurface && revolvedMesh(solidGeo, settings.solidColor, settings.curve1)}

      {/* Surface Area mode: the thin skin + the 2π·radius circumference rings */}
      {isSurface && revolvedMesh(surfaceGeo, settings.solidColor, settings.curve1)}
      {isSurface &&
        rings.map((pts, i) => (
          <Line key={`ring-${i}`} points={pts} color={settings.sliceColor} lineWidth={2} />
        ))}

      {/* Representative slices, revealed one by one by the integrate phase.
          Transparent-shell rendering fixes:
            - side: DoubleSide  → inner + outer walls both render
            - depthWrite: false → overlapping shells don't occlude by draw order
            - depthTest: true   → they still respect opaque scene depth
            - renderOrder = i    → slices are sorted innermost→outermost, so this
              blends them back-to-front consistently from any camera angle. */}
      {slices.map(
        (s, i) =>
          i < revealCount && (
            <mesh key={i} geometry={s.geo} renderOrder={i + 1}>
              <meshStandardMaterial
                color={settings.sliceColor}
                transparent
                opacity={0.45}
                side={THREE.DoubleSide}
                depthWrite={false}
                depthTest
              />
              {/* Outline each slice's rims so the individual coins/shells read clearly */}
              <Edges threshold={15} color={settings.sliceColor} />
            </mesh>
          ),
      )}

      {/* Highlighted draggable representative slice + live label */}
      {repInfo && (
        <>
          <mesh geometry={repInfo.geo} renderOrder={1000}>
            <meshStandardMaterial
              color={settings.sliceColor}
              transparent
              opacity={0.8}
              side={THREE.DoubleSide}
              depthWrite={false}
              depthTest
            />
            <Edges threshold={15} color={settings.sliceColor} />
          </mesh>
          <Html position={repInfo.label} center distanceFactor={10}>
            <div className="sol-slice-label">{repInfo.text}</div>
          </Html>
        </>
      )}
    </>
  )
}

// ─── Main Component ─────────────────────────────────────────────

const AXIS_OPTIONS = [
  { key: 'xaxis', label: 'x-axis (y=0)', orient: 'h', custom: false },
  { key: 'yaxis', label: 'y-axis (x=0)', orient: 'v', custom: false },
  { key: 'hc', label: 'y = c', orient: 'h', custom: true },
  { key: 'vc', label: 'x = c', orient: 'v', custom: true },
]

export default function Solids({ initial = {} }) {
  const [view3d, setView3d] = useState(true)
  const [highlightContacts, setHighlightContacts] = useState(false)
  const [infiniteSlices, setInfiniteSlices] = useState(false)
  const [expr1, setExpr1] = useState(initial.expr1 ?? { latex: '', ascii: '' })
  const [expr2, setExpr2] = useState(initial.expr2 ?? { latex: '', ascii: '' })
  const [funcOf, setFuncOf] = useState('x') // 'x' → y=f(x), 'y' → x=g(y)
  const {a,b,boundA,boundB,setA,setB,unbounded,reach,setReach}=useExtendedBounds(initial,0,2)
  const [axisKey, setAxisKey] = useState(initial.axisKey ?? 'xaxis')
  const [customC, setCustomC] = useState(initial.customC ?? 0)
  const [method, setMethod] = useState(initial.method ?? 'disk')
  const [sliceCount, setSliceCount] = useState(12)
  const [repT, setRepT] = useState(1)
  const [showSlice, setShowSlice] = useState(true)
  const [display, setDisplay] = useState('glass') // 'glass' | 'solid' | 'wire'
  const [boundsMsg, setBoundsMsg] = useState('')
  // What to measure: 'volume' (the filled solid) or 'surface' (the outer skin).
  const [measure, setMeasure] = useState('volume')
  const [ringCount, setRingCount] = useState(8)   // circumference rings (surface mode)
  const isSurface = measure === 'surface'

  // Animation: revolve first, then the slices appear along the interval
  const [playing, setPlaying] = useState(false)
  const [phase, setPhase] = useState('idle') // 'idle' | 'revolve' | 'integrate'
  const [sweep01, setSweep01] = useState(1)
  const [reveal01, setReveal01] = useState(1)
  const animRef = useRef(null)
  const lastRef = useRef(null)

  useEffect(() => {
    if (!playing) {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      lastRef.current = null
      return
    }
    function tick(ts) {
      if (!lastRef.current) lastRef.current = ts
      const dt = (ts - lastRef.current) / 1000
      lastRef.current = ts
      if (phase === 'revolve') {
        setSweep01((p) => {
          const n = p + dt / 3
          if (n >= 1) {
            // Surface Area mode has no slices to reveal — stop after revolving.
            if (isSurface) { setPlaying(false); setPhase('idle') }
            else setPhase('integrate')
            return 1
          }
          return n
        })
      } else if (phase === 'integrate') {
        setReveal01((p) => {
          const n = p + dt / 3.5
          if (n >= 1) { setPlaying(false); setPhase('idle'); return 1 }
          return n
        })
      }
      animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [playing, phase, isSurface])

  function togglePlay() {
    if (playing) { setPlaying(false); return }
    if (phase === 'idle') { setPhase('revolve'); setSweep01(0); setReveal01(0) }
    lastRef.current = null
    setPlaying(true)
  }
  function resetAnim() { setPlaying(false); setPhase('idle'); setSweep01(1); setReveal01(1) }

  // Manual sweep scrubber: stop the scripted animation and just show revolve
  function onSweepSlider(deg) {
    setPlaying(false)
    setPhase('idle')
    setSweep01(deg / 360)
    setReveal01(0)
  }

  // Resolve the axis
  const axisOption = AXIS_OPTIONS.find((o) => o.key === axisKey) || AXIS_OPTIONS[0]
  const axisOrient = axisOption.orient
  const c = axisOption.custom ? customC : 0

  // Compile expressions (memoized on the typed text)
  const fn1 = useMemo(() => {
    try { return expr1.ascii.trim() ? math.compile(expr1.ascii) : null } catch { return null }
  }, [expr1.ascii])
  const fn2 = useMemo(() => {
    try { return expr2.ascii.trim() ? math.compile(expr2.ascii) : null } catch { return null }
  }, [expr2.ascii])

  const variable = funcOf === 'y' ? 'y' : 'x'
  const d1 = useMemo(() => makeEval(fn1, variable), [fn1, variable])
  const d2 = useMemo(() => (fn2 ? makeEval(fn2, variable) : () => 0), [fn2, variable])
  const hasCurve = !!fn1

  // Which method is valid for this axis + variable
  const diskCompatible = (axisOrient === 'h' && funcOf === 'x') || (axisOrient === 'v' && funcOf === 'y')
  const shellCompatible = (axisOrient === 'v' && funcOf === 'x') || (axisOrient === 'h' && funcOf === 'y')
  const compatible = method === 'shell' ? shellCompatible : diskCompatible

  // Does the solid have a hole? (offset axis or two curves)
  const hasInner = !!expr2.ascii.trim() || (c !== 0 && method !== 'shell')

  // Detect the axis passing through the region (overlap) for a gentle warning
  let overlapWarn = false
  if (hasCurve && compatible) {
    if (method === 'shell') {
      overlapWarn = c > Math.min(a, b) && c < Math.max(a, b)
    } else {
      const steps = 60
      for (let i = 0; i <= steps; i++) {
        const t = a + ((b - a) * i) / steps
        const v1 = d1(t)
        const v2 = d2(t)
        if (Number.isFinite(v1) && Number.isFinite(v2) && (v1 - c) * (v2 - c) < 0) {
          overlapWarn = true
          break
        }
      }
    }
  }

  // Riemann shell-sum estimate: Σ 2π·radius·height·Δt at the shell midpoints.
  // As the slice count rises this converges toward the exact integral.
  let shellSum = NaN
  if (hasCurve && compatible && method === 'shell') {
    const dt = (b - a) / sliceCount
    let sum = 0
    for (let i = 0; i < sliceCount; i++) {
      const t = a + (i + 0.5) * dt
      const v1 = d1(t)
      const v2 = d2(t)
      if (!Number.isFinite(v1) || !Number.isFinite(v2)) { sum = NaN; break }
      const h = Math.abs(v1 - v2)
      sum += 2 * Math.PI * Math.abs(t - c) * h * Math.abs(dt)
    }
    shellSum = sum
  }

  function fullIntegral(fn,lo,hi,n) {
    return unbounded?integrateExtended(fn,Math.min(boundA,boundB),Math.max(boundA,boundB)).value:integrateSimpson(fn,Math.min(lo,hi),Math.max(lo,hi),n)
  }

  // Volume (numeric)
  let volume = NaN
  if (hasCurve && compatible) {
    if (method === 'shell') {
      volume = fullIntegral((t) => {
        if(!Number.isFinite(d1(t))||!Number.isFinite(d2(t)))return NaN
        const v1 = d1(t)
        const v2 = d2(t)
        const h = Math.abs((Number.isFinite(v1) ? v1 : 0) - (Number.isFinite(v2) ? v2 : 0))
        return 2 * Math.PI * Math.abs(t - c) * h
      }, a, b)
    } else {
      volume = fullIntegral((t) => {
        if(!Number.isFinite(d1(t))||!Number.isFinite(d2(t)))return NaN
        const { Rout, Rin } = diskRadii(d1, d2, t, c)
        return Math.PI * (Rout * Rout - Rin * Rin)
      }, a, b)
    }
  }

  // KaTeX formula with the real numbers substituted
  const formulaLatex = useMemo(() => {
    const dv = funcOf === 'y' ? 'dy' : 'dx'
    const va = variable
    const f = expr1.functionLatex || expr1.latex || `f(${va})`
    const g = expr2.functionLatex || expr2.latex || '0'
    const A = texBound(Math.min(boundA,boundB))
    const B = texBound(Math.max(boundA,boundB))
    const C = fmt(c)
    if (method === 'shell') {
      const rad = c === 0 ? va : `\\left|${va}-${C}\\right|`
      const ht = expr2.latex ? `\\left(${f}-${g}\\right)` : f
      return `V = 2\\pi \\int_{${A}}^{${B}} ${rad}\\,${ht}\\,${dv}`
    }
    const Rt = c === 0 ? `\\left(${f}\\right)` : `\\left(${f}-${C}\\right)`
    if (hasInner) {
      const rt = expr2.latex ? `\\left(${g}-${C}\\right)` : `\\left(${C}\\right)`
      return `V = \\pi \\int_{${A}}^{${B}} \\left[${Rt}^2 - ${rt}^2\\right] ${dv}`
    }
    return `V = \\pi \\int_{${A}}^{${B}} ${Rt}^2 \\, ${dv}`
  }, [method, funcOf, variable, expr1.latex, expr2.latex, expr1.functionLatex, expr2.functionLatex, boundA, boundB, c, hasInner])

  // ── Surface area of revolution (the outer skin of curve 1) ──
  // Derivative of curve 1 w.r.t. its independent variable, for the arc-length
  // element ds = √(1 + (dv/dt)²) dt.
  const d1primeNode = useMemo(() => {
    if (!expr1.ascii.trim()) return null
    try { return math.derivative(math.parse(expr1.ascii), variable) } catch { return null }
  }, [expr1.ascii, variable])
  const d1prime = useMemo(() => makeEval(d1primeNode?.compile(), variable), [d1primeNode, variable])
  const d1primeLatex = useMemo(() => {
    try { return d1primeNode?.toTex() || "f'" } catch { return "f'" }
  }, [d1primeNode])

  // SA = 2π ∫ radius·√(1 + (dv/dt)²) dt, with radius = distance from the axis.
  let surfaceArea = NaN
  if (hasCurve && isSurface) {
    surfaceArea = fullIntegral((t) => {
      if(!Number.isFinite(d1(t))||!Number.isFinite(d1prime(t)))return NaN
      const r = surfaceRadius(d1, t, funcOf, axisOrient, c)
      let fp = d1prime(t)
      if (!Number.isFinite(fp)) fp = 0
      return 2 * Math.PI * r * Math.sqrt(1 + fp * fp)
    }, a, b)
  }

  // KaTeX formula for the surface area with the real numbers substituted.
  const surfaceFormulaLatex = (() => {
    const va = variable
    const f = expr1.functionLatex || expr1.latex || `f(${va})`
    const A = texBound(Math.min(boundA,boundB)), B = texBound(Math.max(boundA,boundB)), C = fmt(c)
    const dv = funcOf === 'y' ? 'dy' : 'dx'
    // Radius is the distance from the axis: y-distance for a horizontal axis,
    // x-distance for a vertical one.
    const yVal = funcOf === 'x' ? f : va     // the point's y in the plane
    const xVal = funcOf === 'x' ? va : f     // the point's x in the plane
    const measured = axisOrient === 'h' ? yVal : xVal
    const radius = c === 0 ? `\\left|${measured}\\right|` : `\\left|${measured} - ${C}\\right|`
    return `SA = 2\\pi \\int_{${A}}^{${B}} ${radius}\\,\\sqrt{1 + \\left(${d1primeLatex}\\right)^2}\\,${dv}`
  })()

  // Auto-compute bounds from the curve intersection (or where curve 1 = 0)
  function autoBounds() {
    if (!fn1) { setBoundsMsg('Enter curve 1 first.') ; return }
    const g = (t) => {
      const v1 = d1(t)
      const v2 = d2(t)
      return (Number.isFinite(v1) ? v1 : NaN) - (Number.isFinite(v2) ? v2 : NaN)
    }
    const roots = findSignChanges(g, -50, 50, 6000)
    if (roots.length >= 2) {
      const lo = Math.round(roots[0] * 1e6) / 1e6
      const hi = Math.round(roots[roots.length - 1] * 1e6) / 1e6
      setA(lo)
      setB(hi)
      setRepT((lo + hi) / 2)
      setBoundsMsg(`Found bounds at ${fmt(lo)} and ${fmt(hi)}.`)
    } else if (roots.length === 1) {
      setBoundsMsg('Only one intersection found — set the other bound manually.')
    } else {
      setBoundsMsg('No intersections found in [-50, 50].')
    }
  }

  const needsCustom = axisOption.custom
  const sliceLo = Math.min(a, b)
  const sliceHi = Math.max(a, b)
  // Keep the representative slice within the interval by clamping during
  // render (no state reset needed when the bounds change).
  const repTC = Math.min(sliceHi, Math.max(sliceLo, repT))

  // Camera + orbit target framed on the region
  const camPos = [Math.max(Math.abs(a), Math.abs(b)) + 7, 6, 9]
  const target = axisOrient === 'h' ? [(a + b) / 2, c, 0] : [c, (a + b) / 2, 0]

  // Warning message (only relevant in Volume mode — surface area works for
  // any axis + variable combination).
  let warn = ''
  if (hasCurve && isSurface) {
    warn = ''
  } else if (hasCurve && !compatible) {
    const need = method === 'shell' ? (axisOrient === 'v' ? 'x' : 'y') : axisOrient === 'h' ? 'x' : 'y'
    const better = diskCompatible ? 'Disk/Washer' : 'Shell'
    warn = `For this axis with a function of ${variable}, use the ${better} method — or switch the function to be in terms of ${need}.`
  } else if (overlapWarn) {
    warn = 'Heads up: the axis passes through the region, so the revolved solid overlaps itself. The volume shown counts the swept solid.'
  }

  return (
    <div className="viz-layout">
      {/* ── Left panel ── */}
      <div className="viz-panel">
        <div className="viz-header">
          <span className="viz-title">Solids &amp; Surface Area of Revolution</span>
        </div>
        {unbounded&&<UnboundedNotice a={a} b={b} boundA={boundA} boundB={boundB} reach={reach} setReach={setReach}/>}

        {/* Measure toggle — Volume (filled solid) vs Surface Area (outer skin) */}
        <div className="viz-section">
          <label className="viz-field-label">Measure</label>
          <div className="viz-btn-row">
            <button className={`viz-btn ${measure === 'volume' ? 'active' : ''}`} onClick={() => setMeasure('volume')}>
              Volume
            </button>
            <button className={`viz-btn ${measure === 'surface' ? 'active' : ''}`} onClick={() => setMeasure('surface')}>
              Surface Area
            </button>
          </div>
        </div>

        {/* Function-of toggle */}
        <div className="viz-section">
          <label className="viz-field-label">Functions are in terms of</label>
          <div className="viz-btn-row">
            <button className={`viz-btn ${funcOf === 'x' ? 'active' : ''}`} onClick={() => setFuncOf('x')}>
              y = f(x)
            </button>
            <button className={`viz-btn ${funcOf === 'y' ? 'active' : ''}`} onClick={() => setFuncOf('y')}>
              x = g(y)
            </button>
          </div>
        </div>

        {/* Curve inputs */}
        <div className="viz-section">
          <label className="viz-field-label">Curve 1 {funcOf === 'y' ? '— x = g(y)' : '— y = f(x)'}</label>
          <MathInput value={expr1.latex} independent={variable} dependent={funcOf === 'y' ? 'x' : 'y'} onInput={(latex, ascii, functionLatex) => setExpr1({ latex, ascii, functionLatex })} autoFocus />
        </div>
        {!isSurface && (
          <div className="viz-section">
            <label className="viz-field-label">Curve 2 (optional)</label>
            <MathInput value={expr2.latex} independent={variable} dependent={funcOf === 'y' ? 'x' : 'y'} onInput={(latex, ascii, functionLatex) => setExpr2({ latex, ascii, functionLatex })} />
          </div>
        )}

        {/* Interval + auto bounds */}
        <div className="viz-section">
          <div className="viz-row">
            <div className="viz-field">
              <label className="viz-field-label">{funcOf === 'y' ? 'y from' : 'x from'} (a)</label>
              <BoundInput className="viz-num-input" aria-label="Interval start a" value={boundA} step="any"
                onChange={setA} />
            </div>
            <div className="viz-field">
              <label className="viz-field-label">to (b)</label>
              <BoundInput className="viz-num-input" aria-label="Interval end b" value={boundB} step="any"
                onChange={setB} />
            </div>
          </div>
          <button className="viz-btn sol-autobounds" onClick={autoBounds}>
            Find intersection bounds
          </button>
          {boundsMsg && <div className="viz-hint">{boundsMsg}</div>}
        </div>

        {/* Axis of revolution */}
        <div className="viz-section">
          <label className="viz-field-label">Axis of Revolution</label>
          <div className="viz-btn-grid">
            {AXIS_OPTIONS.map((opt) => (
              <button key={opt.key}
                className={`viz-btn ${axisKey === opt.key ? 'active' : ''}`}
                onClick={() => setAxisKey(opt.key)}>
                {opt.label}
              </button>
            ))}
          </div>
          {needsCustom && (
            <div className="sol-custom-axis">
              <label className="viz-field-label">c =</label>
              <NumberInput className="viz-num-input" aria-label="Rotation axis coordinate" value={customC} step="any"
                onChange={setCustomC} />
            </div>
          )}
        </div>

        {/* Method (Volume mode only — surface area measures the skin directly) */}
        {!isSurface && (
          <div className="viz-section">
            <label className="viz-field-label">Method</label>
            <div className="viz-btn-row">
              {['disk', 'washer', 'shell'].map((m) => (
                <button key={m}
                  className={`viz-btn ${method === m ? 'active' : ''}`}
                  onClick={() => setMethod(m)}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Animation controls */}
        <div className="viz-section viz-btn-row">
          <button className={`viz-btn ${playing ? 'playing' : ''}`} onClick={togglePlay}>
            {playing ? (phase === 'revolve' ? '⏸ Revolving…' : '⏸ Integrating…') : 'Play'}
          </button>
          <button className="viz-btn" onClick={resetAnim}>Reset</button>
        </div>

        {/* Results */}
        {hasCurve && (
          <div className="viz-results">
            {warn && <div className="viz-warn">⚠ {warn}</div>}

            {/* Surface Area mode */}
            {isSurface && (
              <>
                <div className="viz-formula">
                  <TeX display math={surfaceFormulaLatex} />
                </div>
                <div className="viz-result-row">
                  <span className="viz-result-label">Surface area</span>
                  <span className="viz-result-value accent">{fmtNum(surfaceArea)}</span>
                </div>
                <div className="viz-hint">
                  {infiniteSlices ? 'The continuous surface is the limit of the circumference-ring sum;' : 'The orange rings are the 2π·radius circumferences being summed;'}
                  √(1 + (f′)²) stretches each by the curve's slope (arc length ds).
                </div>
              </>
            )}

            {/* Volume mode */}
            {!isSurface && compatible && (
              <>
                <div className="viz-formula">
                  <TeX display math={formulaLatex} />
                </div>
                {method === 'shell' && !infiniteSlices && (
                  <div className="viz-result-row">
                    <span className="viz-result-label">Shell sum (n={sliceCount})</span>
                    <span className="viz-result-value estimate">{fmtNum(shellSum)}</span>
                  </div>
                )}
                <div className="viz-result-row">
                  <span className="viz-result-label">{method === 'shell' ? 'Exact volume' : 'Volume'}</span>
                  <span className="viz-result-value accent">{fmtNum(volume)}</span>
                </div>
                {method === 'shell' && !infiniteSlices && Number.isFinite(shellSum) && Number.isFinite(volume) && (
                  <div className="viz-hint">
                    Difference: {fmtNum(Math.abs(shellSum - volume))} — raise the shell count to watch it shrink.
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Right side ── */}
      <div className="viz-main">
        <div className="viz-toggle" aria-label="Graph dimension">
          <button className={`viz-toggle-btn ${!view3d ? 'active' : ''}`} aria-pressed={!view3d} onClick={() => setView3d(false)}>2D</button>
          <button className={`viz-toggle-btn ${view3d ? 'active' : ''}`} aria-pressed={view3d} onClick={() => setView3d(true)}>3D</button>
        </div>
        {/* Revolution sweep */}
        {view3d && <VizSlider
          label={<>Sweep = <strong>{Math.round(sweep01 * 360)}°</strong></>}
          min={0} max={360} step={1}
          value={Math.round(sweep01 * 360)}
          onChange={onSweepSlider}
          leftLabel="0°" rightLabel="360°"
        />}

        <InfiniteSlices checked={infiniteSlices} onChange={setInfiniteSlices} />
        <ContactToggle checked={highlightContacts} onChange={setHighlightContacts} disabled={infiniteSlices} />
        {/* Slice count (Volume mode) */}
        {!isSurface && (
          <VizSlider
            label={<>{method === 'shell' ? 'Shells' : 'Slices'} = <strong>{infiniteSlices ? '∞' : sliceCount}</strong></>}
            min={1} max={100} step={1} value={sliceCount}
            onChange={setSliceCount} disabled={infiniteSlices}
          />
        )}

        {/* Representative slice position (Volume mode) */}
        {!isSurface && <label className="slice-visibility viz-check"><input type="checkbox" checked={showSlice} onChange={e => setShowSlice(e.target.checked)} />Show selected slice</label>}
        {!isSurface && showSlice && (
          <VizSlider
            label={<>Slice at <strong>{repTC.toFixed(2)}</strong></>}
            min={sliceLo} max={sliceHi} step={(sliceHi - sliceLo) / 200 || 0.01}
            value={repTC}
            onChange={setRepT} disabled={infiniteSlices}
            leftLabel={fmt(sliceLo)} rightLabel={fmt(sliceHi)}
          />
        )}

        {/* Circumference rings (Surface Area mode) */}
        {isSurface && (
          <VizSlider
            label={<>Rings = <strong>{infiniteSlices ? '∞' : ringCount}</strong></>}
            min={0} max={30} step={1} value={ringCount}
            onChange={setRingCount} disabled={infiniteSlices}
          />
        )}

        {/* Appearance toggle — applies to both Volume and Surface Area */}
        {view3d && <div className="viz-btn-row sol-display-row">
          <span className="viz-field-label">View</span>
          {[
            ['glass', 'Glass'],
            ['solid', 'Solid'],
            ['wire', 'Wireframe'],
          ].map(([key, lbl]) => (
            <button key={key}
              className={`viz-btn ${display === key ? 'active' : ''}`}
              onClick={() => setDisplay(key)}>
              {lbl}
            </button>
          ))}
        </div>}

        <div className="viz-graph">
          {!view3d ? <RevolutionProfile hasCurve={hasCurve} d1={d1} d2={d2} hasSecond={!!fn2}
            a={a} b={b} funcOf={funcOf} axisOrient={axisOrient} c={c} isSurface={isSurface}
            sliceCount={sliceCount} ringCount={ringCount} infiniteSlices={infiniteSlices}
            highlightContacts={highlightContacts} showSlice={showSlice} repT={repTC} /> : <>
          <Canvas camera={{ position: camPos, fov: 50 }}>
            <FitSceneControls fitKey={`${expr1.ascii}|${expr2.ascii}|${a}|${b}|${funcOf}|${axisOrient}|${c}|${measure}`} />
            <Scene3D
              hasCurve={hasCurve} d1={d1} d2={d2} a={a} b={b}
              funcOf={funcOf} axisOrient={axisOrient} c={c}
              method={method} compatible={compatible}
              sliceCount={sliceCount} repT={repTC} showSlice={showSlice} infiniteSlices={infiniteSlices}
              sweep01={sweep01} reveal01={reveal01}
              display={display} target={target}
              measure={measure} ringCount={ringCount} highlightContacts={highlightContacts}
            />
          </Canvas>
          <div className="scene-key-hint">Click the 3D view · Arrow keys rotate · Shift + arrows pan</div>
          </>}
        </div>
      </div>
    </div>
  )
}
