import { useEffect, useState } from 'react'
import { dismissDialogOutside } from '../shared/dialogDismiss'
import { useAppearance } from '../shared/appearance'
import { THEMES, COLOR_CHOICES, COLOR_FIELDS, DEFAULT_PREFERENCES } from '../shared/preferences'

const SECTIONS = [ ['appearance','Appearance','Theme and readability'], ['drawing','Drawing colors','Lines, regions, and solids'], ['graphs','Graphs & 3D','Grid, axes, and lighting'], ['shortcuts','Shortcuts','Moving around the workspace'] ]
const DRAWING = [['curve1','Primary line'],['curve2','Comparison line'],['curve3','Markers'],['curve4','Additional line'],['curve5','Highlights'],['curve6','Extra line'],['solidColor','Solid'],['sliceColor','Slices'],['regionColor','Base region'],['wireColor','Wireframe']]
function Preview({ colors, grid = true, axes = true, width = 3, lighting = 1 }) {
  return <svg className="settings-preview" viewBox="0 0 360 150" role="img" aria-label="Preview of graph lines, shaded region, and a lit solid" style={{background:colors.graphBackground}}>
    {grid && <path d="M0 30H360M0 60H360M0 90H360M0 120H360M30 0V150M60 0V150M90 0V150M120 0V150M150 0V150M180 0V150M210 0V150M240 0V150M270 0V150M300 0V150M330 0V150" fill="none" stroke={colors.gridColor} strokeWidth=".7"/>}
    {axes && <path d="M0 120H210M60 0V150" stroke={colors.axisColor} fill="none"/>}
    <path d="M60 120Q100 20 180 60L180 120Z" fill={colors.regionColor} fillOpacity=".16"/>
    <path d="M12 143Q85 -30 200 70" stroke={colors.curve1} strokeWidth={width} fill="none"/>
    <path d="M16 65L202 120" stroke={colors.curve2} strokeWidth={width} fill="none"/>
    <circle cx="110" cy="71" r="4" fill={colors.curve3}/>
    <path d="M250 52L286 32L326 53L290 76Z" fill={colors.solidColor}/>
    <path d="M250 52L290 76V124L250 100Z" fill={colors.solidColor}/>
    <path d="M290 76L326 53V101L290 124Z" fill={colors.solidColor}/>
    <path d="M250 52L286 32L326 53L290 76Z" fill="white" fillOpacity={Math.min(.65,.22*lighting)}/>
    <path d="M290 76L326 53V101L290 124Z" fill="black" fillOpacity=".23"/>
    <path d="M250 76L290 100L326 77" stroke={colors.sliceColor} strokeWidth="3" fill="none"/>
  </svg>
}
function RangeSetting({ label, detail, value, min, max, step = 1, suffix = '', onChange }) {
  return <label className="settings-control"><span><strong>{label}</strong><small>{detail}</small></span><span className="settings-range"><input type="range" aria-label={label} min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/><output>{value}{suffix}</output></span></label>
}
export default function Settings({ dialogRef }) {
  const { settings, update, reset, saveError } = useAppearance()
  const [section,setSection] = useState('appearance')
  const [editingColor,setEditingColor] = useState(null)
  const [undo,setUndo] = useState(null)
  useEffect(() => {
    if (!editingColor) return
    const dismiss = event => {
      if (event.target.closest?.('[data-color-key]')?.dataset.colorKey !== editingColor) setEditingColor(null)
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [editingColor])
  const theme = THEMES.find(t=>t.id===settings.theme) ?? THEMES[0]
  const customized = DRAWING.some(([key])=>settings[key]!==theme.colors[key])
  function setTheme(id) {
    const palette=THEMES.find(t=>t.id===id)
    update({...Object.fromEntries(COLOR_FIELDS.map(([key])=>[key,palette.colors[key]])),theme:id})
  }
  function restore(keys) { setUndo({...settings}); update(Object.fromEntries(keys.map(key=>[key,DEFAULT_PREFERENCES[key]]))) }
  function restoreDrawing() { setUndo({...settings}); update(Object.fromEntries(DRAWING.map(([key])=>[key,theme.colors[key]]))) }
  return <dialog onPointerDown={dismissDialogOutside} className="app-settings-dialog" ref={dialogRef} aria-label="App settings" onClose={()=>setEditingColor(null)}>
    <header className="settings-heading"><div><h2>Settings</h2><p>Make this workspace yours.</p></div><button className="settings-close" aria-label="Close settings" title="Close settings (Esc)" onClick={()=>dialogRef.current.close()}>×</button></header>
    <div className="settings-body"><nav className="settings-nav" aria-label="Settings sections">{SECTIONS.map(([id,label,detail])=><button key={id} aria-current={section===id?'page':undefined} onClick={()=>{setSection(id);setEditingColor(null)}}><strong>{label}</strong><small>{detail}</small></button>)}<span className="settings-save-state" role="status">{saveError?'Could not save · session only':'Saved on this computer'}</span></nav>
      <div className="settings-content" key={section}>
        <div className="settings-page-heading"><h3>{SECTIONS.find(([id])=>id===section)[1]}</h3>{section!=='shortcuts'&&<span>Changes apply immediately</span>}</div>
        {section==='appearance'&&<>
          <p className="settings-description">Each theme includes matching graph and drawing colors. You can customize the drawing colors separately.</p>
          <div className="settings-themes">{THEMES.map(t=><button key={t.id} className="theme-choice" aria-pressed={settings.theme===t.id} onClick={()=>setTheme(t.id)}><Preview colors={t.colors}/><span>{t.name}<span aria-hidden="true">{settings.theme===t.id?'✓':''}</span></span></button>)}</div>
          <div className="settings-subheading"><h4>Readability</h4><button onClick={()=>restore(['textSize','density'])}>Reset display</button></div>
          <RangeSetting label="Text size" detail="Labels and controls throughout the app" value={settings.textSize} min={12} max={18} suffix=" px" onChange={textSize=>update({textSize})}/>
          <div className="settings-control"><span><strong>Control spacing</strong><small>Choose how much room controls have.</small></span><div className="settings-segment" role="group" aria-label="Control spacing">{['comfortable','compact'].map(value=><button key={value} aria-pressed={settings.density===value} onClick={()=>update({density:value})}>{value==='comfortable'?'Comfortable':'Compact'}</button>)}</div></div>
          <p className="settings-tip">Resize the expression panel by dragging its divider. Double-click a tab’s name to rename it.</p>
        </>}
        {section==='drawing'&&<>
          <Preview colors={settings} grid={settings.showGrid} axes={settings.showAxes} width={settings.lineWidth} lighting={settings.lighting}/>
          <div className="settings-subheading"><div><h4>{theme.name} palette</h4><small>{customized?'Customized drawing colors':'Theme drawing colors'}</small></div><button onClick={restoreDrawing}>Reset palette</button></div>
          <div className="settings-color-list">{DRAWING.map(([key,label])=><div className="settings-color-row" data-color-key={key} key={key}><div className="settings-color-summary"><span>{label}</span><button className="settings-color-trigger" aria-label={`Edit ${label.toLowerCase()} color`} aria-expanded={editingColor===key} onClick={()=>setEditingColor(editingColor===key?null:key)}><i style={{background:settings[key]}}/><code>{settings[key].toUpperCase()}</code><span aria-hidden="true">⌄</span></button></div>{editingColor===key&&<div className="settings-color-editor"><div className="color-swatches" role="group" aria-label={`${label} palette`}>{[...new Set([...DRAWING.slice(0,6).map(([k])=>theme.colors[k]),...COLOR_CHOICES,'#ffffff','#333333'])].map(color=><button key={color} aria-label={`${label} ${color}`} aria-pressed={settings[key].toLowerCase()===color.toLowerCase()} style={{'--swatch':color}} onClick={()=>update({[key]:color})}/>)}</div><label className="settings-custom-color">Custom color<input aria-label={`${label} custom color`} type="color" value={settings[key]} onChange={e=>update({[key]:e.target.value})}/></label><button className="settings-text-button" onClick={()=>update({[key]:theme.colors[key]})}>Use theme color</button></div>}</div>)}</div>
        </>}
        {section==='graphs'&&<>
          <Preview colors={settings} grid={settings.showGrid} axes={settings.showAxes} width={settings.lineWidth} lighting={settings.lighting}/>
          <div className="settings-subheading"><h4>Graph display</h4><button onClick={()=>restore(['showGrid','showAxes','lineWidth','lighting'])}>Reset graph settings</button></div>
          {[['showGrid','Grid lines','Keep a reference grid behind the curves.'],['showAxes','Coordinate axes','Show the horizontal and vertical axes.']].map(([key,label,detail])=><label className="settings-control" key={key}><span><strong>{label}</strong><small>{detail}</small></span><input className="settings-switch" type="checkbox" checked={settings[key]} onChange={e=>update({[key]:e.target.checked})}/></label>)}
          <RangeSetting label="Curve thickness" detail="Stroke width for plotted curves" value={settings.lineWidth} min={1} max={6} step={.5} suffix=" px" onChange={lineWidth=>update({lineWidth})}/>
          <RangeSetting label="3D lighting" detail="Light intensity on three-dimensional solids" value={settings.lighting} min={.25} max={2} step={.05} suffix="×" onChange={lighting=>update({lighting})}/>
          <p className="settings-tip">On a focused 3D graph, use arrow keys to rotate and Shift + arrows to pan. Use the 2D button to inspect the source region.</p>
        </>}
        {section==='shortcuts'&&<><p className="settings-description">Keep your hands on the keyboard while you explore.</p><dl className="settings-shortcuts">{[['New graph tab','⌘ / Ctrl + T'],['Close current tab','⌘ / Ctrl + W'],['Open settings','⌘ / Ctrl + ,'],['Close a dialog','Esc'],['Next / previous tab','Ctrl + Tab / Ctrl + Shift + Tab'],['Switch tabs when tab bar is focused','← / →'],['Rotate a focused 3D graph','Arrow keys'],['Pan a focused 3D graph','Shift + arrows']].map(([label,keys])=><div key={label}><dt>{label}</dt><dd><kbd>{keys}</kbd></dd></div>)}</dl><p className="settings-tip">Practice has a searchable topic list, separate AB and BC filters, and worked explanations. Your checked answers are saved on this computer.</p></>}
      </div>
    </div>
    <footer className="settings-footer"><button className="settings-text-button" onClick={()=>{setUndo({...settings});reset()}}>Restore all defaults</button><span role="status">{undo&&<>Settings reset. <button className="settings-text-button" onClick={()=>{update(undo);setUndo(null)}}>Undo reset</button></>}</span><button className="settings-done" onClick={()=>dialogRef.current.close()}>Done</button></footer>
  </dialog>
}
