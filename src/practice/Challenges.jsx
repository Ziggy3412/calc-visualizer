import { useEffect, useRef, useState } from 'react'
import TeX from '../components/TeX'
import { UNITS } from './questions'
import { CHALLENGES } from './challengeQuestions'
import SyncNote from '../components/SyncNote'
import { PROGRESS_SYNCED, notifyProgressChanged } from '../shared/progressEvents'
import './Practice.css'
import './Challenges.css'

const KEY = 'calc-challenges-v1'
function readSaved() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || '{}')
    return Object.fromEntries(CHALLENGES.map(q => [q.id, { notes: typeof value?.[q.id]?.notes === 'string' ? value[q.id].notes : '', complete: value?.[q.id]?.complete === true }]))
  } catch { return {} }
}
export default function Challenges() {
  const [course, setCourse] = useState('AB')
  const [unit, setUnit] = useState('all')
  const [selected, setSelected] = useState(CHALLENGES[0].id)
  const [saved, setSaved] = useState(readSaved)
  const [saveError, setSaveError] = useState(false)
  const [query, setQuery] = useState('')
  const main = useRef(null)
  const available = CHALLENGES.filter(q => course === 'BC' || !q.bcOnly)
  const filtered = available.filter(q => (unit === 'all' || q.unit === Number(unit)) && `${q.title} ${q.skills} ${q.id}`.toLowerCase().includes(query.toLowerCase()))
  const question = filtered.find(q => q.id === selected) || filtered[0]
  const index = filtered.indexOf(question)
  const complete = available.filter(q => saved[q.id]?.complete).length
  function select(id) { setSelected(id); main.current?.scrollTo({ top: 0 }) }
  function update(patch) {
    const next = { ...saved, [question.id]: { ...saved[question.id], ...patch } }
    setSaved(next)
    try { localStorage.setItem(KEY, JSON.stringify(next)); setSaveError(false) } catch { setSaveError(true) }
    if ('complete' in patch) notifyProgressChanged()
  }
  // Reload when progress from the signed-in account arrives.
  useEffect(() => {
    const reload = () => setSaved(readSaved())
    window.addEventListener(PROGRESS_SYNCED, reload)
    return () => window.removeEventListener(PROGRESS_SYNCED, reload)
  }, [])
  return <div className="practice-layout challenge-layout">
    <aside className="practice-nav" aria-label="Challenge units">
      <div className="practice-nav-heading"><h1>Challenges</h1><span>{complete} / {available.length} completed</span></div>
      <SyncNote />
      <div className="practice-filters">
        <div className="practice-courses" role="group" aria-label="Challenge course">{['AB','BC'].map(value => <button key={value} aria-pressed={course === value} onClick={() => { setCourse(value); setUnit('all') }}>Calculus {value}</button>)}</div>
        <label>Unit<select aria-label="Challenge unit" value={unit} onChange={e => setUnit(e.target.value)}><option value="all">All units</option>{UNITS.filter(u => course === 'BC' || u.id < 9).map(u => <option key={u.id} value={u.id}>{u.id}. {u.title}</option>)}</select></label>
        <input type="search" aria-label="Search challenges" placeholder="Find a challenge or skill" value={query} onChange={e => setQuery(e.target.value)} />
        <small>Two deep problems per unit · Free response</small>
        <progress aria-label="Challenge completion" max={available.length} value={complete} />
      </div>
      <div className="practice-topic-list">{UNITS.map(u => {
        const items = filtered.filter(q => q.unit === u.id)
        return items.length > 0 && <section key={u.id}><h2>{u.id}. {u.title}</h2>{items.map(q => <button key={q.id} className={question?.id === q.id ? 'selected' : ''} aria-current={question?.id === q.id ? 'page' : undefined} onClick={() => select(q.id)}><span className="practice-topic-id">{q.id}</span><span>{q.title}{q.bcOnly && <small>BC only</small>}</span><span className="practice-completion" aria-label={saved[q.id]?.complete ? 'Completed' : 'Not completed'}>{saved[q.id]?.complete ? '✓' : ''}</span></button>)}</section>
      })}</div>
      <div className="practice-source">Original advanced problems. Write a complete argument, check edge cases, and compare your reasoning with the solution. Completion is self-assessed.</div>
    </aside>
    <main className="practice-main" ref={main}>
      {saveError && <p role="alert">Your work is available in this session, but could not be saved on this device.</p>}
      {!question ? <div className="practice-empty"><h2>No matching challenges</h2><button onClick={() => { setQuery(''); setUnit('all') }}>Clear filters</button></div> : <article className="practice-question" key={question.id}>
        <div className="practice-question-meta"><span>UNIT {question.unit} · {question.bcOnly ? 'BC' : 'AB / BC'}</span><span>{index + 1} of {filtered.length}</span></div>
        <div className="challenge-badge">Advanced · Free response</div>
        <h2>{question.title}</h2><p className="challenge-skills">{question.skills}</p>
        <p className="practice-prompt">{question.prompt}</p>
        <div className="practice-equation"><TeX math={question.math} display /></div>
        <ol className="challenge-parts" type="a">{question.parts.map(part => <li key={part}>{part}</li>)}</ol>
        <label className="challenge-notes">Your working notes<span>Saved on this device as you type. Use plain text or work on paper.</span><textarea rows={7} placeholder="Build your argument here…" value={saved[question.id]?.notes || ''} onChange={e => update({ notes: e.target.value })} /></label>
        <details className="challenge-reveal"><summary>Need a hint?</summary><p>{question.hint}</p></details>
        <details className="challenge-reveal challenge-solution"><summary>Reveal worked solution</summary><p className="challenge-solution-intro">Compare each justification with your own before marking this complete.</p>{question.solution.map(([title, math, text], i) => <section key={title}><h3><span>{i + 1}</span>{title}</h3><div className="practice-work"><TeX math={math} display /></div><p>{text}</p></section>)}</details>
        <label className="challenge-complete"><input type="checkbox" checked={saved[question.id]?.complete || false} onChange={e => update({ complete: e.target.checked })} />I can solve and justify every part</label>
        <nav className="practice-pagination" aria-label="Challenge navigation"><button disabled={index === 0} onClick={() => select(filtered[index - 1].id)}>← Previous challenge</button><button disabled={index === filtered.length - 1} onClick={() => select(filtered[index + 1].id)}>Next challenge →</button></nav>
      </article>}
    </main>
  </div>
}
