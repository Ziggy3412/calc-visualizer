import { useRef, useState } from 'react'
import ProofVisual from '../components/ProofVisual'
import TeX from '../components/TeX'
import { PROOFS } from '../shared/proofs'
import { THEOREMS, THEOREM_GROUPS } from '../shared/theorems'
import './Theorems.css'

export default function Proofs({ initial = {}, onOpenVisualizer }) {
  const [selected, setSelected] = useState(initial.proof ?? 'ivt')
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('all')
  const [shown, setShown] = useState(null)
  const mainRef = useRef(null)
  const entries = PROOFS.map(proof => ({ ...THEOREMS.find(t => t.id === proof.id), ...proof }))
  const filtered = entries.filter(p => (group === 'all' || p.group === group) && `${p.title} ${p.idea} ${p.conditions}`.toLowerCase().includes(query.trim().toLowerCase()))
  const current = filtered.find(p => p.id === selected) ?? filtered[0]
  const visible = shown?.id === current?.id ? shown.count : current?.steps.length
  function choose(id) { setSelected(id); setShown(null); mainRef.current?.scrollTo({ top: 0 }) }
  return <div className="theorems-layout">
    <aside className="theorems-nav viz-panel" aria-label="Proof library">
      <div className="theorems-heading"><h1>Proofs</h1><p>Follow why the result must be true.</p></div>
      <div className="theorem-filters"><input type="search" aria-label="Search proofs" placeholder="Find a theorem or proof" value={query} onChange={e => setQuery(e.target.value)} /><label>Topic<select value={group} onChange={e => setGroup(e.target.value)}><option value="all">All topics</option>{THEOREM_GROUPS.filter(name => entries.some(p => p.group === name)).map(name => <option key={name}>{name}</option>)}</select></label><small>{filtered.length} proofs · general arguments, step by step</small></div>
      <nav className="theorem-list" aria-label="Proofs">{THEOREM_GROUPS.map(name => {
        const items = filtered.filter(p => p.group === name)
        return items.length > 0 && <section key={name}><h2>{name}</h2>{items.map(p => <button key={p.id} aria-current={current?.id === p.id ? 'page' : undefined} onClick={() => choose(p.id)}><span>{p.title}</span><small>{p.steps.length} steps</small></button>)}</section>
      })}</nav>
    </aside>
    <main className="theorems-main" ref={mainRef}>{!current ? <div className="theorem-empty"><h2>No matching proofs</h2><button onClick={() => { setQuery(''); setGroup('all') }}>Clear filters</button></div> : <article className="theorem-article" key={current.id}>
      <div className="theorem-meta">{current.group} · Proof</div><h2>{current.title}</h2>
      <section className="theorem-statement"><h3>Assumptions</h3><p>{current.conditions}</p><h3>What we will prove</h3><p>{current.conclusion}</p><div className="theorem-formula"><TeX math={current.formula} display /></div></section>
      <section className="theorem-pitfall"><h3>Proof idea</h3><p>{current.idea}</p></section>
      <ProofVisual proof={current} />
      {current.dependencies && <p className="viz-hint">Uses: {current.dependencies}</p>}
      <section className="theorem-work" aria-label="Step-by-step proof"><div className="theorem-demo-heading"><h3>Proof</h3><div className="theorem-switch">{visible >= current.steps.length ? <button onClick={() => setShown({ id: current.id, count: 1 })}>One step at a time</button> : <><button onClick={() => setShown({ id: current.id, count: visible + 1 })}>Next step</button><button onClick={() => setShown({ id: current.id, count: current.steps.length })}>Show full proof</button></>}</div></div><p className="viz-hint" role="status">Showing {visible} of {current.steps.length} steps</p><ol>{current.steps.slice(0, visible).map((step, i) => <li key={i}><h3>{step.title}</h3><p>{step.explanation}</p>{step.math && <div className="theorem-formula"><TeX math={step.math} /></div>}</li>)}</ol></section>
      <section className="theorem-related"><button onClick={() => onOpenVisualizer('theorems', { theorem: current.id })}>Open theorem, examples & conditions ↗</button></section>
    </article>}</main>
  </div>
}
