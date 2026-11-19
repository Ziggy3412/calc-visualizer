// A limit view uses a continuous fill/mesh, never an unbounded mesh count.
export default function InfiniteSlices({ checked, onChange, disabled = false }) {
  return (
    <div className="viz-infinite-slices">
      <label className="viz-check">
        <input type="checkbox" disabled={disabled} checked={checked} onChange={e => onChange(e.target.checked)} />
        Infinite slices (n → ∞)
      </label>
      {checked && <div className="viz-hint">Continuous limit; numerical values.</div>}
    </div>
  )
}
