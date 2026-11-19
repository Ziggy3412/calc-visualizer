import NumberInput from './NumberInput'
import {formatBound} from '../shared/infinity'
export default function UnboundedNotice({a,b,boundA,boundB,reach,setReach,identity=false}) {
 return <div className="viz-section"><p className="viz-hint">Infinite bounds: {formatBound(boundA)} to {formatBound(boundB)}. The drawing {identity?'and by-parts identity show':'shows'} a finite preview from {a} to {b}. {identity?'The original improper integral is estimated separately.':'Volume and surface-area estimates use the full improper integral.'}</p><label className="viz-field-label">Preview length<NumberInput className="viz-num-input" aria-label="Infinite interval preview length" value={reach} min={.1} max={1000000} onChange={setReach}/></label><p className="viz-hint">A missing estimate means convergence was not established; the integral may diverge. Increasing the preview only changes the drawing.</p></div>
}
