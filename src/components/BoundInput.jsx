import NumberInput from './NumberInput'
export default function BoundInput({value,onChange,...props}) {
 return <div className="bound-input"><NumberInput {...props} value={value} onChange={onChange} allowInfinity title="Enter a number, infinity, inf, ∞, or −∞. Press Enter to apply infinity."/><div className="bound-infinity-buttons"><button type="button" aria-label={`${props['aria-label']||'Bound'} negative infinity`} onClick={()=>onChange(-Infinity)}>−∞</button><button type="button" aria-label={`${props['aria-label']||'Bound'} positive infinity`} onClick={()=>onChange(Infinity)}>+∞</button></div></div>
}
