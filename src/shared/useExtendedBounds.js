import {useState} from 'react'
import {previewBounds} from './infinity'
export default function useExtendedBounds(initial,defaultA=0,defaultB=2) {
 const [boundA,setA]=useState(initial.a??defaultA),[boundB,setB]=useState(initial.b??defaultB)
 const [reach,setReach]=useState(10)
 const [a,b]=previewBounds(boundA,boundB,reach)
 return {a,b,boundA,boundB,setA,setB,unbounded:!Number.isFinite(boundA)||!Number.isFinite(boundB),reach,setReach}
}
