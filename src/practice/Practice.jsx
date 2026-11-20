import { useEffect, useRef, useState } from 'react'
import TeX from '../components/TeX'
import { FRAMEWORK_URL, QUESTIONS, TOPICS, UNITS } from './questions'
import { PRACTICE_THEOREMS } from '../shared/theorems'
import SyncNote from '../components/SyncNote'
import { PROGRESS_SYNCED, notifyProgressChanged } from '../shared/progressEvents'
import './Practice.css'

const STORAGE_KEY = 'calc-practice-v1'
function readProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return Object.fromEntries(QUESTIONS.flatMap(q => {
      const item = saved[q.id]
      return item && Number.isInteger(item.choice) && item.choice >= 0 && item.choice < q.choices.length
        ? [[q.id, { choice: item.choice, checked: item.checked === true }]] : []
    }))
  } catch { return {} }
}
export default function Practice({ onOpenVisualizer }) {
  const mainRef = useRef(null)
  function selectQuestion(id) { setSelected(id); mainRef.current?.scrollTo({ top: 0 }) }
  const [course, setCourse] = useState('AB')
  const [unit, setUnit] = useState('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState('1.1')
  const [progress, setProgress] = useState(readProgress)
  const [revealed, setRevealed] = useState({})
  const [saveError, setSaveError] = useState(false)
  function saveProgress(next) {
    setProgress(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setSaveError(false) }
    catch { setSaveError(true) }
    notifyProgressChanged()
  }
  // Reload when progress from the signed-in account arrives.
  useEffect(() => {
    const reload = () => setProgress(readProgress())
    window.addEventListener(PROGRESS_SYNCED, reload)
    return () => window.removeEventListener(PROGRESS_SYNCED, reload)
  }, [])
  const courseQuestions = QUESTIONS.filter(q => course === 'BC' || !q.bcOnly)
  const search = query.trim().toLowerCase()
  const matchingTopics = new Set(courseQuestions.filter(q => `${q.id} ${q.title} ${q.prompt}`.toLowerCase().includes(search)).map(q => q.topicId))
  const filteredTopics = TOPICS.filter(q => (course === 'BC' || !q.bcOnly) && (unit === 'all' || q.unit === Number(unit)) && matchingTopics.has(q.id))
  const topicIds = new Set(filteredTopics.map(q => q.id))
  const filtered = courseQuestions.filter(q => topicIds.has(q.topicId))
  const correctByTopic = new Map()
  for (const q of courseQuestions) if (progress[q.id]?.checked && progress[q.id].choice === q.answer) correctByTopic.set(q.topicId, (correctByTopic.get(q.topicId) ?? 0) + 1)
  const question = filtered.find(q => q.id === selected) ?? filtered[0]
  const index = filtered.indexOf(question)
  const topicQuestions = question ? filtered.filter(q => q.topicId === question.topicId) : []
  const attempt = question ? progress[question.id] : null
  const showExplanation = question && (attempt?.checked || revealed[question.id])
  const correct = [...correctByTopic.values()].reduce((total, count) => total + count, 0)
  function choose(choice) {
    saveProgress({ ...progress, [question.id]: { choice, checked: false } })
  }
  return <div className="practice-layout">
    <aside className="practice-nav" aria-label="Practice topics">
      <div className="practice-nav-heading"><h1>Practice</h1><span>{correct} / {courseQuestions.length} correct</span></div>
      <SyncNote />
      <div className="practice-filters">
        <div className="practice-courses" role="group" aria-label="Course">{['AB', 'BC'].map(value => <button key={value} aria-pressed={course === value} onClick={() => { setCourse(value); setUnit('all'); mainRef.current?.scrollTo({ top: 0 }) }}>Calculus {value}</button>)}</div>
        <label>Unit<select aria-label="Practice unit" value={unit} onChange={e => { setUnit(e.target.value); mainRef.current?.scrollTo({ top: 0 }) }}><option value="all">All units</option>{UNITS.filter(u => course === 'BC' || u.id < 9).map(u => <option key={u.id} value={u.id}>{u.id}. {u.title}</option>)}</select></label>
        <input type="search" aria-label="Search practice topics" placeholder="Search topics or questions" value={query} onChange={e => { setQuery(e.target.value); mainRef.current?.scrollTo({ top: 0 }) }} />
        <small>{filteredTopics.length} topics · 10 questions each</small>
      </div>
      <div className="practice-topic-list">{UNITS.map(u => {
        const items = filteredTopics.filter(q => q.unit === u.id)
        return items.length > 0 && <section key={u.id}><h2>{u.id}. {u.title}</h2>{items.map(q => <button key={q.id} className={question?.topicId === q.id ? 'selected' : ''} aria-current={question?.topicId === q.id ? 'true' : undefined} onClick={() => selectQuestion(q.id)}><span className="practice-topic-id">{q.id}</span><span>{q.title}{q.bcOnly && <small>BC only</small>}</span><span className="practice-completion" aria-label={`${(correctByTopic.get(q.id) ?? 0)} of 10 correct`}>{(correctByTopic.get(q.id) ?? 0)}/10</span></button>)}</section>
      })}</div>
      <div className="practice-source">Original practice questions. Topic coverage follows the <a href={FRAMEWORK_URL} target="_blank" rel="noreferrer">AP Calculus framework</a>. BC includes AB topics.</div>
    </aside>
    <main className="practice-main" ref={mainRef}>
      {saveError && <p role="alert">Progress could not be saved on this device. You can still practice in this session.</p>}
      {!question ? <div className="practice-empty"><h2>No matching topics</h2><button onClick={() => { setQuery(''); setUnit('all') }}>Clear filters</button></div> : <article className="practice-question" key={question.id}>
        <div className="practice-question-meta"><span>UNIT {question.unit} · TOPIC {question.topicId}{question.bcOnly ? ' · BC ONLY' : ' · AB / BC'}</span><span>{index + 1} of {filtered.length}</span></div>
        <h2>{question.title}</h2>
        <nav className="practice-question-picker" aria-label="Questions in this topic">{topicQuestions.map(q => <button key={q.id} aria-label={`Question ${q.number}${progress[q.id]?.checked ? progress[q.id].choice === q.answer ? ', correct' : ', attempted' : ''}`} aria-current={q.id === question.id ? 'step' : undefined} onClick={() => selectQuestion(q.id)}>{q.number}{progress[q.id]?.checked && <span aria-hidden="true">{progress[q.id].choice === q.answer ? ' ✓' : ' •'}</span>}</button>)}</nav>
        <p className="practice-question-count">Question {question.number} of 10 in this topic</p>
        <p className="practice-prompt">{question.prompt}</p>
        <div className="practice-equation"><TeX math={question.math} display /></div>
        <fieldset className="practice-choices"><legend>Choose an answer</legend>{question.choices.map((choice, i) => <label key={i} className={`${attempt?.choice === i ? 'chosen' : ''} ${attempt?.checked && i === question.answer ? 'correct' : ''}`}><input type="radio" name={`answer-${question.id}`} checked={attempt?.choice === i} onChange={() => choose(i)} /><span className="practice-letter">{'ABCD'[i]}</span><TeX math={choice} /></label>)}</fieldset>
        <div className="practice-answer-actions"><button className="practice-primary" disabled={!attempt || attempt.checked} onClick={() => saveProgress({ ...progress, [question.id]: { ...progress[question.id], checked: true } })}>Check answer</button><button disabled={showExplanation} onClick={() => setRevealed(prev => ({ ...prev, [question.id]: !showExplanation }))}>{showExplanation ? 'Explanation shown' : 'Show explanation'}</button></div>
        {showExplanation && <section className="practice-explanation" aria-label="Worked explanation"><h3>{attempt?.checked ? attempt.choice === question.answer ? 'Correct' : 'Try comparing your work' : 'Worked explanation'}</h3><p>Answer {'ABCD'[question.answer]}: <TeX math={question.choices[question.answer]} /></p><p>{question.explanation}</p>{question.work.map((step, i) => <div className="practice-work" key={i}><span>{i + 1}</span><TeX math={step} /></div>)}</section>}
        <section className="practice-visualizer">{PRACTICE_THEOREMS[question.topicId] && <p><button onClick={() => onOpenVisualizer('theorems', { theorem: PRACTICE_THEOREMS[question.topicId] })}>Read theorem & conditions ↗</button></p>}<h3>Explore visually</h3>{question.visual ? <><p>{question.visual.description}</p><button onClick={() => onOpenVisualizer(question.visual.tool, question.visual.initial)}>Open visualizer ↗</button><small>Opens this question’s setup in a new tab.</small></> : <><p>No preset for this question yet</p><small>Use the worked explanation, or choose a visualizer from Tools to explore your own setup.</small></>}</section>
        <nav className="practice-pagination" aria-label="Question navigation"><button disabled={index === 0} onClick={() => selectQuestion(filtered[index - 1].id)}>← Previous question</button><button disabled={index === filtered.length - 1} onClick={() => selectQuestion(filtered[index + 1].id)}>Next question →</button></nav>
      </article>}
    </main>
  </div>
}
