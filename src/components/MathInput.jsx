import { useRef, useEffect, useState, useId } from 'react'
import 'mathlive'
import { parse } from 'mathjs'
import { equationFunction } from '../shared/equationFunction'

// Desmos-style math input powered by MathLive.
// Typing / creates a fraction, ^ creates a superscript, etc.
//
// Props:
//   onInput(latex, ascii) — fired as the user types. `latex` is what's shown
//     in the field; `ascii` is the normalized right-hand expression ready for
//     math.js (LHS stripped, θ → theta, ln → log).
//   onEnter               — fired when the user presses Enter.
//   value                 — optional LaTeX to push INTO the field (used by the
//     example-chip buttons so clicking one fills the input).
//   autoFocus             — focus the field on mount.
export default function MathInput({ value, onInput, onEnter, onDeleteEmpty, autoFocus, independent = 'x', dependent = 'y', equationMode = 'function', defaultBranch = 'upper', branchValue, onBranchChange }) {
  const ref = useRef(null)
  const [localBranch, setLocalBranch] = useState(defaultBranch)
  const branch = branchValue ?? localBranch
  const [relation, setRelation] = useState(null)
  const [error, setError] = useState('')
  const errorId = useId()

  // Stable callback refs so we don't re-attach listeners every render.
  // (Updated in an effect — refs shouldn't be written during render.)
  const onInputRef = useRef(onInput)
  const onEnterRef = useRef(onEnter)
  const onDeleteEmptyRef = useRef(onDeleteEmpty)
  useEffect(() => {
    onInputRef.current = onInput
    onEnterRef.current = onEnter
    onDeleteEmptyRef.current = onDeleteEmpty
  })

  useEffect(() => {
    const mf = ref.current
    if (!mf) return
    mf.menuItems = mf.menuItems.filter(item => !['color', 'background-color'].includes(item.id))

    // MathLive exposes the buttons as parts, but not their shared wrapper.
    // Center that wrapper as formulas grow taller (fractions, matrices, etc.).
    const alignmentStyle = new CSSStyleSheet()
    alignmentStyle.replaceSync('.ML__toggles { align-self: center; align-items: center; }')
    const centerControls = () => {
      const root = mf.shadowRoot
      if (root && !root.adoptedStyleSheets.includes(alignmentStyle)) root.adoptedStyleSheets = [...root.adoptedStyleSheets, alignmentStyle]
    }
    mf.addEventListener('mount', centerControls)
    centerControls()

    // When the user types, send back both the LaTeX (for display)
    // and the normalized ascii-math (for math.js evaluation)
    const handleInput = () => {
      const latex = mf.getValue('latex')
      const rawAscii = mf.getValue('ascii-math')
      try {
        const resolved = equationFunction(rawAscii, { independent, dependent, mode: equationMode, branch })
        if (resolved.expression.trim()) resolved.expression.split(/(?<![<>=!])=(?!=)/).forEach(part => parse(part))
        setError('')
        setRelation(resolved.relation ? resolved : null)
        onInputRef.current(latex, resolved.expression, resolved.relation ? parse(resolved.expression).toTex() : undefined, resolved)
      } catch (err) {
        setRelation(null)
        setError(err.message || 'Check the expression — a bracket, operator, or value may be missing.')
        onInputRef.current(latex, '')
      }
    }

    const handleKeydown = (e) => {
      if ((e.key === 'Backspace' || e.key === 'Delete') && !e.metaKey && !e.ctrlKey && !e.altKey && onDeleteEmptyRef.current && !mf.getValue('latex').trim()) {
        e.preventDefault()
        e.stopPropagation()
        onDeleteEmptyRef.current()
        return
      }
      if (e.key === 'Enter' && onEnterRef.current) {
        e.preventDefault()
        onEnterRef.current()
      }
    }

    mf.addEventListener('input', handleInput)
    mf.addEventListener('keydown', handleKeydown, true)

    const refresh = setTimeout(() => { if (mf.getValue('latex')) handleInput() }, 0)

    return () => {
      mf.removeEventListener('mount', centerControls)
      if (mf.shadowRoot) mf.shadowRoot.adoptedStyleSheets = mf.shadowRoot.adoptedStyleSheets.filter(sheet => sheet !== alignmentStyle)
      clearTimeout(refresh)
      mf.removeEventListener('input', handleInput)
      mf.removeEventListener('keydown', handleKeydown, true)
    }
  }, [branch, independent, dependent, equationMode])

  useEffect(() => {
    if (!autoFocus) return
    const timer = setTimeout(() => { if (ref.current?.isConnected) ref.current.focus() }, 0)
    return () => clearTimeout(timer)
  }, [autoFocus])

  // Push external value changes (example chips) into the field. Typing keeps
  // the field and `value` in sync, so this only runs on real external changes.
  useEffect(() => {
    const mf = ref.current
    if (!mf || value == null) return
    if (mf.getValue('latex') !== value) { mf.setValue(value); mf.dispatchEvent(new Event('input')) }
  }, [value])

  return (
    <div className="math-input-wrap">
    <math-field
      ref={ref}
      class={`math-input ${error ? 'invalid' : ''}`}
      aria-label="Math expression"
      aria-invalid={!!error}
      aria-describedby={error ? errorId : undefined}
      virtual-keyboard-mode="off"
      smart-mode="off"
    />
    {relation && <div className="equation-branch">
      {relation.branches ? <label>Use {dependent} branch<select aria-label={`Branch for ${dependent}`} value={branch} onChange={e => { setLocalBranch(e.target.value); onBranchChange?.(e.target.value) }}><option value="upper">Upper / positive</option><option value="lower">Lower / negative</option></select></label>
        : <span>{relation.slope ? 'Using the implicit slope −Fₓ / Fᵧ.' : `Solving for ${dependent} in terms of ${independent}.`}</span>}
      {relation.branches && <span>Choose bounds within this branch’s real domain.</span>}
    </div>}
    {error && <div id={errorId} className="math-input-error" role="status">{error}</div>}
    </div>
  )
}
