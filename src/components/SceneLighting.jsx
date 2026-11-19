import { useAppearance } from '../shared/appearance'
import { useMemo } from 'react'
import * as THREE from 'three'

// Off-axis key light gives curved surfaces a highlight-to-shadow gradient.
// Gentle fill keeps the far side readable; the rim separates back edges.
export default function SceneLighting({ target = [0, 0, 0] }) {
  const { settings } = useAppearance()
  const aim = useMemo(() => new THREE.Object3D(), [])
  return (
    <>
    <color attach="background" args={[settings.graphBackground]} />
    <group position={target}>
      <primitive object={aim} />
      <ambientLight intensity={0.12} />
      <hemisphereLight args={['#e3efff', '#6b7280', 0.65]} />
      <directionalLight position={[-5, 8, 6]} target={aim} color={settings.keyLight} intensity={3 * settings.lighting} />
      <directionalLight position={[7, 2, 2]} target={aim} color={settings.fillLight} intensity={0.55 * settings.lighting} />
      <directionalLight position={[2, 5, -7]} target={aim} color={settings.rimLight} intensity={1.5 * settings.lighting} />
    </group>
    </>
  )
}
