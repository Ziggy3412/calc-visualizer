import { useState, useRef, useEffect, lazy, Suspense } from 'react'
import TabHome from './components/TabHome'
import Settings from './components/Settings'
import AuthControls from './components/AuthControls'
import VisualizerTour from './components/VisualizerTour'
import VisualizerGuide from './components/VisualizerGuide'
import { VISUALIZER_GUIDES } from './shared/visualizerGuides'
import { useAppearance } from './shared/appearance'
import { dismissDialogOutside } from './shared/dialogDismiss'
import { TOOLS } from './shared/tools'
const ImplicitDifferentiation = lazy(() => import('./visualizers/ImplicitDifferentiation'))
const RelatedRates = lazy(() => import('./visualizers/RelatedRates'))
const Proofs = lazy(() => import('./visualizers/Proofs'))
const Theorems = lazy(() => import('./visualizers/Theorems'))
const Challenges = lazy(() => import('./practice/Challenges.jsx'))
const Practice = lazy(() => import('./practice/Practice'))
const Limits = lazy(() => import('./visualizers/Limits'))
const Riemann = lazy(() => import('./visualizers/Riemann'))
const PVA = lazy(() => import('./visualizers/PVA'))
const Polar = lazy(() => import('./visualizers/Polar'))
const CrossSection = lazy(() => import('./visualizers/CrossSection'))
const Solids = lazy(() => import('./visualizers/Solids'))
const Taylor = lazy(() => import('./visualizers/Taylor'))
const SlopeField = lazy(() => import('./visualizers/SlopeField'))
const IntegrationByParts = lazy(() => import('./visualizers/IntegrationByParts'))
import './App.css'
// Shared styles used by every visualizer tab (panels, buttons, sliders, …)
import './shared/viz.css'
import './components/MathInput.css'
import './polish.css'

// Each tab tracks its id, label, and which tool is active (null = home)
function createTab() {
  return { id: crypto.randomUUID(), label: 'Graph', tool: 'limits' }
}

function App() {
  const [tabs, setTabs] = useState(() => [createTab()])
  const [activeId, setActiveId] = useState(tabs[0].id)

  const [panelCollapsed, setPanelCollapsed] = useState(false)
  const { settings, update } = useAppearance()
  const panelWidth = settings.panelWidth
  const setPanelWidth = next => update({ panelWidth: typeof next === 'function' ? next(panelWidth) : next })
  const settingsRef = useRef(null)
  const guideRef = useRef(null)
  const [guideId, setGuideId] = useState('limits')
  const [tour,setTour]=useState(null)
  const [editingTab, setEditingTab] = useState(null)
  const libraryRef = useRef(null)
  const studyRef = useRef(null)
  const currentTool = tabs.find(t => t.id === activeId)?.tool
  const tabListRef = useRef(null)
  const lockedWidth = useRef(null)

  function lockWidth() {
    if (tabListRef.current && lockedWidth.current === null) {
      lockedWidth.current = tabListRef.current.offsetWidth
      tabListRef.current.style.maxWidth = lockedWidth.current + 'px'
    }
  }

  function unlockWidth() {
    lockedWidth.current = null
    if (tabListRef.current) {
      tabListRef.current.style.maxWidth = ''
    }
  }

  function addTab() {
    unlockWidth()
    const newTab = createTab()
    setTabs(prev => [...prev, newTab])
    setActiveId(newTab.id)
  }

  function deleteTab(id, e) {
    e?.stopPropagation()
    lockWidth()
    const updated = tabs.filter(t => t.id !== id)
    if (!updated.length) {
      const fresh = createTab()
      setTabs([fresh])
      setActiveId(fresh.id)
    } else {
      setTabs(updated)
      if (activeId === id) setActiveId(updated[Math.min(tabs.findIndex(t => t.id === id), updated.length - 1)].id)
    }
  }

  function renameTab(id, newLabel) {
    setTabs(prev =>
      prev.map(t => (t.id === id ? { ...t, label: newLabel || t.label } : t))
    )
  }

  function handleLabelKey(e) {
    e.stopPropagation()
    if (e.key === 'Enter' || e.key === 'Escape') {
      e.preventDefault()
      e.target.blur()
      setEditingTab(null)
    }
  }

  function selectTool(toolId) {
    const tool = TOOLS.find(t => t.id === toolId)
    if (!tool) return
    setTabs(prev => prev.map(t => t.id === activeId ? { ...t, tool: toolId, label: tool.label } : t))
    setPanelCollapsed(false)
  }

  function openFromLibrary(toolId) {
    const tool = TOOLS.find(t => t.id === toolId)
    if (!tool) return
    if (!currentTool) selectTool(toolId)
    else {
      const tab = { ...createTab(), tool: toolId, label: tool.label }
      setTabs(prev => [...prev, tab])
      setActiveId(tab.id)
    }
    setPanelCollapsed(false)
    libraryRef.current.close()
  }

  function openStudy(toolId) {
    const existing = tabs.find(tab => tab.tool === toolId)
    if (existing) setActiveId(existing.id)
    else openPracticeVisualizer(toolId)
    setPanelCollapsed(false)
    studyRef.current.close()
  }

  function openPracticeVisualizer(toolId, initial) {
    const tool = TOOLS.find(item => item.id === toolId)
    if (!tool) return
    const tab = { ...createTab(), tool: toolId, label: tool.label, initial }
    setTabs(prev => [...prev, tab])
    setActiveId(tab.id)
    setPanelCollapsed(false)
  }

  useEffect(() => {
    const handleKey = e => {
      if (e.ctrlKey && e.key === 'Tab' && !e.altKey && !e.metaKey) {
        e.preventDefault()
        const index = tabs.findIndex(tab => tab.id === activeId)
        const direction = e.shiftKey ? -1 : 1
        setActiveId(tabs[(index + direction + tabs.length) % tabs.length].id)
        return
      }
      if (e.altKey || (!e.metaKey && !e.ctrlKey)) return
      if (e.key === ',') { e.preventDefault(); if (!settingsRef.current.open) settingsRef.current.showModal(); return }
      if (e.key.toLowerCase() === 't') { e.preventDefault(); addTab() }
      if (e.key.toLowerCase() === 'w') { e.preventDefault(); deleteTab(activeId) }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  useEffect(() => {
    const timer = setTimeout(() => window.dispatchEvent(new Event('resize')), 100)
    return () => clearTimeout(timer)
  }, [panelWidth, panelCollapsed, activeId])

  function resizePanel(e) {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    setPanelWidth(Math.max(280, Math.min(520, e.clientX)))
  }

  // Render a single tab's tool component
  function renderTool(tool, initial) {
    switch (tool) {
      case 'proofs':
        return <Proofs initial={initial} onOpenVisualizer={openPracticeVisualizer} />
      case 'theorems':
        return <Theorems initial={initial} onOpenVisualizer={openPracticeVisualizer} />
      case 'challenges':
        return <Challenges />
      case 'practice':
        return <Practice onOpenVisualizer={openPracticeVisualizer} />
      case 'implicitdiff':
        return <ImplicitDifferentiation initial={initial} />
      case 'relatedrates':
        return <RelatedRates initial={initial} />
      case 'limits':
        return <Limits initial={initial} />
      case 'riemann':
        return <Riemann initial={initial} />
      case 'pva':
        return <PVA initial={initial} />
      case 'polar':
        return <Polar initial={initial} />
      case 'crosssection':
        return <CrossSection initial={initial} />
      case 'solids':
        return <Solids initial={initial} />
      case 'taylor':
        return <Taylor initial={initial} />
      case 'slopefield':
        return <SlopeField initial={initial} />
      case 'byparts':
        return <IntegrationByParts initial={initial} />
      case 'volume':
        // PLANNED — stub only. The math/visuals will be specced later.
        return (
          <div className="page-content">
            <div className="coming-soon-card">
              <h2>Volume by Integration</h2>
              <span className="coming-soon-badge">Coming soon</span>
              <p>
                This tab is reserved for building up a 3D solid (such as a sphere)
                by integrating its cross-sectional area as the bound sweeps through.
                The visualizer hasn't been built yet.
              </p>
            </div>
          </div>
        )
      default:
        // Placeholder for tools not yet built
        return (
          <div className="page-content">
            <h2>Coming soon</h2>
            <p>This visualizer hasn't been built yet.</p>
          </div>
        )
    }
  }

  return (
    <div data-density={settings.density} className={`app-shell ${panelCollapsed ? 'panel-collapsed' : ''}`} style={{ '--panel-width': `${panelWidth}px` }}>
      <header className="workspace-header">
        <div className="workspace-brand">
          <svg className="app-mark" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18h18M7 3v18M3 15c4 0 5-8 8-8s3 7 6 7 3-3 4-5" /></svg>
          Calc Visualizer
        </div>
        <div className="workspace-actions">
          {VISUALIZER_GUIDES[currentTool] && <button className="header-button library-button" aria-haspopup="dialog" title="Learn what this visualizer shows and how to use it" onClick={() => { setGuideId(currentTool); setPanelCollapsed(false); setTour({toolId:currentTool,id:crypto.randomUUID()}) }}>Explain</button>}
          <button className="header-button library-button" aria-haspopup="dialog" onClick={() => studyRef.current.showModal()}>Study <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m6 8 4 4 4-4"/></svg></button>
          <button className="header-button" aria-label="Settings" title="Settings (⌘ / Ctrl + ,)" onClick={() => settingsRef.current.showModal()}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 5h14M3 10h14M3 15h14"/><path d="M7 3v4M13 8v4M8 13v4"/></svg>Settings
          </button>
          {currentTool && <button className="header-button" onClick={() => setPanelCollapsed(v => !v)} aria-expanded={!panelCollapsed} aria-label={panelCollapsed ? 'Show panel' : 'Hide panel'} title={panelCollapsed ? 'Show panel' : 'Hide panel'}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2" y="3" width="16" height="14" rx="1"/><path d="M7 3v14"/></svg>
            {panelCollapsed ? 'Show panel' : 'Hide panel'}
          </button>}
          <button className="header-button library-button" onClick={() => libraryRef.current.showModal()}>
            Tools <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m6 8 4 4 4-4"/></svg>
          </button>
          <AuthControls />
        </div>
      </header>
      <div className="tab-bar" onMouseLeave={unlockWidth}>
        <div className="tab-list" role="tablist" aria-label="Open visualizers" ref={tabListRef}>
          {tabs.map(tab => (
            <div
              key={tab.id}
              role="tab"
              aria-selected={tab.id === activeId}
              tabIndex={tab.id === activeId ? 0 : -1}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveId(tab.id) }
                if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                  e.preventDefault()
                  const index = (tabs.findIndex(t => t.id === tab.id) + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
                  setActiveId(tabs[index].id)
                  e.currentTarget.parentElement.children[index].focus()
                }
              }}
              className={`tab ${tab.id === activeId ? 'active' : ''}`}
              onClick={() => setActiveId(tab.id)}
            >
              <span
                className="tab-label"
                contentEditable={editingTab === tab.id}
                onDoubleClick={e => { setEditingTab(tab.id); requestAnimationFrame(() => e.target.focus()) }}
                suppressContentEditableWarning
                onBlur={e => { renameTab(tab.id, e.target.textContent.trim()); setEditingTab(null) }}
                onKeyDown={handleLabelKey}
              >
                {tab.label}
              </span>
              <button
                className="tab-close"
                onClick={e => deleteTab(tab.id, e)}
                title="Close tab" aria-label={`Close ${tab.label}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button className="tab-add" onClick={addTab} title="New tab (⌘T)" aria-label="New tab">
          +
        </button>
      </div>

      {/* Every tab stays mounted so its work is preserved when you switch
          tabs; only the active one is shown. Closing a tab unmounts it. */}
      {tabs.map(tab => (
        <div
          key={tab.id}
          className="tab-content"
          style={{ display: tab.id === activeId ? 'flex' : 'none' }}
        >
          <Suspense fallback={<div className="workspace-loading" role="status">Loading visualizer…</div>}>
            {tab.tool ? renderTool(tab.tool, tab.initial) : <TabHome onSelectTool={selectTool} />}
          </Suspense>
        </div>
      ))}
      {currentTool && !panelCollapsed && <div className="panel-resizer" role="separator" aria-label="Resize expression panel" aria-orientation="vertical" tabIndex={0} aria-valuemin={280} aria-valuemax={520} aria-valuenow={panelWidth}
        onPointerDown={e => e.currentTarget.setPointerCapture(e.pointerId)} onPointerMove={resizePanel}
        onPointerUp={e => e.currentTarget.releasePointerCapture(e.pointerId)}
        onKeyDown={e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); setPanelWidth(w => Math.max(280, Math.min(520, w + (e.key === 'ArrowRight' ? 20 : -20)))) } }} />}
      <Settings dialogRef={settingsRef} />
      {tour&&<VisualizerTour key={tour.id} toolId={tour.toolId} onClose={()=>setTour(null)} onFullGuide={()=>{setTour(null);setGuideId(tour.toolId);guideRef.current.showModal()}} onTryExample={(toolId,initial)=>{setTour(null);openPracticeVisualizer(toolId,initial)}}/>}
      <VisualizerGuide dialogRef={guideRef} guideId={guideId} onSelectGuide={setGuideId} onTryExample={openPracticeVisualizer} />
      <dialog aria-label="Study resources" className="tool-dialog" ref={studyRef} onPointerDown={dismissDialogOutside}>
        <button className="dialog-close" aria-label="Close study resources" onClick={() => studyRef.current.close()}>×</button>
        <TabHome section="study" onSelectTool={openStudy} />
      </dialog>
      <dialog aria-label="Visualizer library" className="tool-dialog" ref={libraryRef} onPointerDown={dismissDialogOutside}>
        <button className="dialog-close" aria-label="Close visualizer library" onClick={() => libraryRef.current.close()}>×</button>
        <TabHome onSelectTool={openFromLibrary} />
      </dialog>
    </div>
  )
}

export default App
