import { useEffect, useRef, useState } from 'react'
import TeX from './TeX'
import { WATER_TANKS, tankVolume, advanceTank } from '../shared/waterTanks'
import { prettyNumber as num } from '../shared/implicitCalculus'
import './WaterTank.css'

export default function WaterTank({ id, height, volume, known, rate, valid, onChange }) {
  const [playing,setPlaying]=useState(false)
  const state=useRef({height,known,rate,onChange})
  useEffect(()=>{state.current={height,known,rate,onChange}},[height,known,rate,onChange])
  const tank=WATER_TANKS[id]
  useEffect(()=>{
    if(!playing||!valid)return
    let frame,last
    function tick(time) {
      if(last!==undefined) {
        const current=state.current
        const next=advanceTank(id,current.height,current.known,current.rate,Math.min((time-last)/1000,.05))
        state.current.height=next.height
        current.onChange(next.height,next.volume)
        if(next.atEnd){setPlaying(false);return}
      }
      last=time;frame=requestAnimationFrame(tick)
    }
    frame=requestAnimationFrame(tick)
    return()=>cancelAnimationFrame(frame)
  },[playing,valid,id])
  const level=Number.isFinite(height)?Math.max(0,Math.min(tank.height,height)):0
  const fraction=level/tank.height
  const capacity=tankVolume(id,tank.height)
  const surface=200-(id==='cone'?150:135)*fraction
  const half=85*fraction
  function move(next) {setPlaying(false);onChange(next,tankVolume(id,next))}
  return <section className="water-tank" aria-label={id==='cone'?'Inverted cone water tank':'Cube water tank'}>
    <div className="water-tank-heading"><div><h2>{id==='cone'?'Filling an inverted cone':'Filling a cube'}</h2><p>{id==='cone'?'The surface widens as the water rises.':'The horizontal surface area stays constant.'}</p></div><span>{Math.round(100*tankVolume(id,level)/capacity)}% full</span></div>
    <svg viewBox="0 0 320 250" role="img" aria-label={`Water depth ${num(level)} metres in a ${tank.height} metre ${id==='cone'?'inverted cone':'cube'}`}>
      {id==='cone'?<>
        <path d="M95 50 L180 200 L265 50" fill="var(--surface-subtle)" stroke="var(--app-muted)" strokeWidth="2"/>
        <path d={`M${180-half} ${surface} L180 200 L${180+half} ${surface} Z`} fill="var(--app-accent)" opacity=".3"/>
        <ellipse cx="180" cy={surface} rx={half} ry={12*fraction} fill="var(--app-accent)" fillOpacity=".35" stroke="var(--app-accent)" strokeWidth="2"/>
        <ellipse cx="180" cy="50" rx="85" ry="12" fill="none" stroke="var(--app-muted)" strokeWidth="2"/>
        <path d={`M180 200 V${surface} H${180+half}`} fill="none" stroke="var(--app-accent)" strokeDasharray="4 4"/>
        <text x="180" y="25" textAnchor="middle">Top radius R = 3 m</text>
        <text x="65" y="130" textAnchor="middle">6 m</text>
        <text x="180" y="229" textAnchor="middle">Pointed end at the bottom</text>
      </>:<>
        <path d="M100 65 L145 40 H285 V175 L240 200 H100 Z" fill="var(--surface-subtle)" stroke="var(--app-muted)" strokeWidth="2"/>
        <path d={`M100 ${surface} L145 ${surface-25} H285 V175 L240 200 H100 Z`} fill="var(--app-accent)" opacity=".25"/>
        <path d={`M100 ${surface} L145 ${surface-25} H285 L240 ${surface} Z`} fill="var(--app-accent)" fillOpacity=".3" stroke="var(--app-accent)" strokeWidth="2"/>
        <path d="M100 65 H240 L285 40 M240 65 V200 M145 40 V175 H285 M100 200 L145 175" fill="none" stroke="var(--app-muted)" strokeWidth="1.5"/>
        <text x="180" y="25" textAnchor="middle">Open-top tank · side 4 m</text>
        <text x="180" y="229" textAnchor="middle">Constant base area = 16 m²</text>
      </>}
    </svg>
    <div className="water-tank-readouts"><span>Water depth <strong>{num(level)} m</strong></span><span>Volume <strong>{num(volume)} m³</strong></span><span>{id==='cone'?'Water radius':'Base area'} <strong>{id==='cone'?`${num(level/2)} m`:'16 m²'}</strong></span><span>Capacity <strong>{num(capacity)} m³</strong></span></div>
    <div className="water-tank-controls"><button className="viz-btn" disabled={!valid||!Number.isFinite(rate)||rate===0} onClick={()=>{
      if(!playing&&((rate>0&&level>=tank.height)||(rate<0&&level<=0)))move(rate>0?0:tank.height)
      setPlaying(!playing)
    }}>{playing&&valid?'Pause':'Play water flow'}</button><label>Water depth<input aria-label="Water depth" type="range" min="0" max={tank.height} step="0.01" value={level} onChange={event=>move(Number(event.target.value))}/></label><output>{num(level)} / {tank.height} m</output></div>
    <p className="water-tank-note">{known==='y'?'Playback keeps dV/dt constant.':'Playback keeps dh/dt constant; the volume rate adjusts.'} Stops at empty or full. Use a negative rate to drain the tank. Moving the depth slider updates both h and V.</p>
    <div className="water-tank-formula"><TeX math={id==='cone'?String.raw`\frac rh=\frac36=\frac12,\quad V=\frac13\pi r^2h=\frac{\pi h^3}{12},\quad \frac{dV}{dt}=\frac{\pi h^2}{4}\frac{dh}{dt}`:String.raw`V=4^2h=16h,\qquad\frac{dV}{dt}=16\frac{dh}{dt}`} /></div>
  </section>
}
