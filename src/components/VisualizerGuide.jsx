import TeX from './TeX'
import { TOOLS } from '../shared/tools'
import { VISUALIZER_GUIDES } from '../shared/visualizerGuides'
import { dismissDialogOutside } from '../shared/dialogDismiss'
import './VisualizerGuide.css'

export default function VisualizerGuide({ dialogRef, guideId, onSelectGuide, onTryExample }) {
  const guide = VISUALIZER_GUIDES[guideId]
  const tool = TOOLS.find(item => item.id === guideId)
  return <dialog className="visualizer-guide" ref={dialogRef} aria-label="Visualizer explanations" onPointerDown={dismissDialogOutside}>
    <div className="guide-toolbar"><label>Explain a visualizer<select aria-label="Choose visualizer explanation" value={guideId} onChange={event => { onSelectGuide(event.target.value); dialogRef.current.scrollTo({ top: 0 }) }}>{TOOLS.filter(item => VISUALIZER_GUIDES[item.id]).map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><button className="guide-close" aria-label="Close explanation" onClick={() => dialogRef.current.close()}>×</button></div>
    {guide && <article className="guide-article" key={guideId}>
      <div className="guide-eyebrow">Start here · Visualizer guide</div>
      <h1>{tool.label}</h1>
      <p className="guide-intro">{guide.intro}</p>
      <div className="guide-equation"><TeX math={guide.formula} display /></div>
      <section><h2>What am I looking at?</h2><p>{guide.picture}</p></section>
      <section><h2>Try it step by step</h2><ol className="guide-steps">{guide.steps.map(step => <li key={step}>{step}</li>)}</ol></section>
      <section className="guide-example"><div className="guide-eyebrow">Worked example</div><h2>{guide.example.title}</h2><div className="guide-equation"><TeX math={guide.example.math} display /></div><p>{guide.example.explanation}</p><button className="guide-try" onClick={() => { onTryExample(guideId, guide.example.initial); dialogRef.current.close() }}>Try this example ↗</button><small>Opens a new tab with the example already set up.</small></section>
      <section className="guide-caution"><h2>Watch out for</h2><p>{guide.caution}</p></section>
      <button className="guide-done" onClick={() => dialogRef.current.close()}>Back to my visualizer</button>
    </article>}
  </dialog>
}
