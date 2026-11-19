import { useEffect, useRef, useState } from 'react'
import { COLOR_CHOICES } from '../shared/preferences'
export default function LineColorPicker({ number, value, themeColor, onChange }) {
  const [open,setOpen] = useState(false)
  const root = useRef(null)
  useEffect(()=>{
    if(!open)return
    const dismiss=e=>{if(!root.current?.contains(e.target))setOpen(false)}
    document.addEventListener('pointerdown',dismiss)
    return ()=>document.removeEventListener('pointerdown',dismiss)
  },[open])
  return <div className="expression-line-color" ref={root} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();setOpen(false);root.current.querySelector('button').focus()}}}>
    <button className="line-color-dot" aria-label={`Line ${number} color`} aria-expanded={open} title={`Change line ${number} color`} style={{background:value??themeColor}} onClick={()=>setOpen(v=>!v)}>{number}</button>
    {open&&<div className="line-color-popover" role="group" aria-label={`Line ${number} colors`}><strong>Line {number} color</strong><div className="color-swatches">{[...new Set([themeColor,...COLOR_CHOICES])].map(color=><button key={color} aria-label={`Use ${color} for line ${number}`} aria-pressed={(value??themeColor)===color} style={{'--swatch':color}} onClick={()=>{onChange(color);setOpen(false)}}/>)}</div><label>Custom color<input type="color" aria-label={`Custom color for line ${number}`} value={value??themeColor} onChange={e=>onChange(e.target.value)}/></label><button className="settings-text-button" onClick={()=>{onChange(undefined);setOpen(false)}}>Use theme color</button></div>}
  </div>
}
