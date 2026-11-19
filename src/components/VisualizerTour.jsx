import {useEffect,useId,useRef,useState} from 'react'
import {VISUALIZER_TOURS,placeTourCard} from '../shared/visualizerTours'
import {VISUALIZER_GUIDES} from '../shared/visualizerGuides'
import {TOOLS} from '../shared/tools'
import './VisualizerTour.css'

const EMPTY=[]
function findTarget(pane,target) {
 if(!pane)return null
 const matches=[...new Set(target.selector.split(',').flatMap(selector=>[...pane.querySelectorAll(selector.trim())]))].filter(el=>{
  if(!el.getClientRects().length)return false
  if(!target.match)return true
  const text=el.textContent+' '+[...el.querySelectorAll('[aria-label]')].map(child=>child.getAttribute('aria-label')).join(' ')
  return text.toLowerCase().includes(target.match.toLowerCase())
 })
 return matches[target.index||0]||null
}
export default function VisualizerTour({toolId,onClose,onFullGuide,onTryExample}) {
 const dialog=useRef(null),card=useRef(null)
 const [index,setIndex]=useState(0),[steps,setSteps]=useState([]),[geometry,setGeometry]=useState(null)
 const id=useId().replaceAll(':',''),definition=VISUALIZER_TOURS[toolId]||EMPTY
 const tool=TOOLS.find(item=>item.id===toolId)
 const current=Math.min(index,Math.max(0,steps.length-1)),step=steps[current]||definition[0]
 useEffect(()=>{
  const focused=document.activeElement
  const pane=[...document.querySelectorAll('.tab-content')].find(el=>el.style.display!=='none')
  const scrolls=[...(pane?.querySelectorAll('.viz-panel,.viz-main,.lesson-main')||[])].map(el=>({el,top:el.scrollTop,left:el.scrollLeft}))
  const modal=dialog.current
  modal.showModal()
  return()=>{
   if(modal.open)modal.close()
   for(const {el,top,left} of scrolls)el.scrollTo({top,left,behavior:'instant'})
   focused?.focus({preventScroll:true})
  }
 },[])
 useEffect(()=>{
  const pane=[...document.querySelectorAll('.tab-content')].find(el=>el.style.display!=='none')
  let frame,scrolled=false
  function measure() {
   const available=definition.filter(item=>findTarget(pane,item.target))
   setSteps(previous=>previous.map(s=>s.title).join('|')===available.map(s=>s.title).join('|')?previous:available)
   const target=findTarget(pane,available[Math.min(index,available.length-1)]?.target||definition[0].target)
   if(target&&!scrolled){target.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});scrolled=true}
   const rect=target?.getBoundingClientRect(),width=window.innerWidth,height=window.innerHeight
   const size=card.current?.getBoundingClientRect()
   const box=rect?{left:Math.max(8,rect.left-7),top:Math.max(8,rect.top-7),right:Math.min(width-8,rect.right+7),bottom:Math.min(height-8,rect.bottom+7)}:null
   setGeometry({box,width,height,placement:placeTourCard(box||{left:width/2,top:height/2,right:width/2,bottom:height/2},width,height,Math.min(360,width-32),size?.height||290)})
  }
  function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(measure)}
  schedule()
  const observer=new ResizeObserver(schedule)
  if(card.current)observer.observe(card.current)
  if(pane)observer.observe(pane)
  window.addEventListener('resize',schedule)
  window.addEventListener('scroll',schedule,true)
  return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',schedule);window.removeEventListener('scroll',schedule,true)}
 },[definition,index])
 const box=geometry?.box,placement=geometry?.placement
 const last=current>=steps.length-1
 function next(){if(last)onClose();else setIndex(current+1)}
 const start=placement?{x:placement.left+placement.width/2,y:placement.top}:null
 let end
 if(box&&start) {
  if(placement.left>=box.right) {start.x=placement.left;start.y=placement.top+70;end={x:box.right+3,y:Math.max(box.top+12,Math.min(box.bottom-12,start.y))}}
  else if(placement.left+placement.width<=box.left) {start.x=placement.left+placement.width;start.y=placement.top+70;end={x:box.left-3,y:Math.max(box.top+12,Math.min(box.bottom-12,start.y))}}
  else if(placement.top>=box.bottom)end={x:Math.max(box.left+12,Math.min(box.right-12,start.x)),y:box.bottom+3}
  else {start.x=placement.left;start.y=placement.top+70;end={x:box.left+12,y:Math.max(box.top+12,Math.min(box.bottom-12,start.y-70))}}
 }
 return <dialog className="visualizer-tour" ref={dialog} aria-label={`${tool?.label} guided tour`} onCancel={event=>{event.preventDefault();onClose()}} onKeyDown={event=>{
  if(event.key==='ArrowRight'){event.preventDefault();next()}
  if(event.key==='ArrowLeft'){event.preventDefault();setIndex(Math.max(0,current-1))}
 }}>
  <svg className="tour-screen" width="100%" height="100%" onClick={onClose} aria-hidden="true">
   <defs><mask id={`${id}-mask`}><rect width="100%" height="100%" fill="white"/>{box&&<rect x={box.left} y={box.top} width={Math.max(0,box.right-box.left)} height={Math.max(0,box.bottom-box.top)} rx="9" fill="black"/>}</mask><marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10" fill="#2d70b3" stroke="white" strokeWidth=".7"/></marker></defs>
   <rect width="100%" height="100%" fill="rgba(35,38,43,.76)" mask={`url(#${id}-mask)`}/>
   {box&&<rect x={box.left} y={box.top} width={Math.max(0,box.right-box.left)} height={Math.max(0,box.bottom-box.top)} rx="9" fill="none" stroke="white" strokeWidth="2"/>}
   {start&&end&&<path d={`M${start.x},${start.y} Q${(start.x+end.x)/2},${start.y-35} ${end.x},${end.y}`} fill="none" stroke="#2d70b3" strokeWidth="3" markerEnd={`url(#${id}-arrow)`}/>}
  </svg>
  <div className="tour-topbar"><div><span>GUIDED TOUR</span><strong>{tool?.label}</strong></div><button onClick={onClose} aria-label="Close guided tour">End tour ×</button></div>
  <section className="tour-card" ref={card} style={placement||{left:'50%',top:'50%',transform:'translate(-50%,-50%)'}} aria-live="polite" aria-atomic="true">
   <div className="tour-progress">{current+1} / {steps.length||definition.length}<span>Use ← → or the buttons</span></div>
   <h2>{step?.title}</h2><p>{step?.text}</p>
   <div className="tour-navigation"><button disabled={current===0} onClick={()=>setIndex(current-1)}>← Back</button><button className="tour-next" onClick={next}>{last?'Finish tour':'Next →'}</button></div>
   <div className="tour-extras"><button onClick={onFullGuide}>Read full explanation</button><button onClick={()=>onTryExample(toolId,VISUALIZER_GUIDES[toolId].example.initial)}>Load worked example</button></div>
   <small>Opens the example in a new tab and closes this tour.</small>
  </section>
 </dialog>
}
