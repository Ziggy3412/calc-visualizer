import { useState, useRef, useEffect, useCallback } from 'react'
import { viewportForBounds } from './graphFit'

// Rectangular windows let a tall function fit without shrinking its x-domain.
// A changed fit key reframes new inputs once, preserving later manual pan/zoom.
export default function usePlotView(initialZoom = 10, centerX = 0, centerY = 0, fit = null) {
  const [viewport,setViewport]=useState(()=>({zoom:initialZoom,aspect:1,panX:0,panY:0,key:fit?.key,...viewportForBounds(fit?.bounds,centerX,centerY)}))
  if(fit && viewport.key!==fit.key) {
    const fitted=viewportForBounds(fit.bounds,centerX,centerY)
    setViewport({...viewport,...fitted,key:fit.key})
  }
  const centerRef=useRef({x:centerX,y:centerY})
  const fitRef=useRef(fit?.bounds)
  useEffect(()=>{centerRef.current={x:centerX,y:centerY};fitRef.current=fit?.bounds})
  const scale=useCallback(factor=>setViewport(v=>({...v,zoom:Math.max(1e-6,Math.min(1e12,v.zoom*factor))})),[])
  const zoomIn=useCallback(()=>scale(.7),[scale])
  const zoomOut=useCallback(()=>scale(1/.7),[scale])
  const resetView=useCallback(()=>{
    const fitted=viewportForBounds(fitRef.current,centerRef.current.x,centerRef.current.y)
    setViewport(v=>({...v,zoom:initialZoom,aspect:1,panX:0,panY:0,...fitted}))
  },[initialZoom])
  const fitBounds=useCallback(bounds=>{
    const fitted=viewportForBounds(bounds,centerRef.current.x,centerRef.current.y)
    if(fitted)setViewport(v=>({...v,...fitted}))
  },[])
  const fitView=useCallback(halfRange=>{
    if(Number.isFinite(halfRange))setViewport(v=>({...v,zoom:Math.max(1e-6,halfRange),aspect:1,panX:0,panY:0}))
  },[])
  const handleWheel=useCallback(event=>{
    event.preventDefault()
    scale(event.deltaY<0?.85:1/.85)
  },[scale])
  const handleRelayout=useCallback(update=>{
    const xs=update['xaxis.range'] ?? [update['xaxis.range[0]'],update['xaxis.range[1]']]
    const ys=update['yaxis.range'] ?? [update['yaxis.range[0]'],update['yaxis.range[1]']]
    const hasX=xs.every(Number.isFinite),hasY=ys.every(Number.isFinite)
    if(hasX || hasY)setViewport(v=>{
      const center=centerRef.current
      const fitted=viewportForBounds({
        xMin:hasX?xs[0]:center.x-v.zoom+v.panX,
        xMax:hasX?xs[1]:center.x+v.zoom+v.panX,
        yMin:hasY?ys[0]:center.y-v.zoom*v.aspect+v.panY,
        yMax:hasY?ys[1]:center.y+v.zoom*v.aspect+v.panY,
      },center.x,center.y)
      return fitted?{...v,...fitted}:v
    })
  },[])
  const {zoom,aspect,panX,panY}=viewport
  return {zoom,xMin:centerX-zoom+panX,xMax:centerX+zoom+panX,yMin:centerY-zoom*aspect+panY,yMax:centerY+zoom*aspect+panY,zoomIn,zoomOut,resetView,fitView,fitBounds,handleWheel,handleRelayout}
}
