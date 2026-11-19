import { useId, useRef, useState } from 'react'
import TeX from '../components/TeX'
import VizSlider from '../components/VizSlider'
import { useAppearance } from '../shared/appearance'
import { THEOREMS, THEOREM_GROUPS } from '../shared/theorems'
import { PROOFS } from '../shared/proofs'
import { theoremDemo } from '../shared/theoremDemos'
import './Theorems.css'

const number = x => Number(x.toPrecision(3)).toString()
export function TheoremDemo({ id }) {
  const clipId = useId()
  const [position, setPosition] = useState(0.5)
  const [counterexample, setCounterexample] = useState(false)
  const { settings } = useAppearance()
  const model = theoremDemo(id, position, counterexample)
  const [a, b] = model.domain, [low, high] = model.range
  const controls = { ivt: [-0.9, 0.9], mvt: [1, 3], ftc1: [0.2, 3], 'integral-mvt': [1, 3], squeeze: [0.06, 1] }
  const [controlMin, controlMax] = controls[id] ?? [0, 1]
  const controlValue = controlMin + (controlMax - controlMin) * (id === 'squeeze' ? 1 - position : position)
  function updateControl(value) {
    const fraction = (value - controlMin) / (controlMax - controlMin)
    setPosition(id === 'squeeze' ? 1 - fraction : fraction)
  }
  const pad = (b - a) * 0.12, xMin = a - pad, xMax = b + pad
  const sx = x => 55 + (x - xMin) / (xMax - xMin) * 590
  const sy = y => 265 - (y - low) / (high - low) * 230
  function path(fn, start = a, end = b) {
    let d = ''
    for (let i = 0; i <= 800; i++) {
      const x = start + (end - start) * i / 800, y = fn(x)
      d += `${i === 0 ? 'M' : 'L'}${sx(x)},${sy(y)} `
    }
    return d
  }
  const segments = [a, ...(model.breaks || []), b]
  return <section className="theorem-demo" aria-label="Interactive theorem illustration">
    <div className="theorem-demo-heading"><h3>Explore the theorem</h3>{['ivt', 'mvt', 'rolle', 'evt'].includes(id) && <div className="theorem-switch" role="group" aria-label="Example type">
      <button aria-pressed={!counterexample} onClick={() => setCounterexample(false)}>Hypotheses hold</button>
      <button aria-pressed={counterexample} onClick={() => setCounterexample(true)}>Why hypotheses matter</button>
    </div>}</div>
    <div className="theorem-formula"><TeX math={model.formula} /></div>
    <svg className="theorem-graph" viewBox="0 0 700 315" role="img" aria-label={`${THEOREMS.find(t => t.id === id).title}: ${model.readout}`} style={{ background: settings.graphBackground, color: settings.graphText }}>
      <title>{model.readout}</title>
      <defs><clipPath id={clipId}><rect x="55" y="35" width="590" height="230" /></clipPath></defs>
      {settings.showGrid && [0, 1, 2, 3, 4].map(i => <g key={i} stroke={settings.gridColor} strokeWidth="1"><path d={`M55 ${35 + i * 57.5}H645`} /><path d={`M${55 + i * 147.5} 35V265`} /></g>)}
      {settings.showAxes && <g stroke={settings.axisColor} strokeWidth="1">
        <path d={`M55 ${sy(0)}H645`} />{xMin <= 0 && xMax >= 0 && <path d={`M${sx(0)} 35V265`} />}
      </g>}
      <g clipPath={`url(#${clipId})`}>
      {model.area && <path d={`${path(model.fn, ...model.area)} L${sx(model.area[1])},${sy(0)} L${sx(model.area[0])},${sy(0)} Z`} fill={settings.curve1} fillOpacity="0.16" />}
      {model.rectangle && <rect x={sx(model.rectangle[0])} y={sy(model.rectangle[2])} width={sx(model.rectangle[1]) - sx(model.rectangle[0])} height={sy(0) - sy(model.rectangle[2])} fill="none" stroke={settings.curve2} strokeDasharray="6 4" strokeWidth="2" />}
      {model.level !== undefined && <path d={`M${sx(a)} ${sy(model.level)}H${sx(b)}`} stroke={settings.curve2} strokeDasharray="6 4" strokeWidth="2" />}
      {model.bounds?.map((fn, i) => <path key={i} d={path(fn)} fill="none" stroke={settings.curve2} strokeDasharray="6 4" strokeWidth="2" />)}
      {segments.slice(0, -1).map((start, i) => <path key={i} d={path(model.fn, start, segments[i + 1] - (model.breaks ? 1e-10 : 0))} fill="none" stroke={settings.curve1} strokeWidth={settings.lineWidth} />)}
      {model.lines?.map(line => <path key={line.name} d={`M${sx(line.x[0])} ${sy(line.y[0])}L${sx(line.x[1])} ${sy(line.y[1])}`} stroke={line.color} strokeWidth={settings.lineWidth} strokeDasharray="7 4"><title>{line.name}</title></path>)}
      {model.points?.map(([x, y], i) => <circle key={i} cx={sx(x)} cy={sy(y)} r="5" fill={settings.curve3}><title>({number(x)}, {number(y)})</title></circle>)}
      {model.open?.map(([x, y], i) => <circle key={i} cx={sx(x)} cy={sy(y)} r="5" fill={settings.graphBackground} stroke={settings.curve1} strokeWidth="2" />)}
      </g>
      {settings.showAxes && <g fill="currentColor" fontSize="12" textAnchor="middle"><text x={sx(a)} y="287">{number(a)}</text><text x={sx(b)} y="287">{number(b)}</text><text x="664" y={Math.min(265, sy(0))}>x</text><text x="31" y="40">{number(high)}</text><text x="31" y="264">{number(low)}</text></g>}
    </svg>
    <div className="theorem-legend"><span style={{ color: settings.curve1 }}>━ Function</span>{model.lines ? <><span style={{ color: settings.curve2 }}>┄ Secant</span><span style={{ color: settings.curve3 }}>┄ Tangent / points</span></> : <span style={{ color: settings.curve2 }}>┄ {id === 'squeeze' ? 'Bounds' : 'Reference height'}</span>}</div>
    {model.label && <VizSlider label={model.label} min={controlMin} max={controlMax} step={0.01} value={controlValue} onChange={updateControl} leftLabel={id === 'squeeze' ? 'Closer' : controlMin} rightLabel={id === 'squeeze' ? 'Wider' : controlMax} />}
    <p className="theorem-readout" role="status">{model.readout}</p>
    <p className="theorem-hypothesis">{model.hypothesis}</p>
    <small>Analytic example; displayed decimals are rounded. An illustration supports the statement but is not a proof of the general theorem.</small>
  </section>
}
export default function Theorems({ initial = {}, onOpenVisualizer }) {
  const [selected, setSelected] = useState(initial.theorem ?? 'ivt')
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('all')
  const [course, setCourse] = useState('BC')
  const mainRef = useRef(null)
  const filtered = THEOREMS.filter(t => (course === 'BC' || !t.bcOnly) && (group === 'all' || t.group === group) && `${t.title} ${t.conditions} ${t.conclusion} ${t.example}`.toLowerCase().includes(query.trim().toLowerCase()))
  const current = filtered.find(t => t.id === selected) ?? filtered[0]
  function select(id) { setSelected(id); mainRef.current?.scrollTo({ top: 0 }) }
  function related(id) { setQuery(''); setGroup('all'); setCourse('BC'); select(id) }
  return <div className="theorems-layout">
    <aside className="theorems-nav viz-panel" aria-label="Theorem library">
      <div className="theorems-heading"><h1>Theorems & rules</h1><p>The conditions. The guarantee. The reason.</p></div>
      <div className="theorem-filters">
        <div className="theorem-switch" role="group" aria-label="Theorem course">{['AB', 'BC'].map(value => <button key={value} aria-pressed={course === value} onClick={() => { setCourse(value); mainRef.current?.scrollTo({ top: 0 }) }}>{value === 'BC' ? 'AB + BC' : 'AB essentials'}</button>)}</div>
        <input aria-label="Search theorems" type="search" placeholder="Search IVT, MVT, convergence…" value={query} onChange={e => setQuery(e.target.value)} />
        <label>Topic<select value={group} onChange={e => setGroup(e.target.value)}><option value="all">All topics</option>{THEOREM_GROUPS.map(name => <option key={name}>{name}</option>)}</select></label>
        <small>{filtered.length} of {THEOREMS.length} entries · BC includes AB</small>
      </div>
      <nav className="theorem-list" aria-label="Theorems">{THEOREM_GROUPS.map(name => {
        const items = filtered.filter(t => t.group === name)
        return items.length > 0 && <section key={name}><h2>{name}</h2>{items.map(t => <button key={t.id} aria-current={current?.id === t.id ? 'page' : undefined} onClick={() => select(t.id)}><span>{t.title}</span><small>{t.demo ? 'Interactive' : t.bcOnly ? 'BC + extensions' : 'Reference'}</small></button>)}</section>
      })}</nav>
    </aside>
    <main className="theorems-main" ref={mainRef}>
      {!current ? <div className="theorem-empty"><h2>No matching theorems</h2><button onClick={() => { setQuery(''); setGroup('all'); setCourse('BC') }}>Clear filters</button></div> : <article className="theorem-article" key={current.id}>
        <div className="theorem-meta">{current.group} · {current.bcOnly ? 'BC & further study' : 'AB / BC & foundations'}</div>
        <h2>{current.title}</h2>
        <section className="theorem-statement"><h3>When you can use it</h3><p>{current.conditions}</p><h3>What it guarantees</h3><p>{current.conclusion}</p><div className="theorem-formula"><TeX math={current.formula} display /></div></section>
        {current.demo && <TheoremDemo id={current.demo} />}
        <section className="theorem-work"><h3>Worked example</h3><p>{current.example}</p><ol>{current.work.map((step, i) => <li key={i}><div className="theorem-formula"><TeX math={step} /></div></li>)}</ol></section>
        <section className="theorem-pitfall"><h3>Watch out</h3><p>{current.pitfall}</p></section>
        {PROOFS.some(proof => proof.id === current.id) && <button className="theorem-open" onClick={() => onOpenVisualizer('proofs', { proof: current.id })}>Read the proof ↗</button>}
        {current.tool && <button className="theorem-open" onClick={() => onOpenVisualizer(current.tool, current.tool === 'taylor' ? { expr: { latex: 'e^x', ascii: 'e^x' }, center: 0, degree: 2 } : current.tool === 'slopefield' ? { expr: { latex: 'y', ascii: 'y' }, seeds: [{ x: 0, y: 2 }] } : {})}>Open {current.tool === 'taylor' ? 'Taylor' : current.tool === 'slopefield' ? 'Slope Fields' : 'Integration by Parts'} visualizer ↗</button>}
        {current.related && <section className="theorem-related"><h3>Connect the ideas</h3><div>{current.related.map(id => <button key={id} onClick={() => related(id)}>{THEOREMS.find(t => t.id === id).title} →</button>)}</div></section>}
        <p className="theorem-footer">A core single-variable calculus reference, with selected extensions. Conditions shown are standard sufficient hypotheses; the library includes theorems, tests, rules, and methods.</p>
      </article>}
    </main>
  </div>
}
