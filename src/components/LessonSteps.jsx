import {useState} from 'react'
import '../visualizers/Lessons.css'

export default function LessonSteps({steps}) {
  const [shown,setShown]=useState(steps.length)
  return <section className="lesson-notes" aria-label="Worked solution">
    <div className="lesson-toolbar"><h2>Worked solution</h2><div>
      {shown>=steps.length?<button className="viz-btn" onClick={()=>setShown(1)}>One step at a time</button>:<>
        <button className="viz-btn" onClick={()=>setShown(n=>Math.min(steps.length,n+1))}>Next step</button>
        <button className="viz-btn" onClick={()=>setShown(steps.length)}>Show all steps</button>
      </>}
    </div></div>
    <ol className="lesson-steps">{steps.slice(0,shown).map((step,i)=><li key={i}><h3>{step.title}</h3>{step.content}</li>)}</ol>
  </section>
}
