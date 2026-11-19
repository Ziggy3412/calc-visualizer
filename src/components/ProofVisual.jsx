import { useState } from 'react'
import ZoomControls from './ZoomControls'
import usePlotView from '../shared/usePlotView'
import Plot from './ThemedPlot'
import TeX from './TeX'
import VizSlider from './VizSlider'
import { TheoremDemo } from '../visualizers/Theorems'
import { PROOF_CONTROLS, proofVisual } from '../shared/proofVisuals'
import { cartesianLayout, PLOT_CONFIG } from '../shared/plotDefaults'

function CustomProofVisual({ id }) {
  const control = PROOF_CONTROLS[id]
  const [value, setValue] = useState(control.initial)
  const model = proofVisual(id, value)
  const [xMin, xMax, yMin, yMax] = model.range
  const bounds={xMin,xMax,yMin,yMax}
  const view=usePlotView(1,0,0,{key:`${id}|${value}`,bounds})
  return <section className="theorem-demo" aria-label="Interactive proof visual">
    <h3>See the argument</h3><div className="theorem-formula"><TeX math={model.formula} /></div>
    <div className="proof-plot" onWheel={view.handleWheel}><Plot data={model.traces} layout={{ ...cartesianLayout({ ...view, showLegend: true, xTitle: model.xTitle, yTitle: model.yTitle }), legend: { orientation: 'h', x: 0, y: -0.18 }, margin: { t: 20, r: 20, b: 100, l: 50 } }} config={PLOT_CONFIG} onRelayout={view.handleRelayout} useResizeHandler style={{ width: '100%', height: '100%' }} /><ZoomControls onZoomIn={view.zoomIn} onZoomOut={view.zoomOut} onReset={() => view.fitBounds(bounds)} /></div>
    <VizSlider {...control} value={value} onChange={setValue} />
    <p className="theorem-readout" role="status">{model.caption}</p><small>This example illustrates the mechanism. The general proof below establishes the result under its stated hypotheses.</small>
  </section>
}
export default function ProofVisual({ proof }) {
  return PROOF_CONTROLS[proof.id] ? <CustomProofVisual key={proof.id} id={proof.id} /> : <TheoremDemo key={proof.id} id={proof.id} />
}
