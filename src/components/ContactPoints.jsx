import { useAppearance } from '../shared/appearance'

export function ContactToggle({ checked, onChange, disabled }) {
  return <label className="slice-visibility viz-check"><input type="checkbox" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} />Highlight touch points{disabled && ' (finite slices only)'}</label>
}
export default function ContactPoints({ points }) {
  const { settings } = useAppearance()
  if (!points.length) return null
  return <group>{points.map((point, i) => <mesh key={i} position={point} renderOrder={2000}>
    <sphereGeometry args={[0.055, 12, 8]} />
    <meshBasicMaterial color={settings.curve3} depthTest={false} />
  </mesh>)}</group>
}
