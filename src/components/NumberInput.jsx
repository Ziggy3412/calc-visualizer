import { formatBound } from '../shared/infinity'
import { useRef, useState } from 'react'
import { constrainNumber, parseNumberDraft } from '../shared/numberInput'

// Keep editing text separate from the finite numeric value used by the graphs.
export default function NumberInput({ value, onChange, min, max, step = 'any', allowInfinity = false, ...props }) {
  const [draft, setDraft] = useState(null)
  const pointerFocus = useRef(false)
  const cancelled = useRef(false)
  const editing = draft !== null
  const parsed = editing ? parseNumberDraft(draft,allowInfinity) : value
  const outOfRange = parsed !== null && ((min !== undefined && parsed < Number(min)) || (max !== undefined && parsed > Number(max)))
  function publish(number) {
    const next = allowInfinity&&!Number.isFinite(number)?number:constrainNumber(number, min, max, step)
    if (next !== value) onChange(next)
  }
  function finish() {
    if (!cancelled.current && parsed !== null) publish(parsed)
    cancelled.current=false
    setDraft(null)
  }
  return <input {...props} type="text" inputMode={allowInfinity?"text":"decimal"} spellCheck={false} autoComplete="off"
    value={draft ?? formatBound(value)}
    aria-invalid={editing && (parsed === null || outOfRange) ? true : undefined}
    onPointerDown={event => { pointerFocus.current = event.currentTarget !== document.activeElement }}
    onFocus={event => { cancelled.current=false; setDraft(formatBound(value)); event.currentTarget.select() }}
    onClick={event => { if (pointerFocus.current) { event.currentTarget.select(); pointerFocus.current = false } }}
    onChange={event => {
      const raw = event.target.value
      setDraft(raw)
      const number = parseNumberDraft(raw,allowInfinity)
      if(allowInfinity&&number!==null&&(!Number.isFinite(number)||!Number.isFinite(value)))return
      if (number !== null && !(min !== undefined && number < Number(min)) && !(max !== undefined && number > Number(max))) publish(number)
    }}
    onBlur={finish}
    onKeyDown={event => {
      if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur() }
      if (event.key === 'Escape') { event.preventDefault(); cancelled.current=true; setDraft(null); event.currentTarget.value = formatBound(value); event.currentTarget.blur() }
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault()
        if(!Number.isFinite(parsed??value))return
        const spacing = Number(step) > 0 ? Number(step) : 1
        const next = constrainNumber((parsed ?? value) + (event.key === 'ArrowUp' ? spacing : -spacing), min, max, step)
        setDraft(String(next)); publish(next)
      }
    }} />
}
