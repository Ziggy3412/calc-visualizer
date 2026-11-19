import { useState } from 'react'
import TeX from './TeX'
import { TOOLS } from '../shared/tools'
import './TabHome.css'

const GROUPS = [
  { label: 'Functions & derivatives', ids: ['limits', 'pva', 'implicitdiff', 'relatedrates', 'slopefield'] },
  { label: 'Integrals', ids: ['riemann', 'polar', 'byparts'] },
  { label: 'Solids', ids: ['crosssection', 'solids'] },
  { label: 'Series', ids: ['taylor'] },
]

export default function TabHome({ onSelectTool, section = 'tools' }) {
  const isStudy = section === 'study'
  const groups = isStudy ? [{ label: 'Study', ids: ['practice', 'challenges', 'theorems', 'proofs'] }] : GROUPS
  const [query, setQuery] = useState('')
  const matches = TOOLS.filter(tool => (isStudy ? tool.category === 'Study' : tool.category !== 'Study')).filter(tool => `${tool.label} ${tool.category} ${tool.description}`.toLowerCase().includes(query.toLowerCase()))
  return (
    <div className="tab-home">
      <div className="tool-list-heading"><h1>{isStudy ? 'Study' : 'Tools'}</h1><span>{isStudy ? 'Practice and understand calculus' : 'Open in a new tab'}</span></div>
      <div className="tool-search-wrap">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg>
        <input type="search" className="tool-search" aria-label={isStudy ? 'Search study resources' : 'Search visualizers'} placeholder={isStudy ? 'Find a study resource' : 'Find a tool'} value={query} onChange={e => setQuery(e.target.value)} />
      </div>
      <div className="tool-list">
        {groups.map(group => {
          const items = group.ids.map(id => matches.find(tool => tool.id === id)).filter(Boolean)
          if (!items.length) return null
          return (
            <section className="tool-group" key={group.label}>
              <h2>{group.label}</h2>
              {items.map(tool => (
                <button key={tool.id} className="tool-item" onClick={() => onSelectTool(tool.id)} aria-label={tool.label}>
                  <span className="tool-summary"><span className="tool-label">{tool.label}</span><span className="tool-description">{tool.description}</span></span>
                  <span className="tool-math" aria-hidden="true"><TeX math={tool.latex} /></span>
                </button>
              ))}
            </section>
          )
        })}
        {!matches.length && <p className="search-empty">No matching {isStudy ? 'study resources' : 'tools'}.</p>}
      </div>
    </div>
  )
}
