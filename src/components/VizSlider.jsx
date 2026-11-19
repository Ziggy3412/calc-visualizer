import { useId } from 'react'
import NumberInput from './NumberInput'
import { constrainNumber } from '../shared/numberInput'

export default function VizSlider({ label, min, max, step, value, onChange, leftLabel, rightLabel, disabled = false }) {
  const id = useId()
  return (
    <div className="viz-slider">
      <label id={`${id}-label`} htmlFor={id}>{label}</label>
      <div className="slider-track">
        <input id={id} type="range" disabled={disabled} min={min} max={max} step={step} value={value} onChange={e => onChange(constrainNumber(Number(e.target.value), min, max, step))} />
        <div className="slider-labels"><span>{leftLabel ?? min}</span><span>{rightLabel ?? max}</span></div>
      </div>
      <NumberInput className="slider-value" aria-labelledby={`${id}-label`} title="Type a precise value" min={min} max={max} step={step} value={Number(Number(value).toFixed(5))} onChange={onChange} disabled={disabled} />
    </div>
  )
}
