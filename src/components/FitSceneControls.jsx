import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Box3, Sphere } from 'three'

function frameScene(scene,camera,controls,invalidate) {
    scene.updateMatrixWorld(true)
    const box=new Box3()
    scene.traverse(object=>{
      if(object.isMesh && object.visible && object.geometry) {
        object.geometry.computeBoundingBox()
        if(object.geometry.boundingBox)box.union(object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld))
      }
    })
    if(box.isEmpty())return
    const sphere=box.getBoundingSphere(new Sphere())
    if(!Number.isFinite(sphere.radius) || sphere.radius<=0)return
    const direction=camera.position.clone().sub(controls?.target ?? sphere.center)
    if(direction.lengthSq()<1e-10)direction.set(1,1,1)
    const vertical=camera.fov*Math.PI/360
    const angle=Math.min(vertical,Math.atan(Math.tan(vertical)*camera.aspect))
    const distance=sphere.radius/Math.sin(angle)*1.15
    camera.position.copy(sphere.center).add(direction.normalize().multiplyScalar(distance))
    camera.near=Math.max(0.00001,sphere.radius/10000)
    camera.far=Math.max(1000,distance+sphere.radius*10)
    camera.updateProjectionMatrix()
    camera.lookAt(sphere.center)
    if(controls) {
      controls.target.copy(sphere.center)
      controls.maxDistance=Infinity
      controls.update()
    }
    invalidate()
  }

export default function FitSceneControls({ fitKey }) {
  const { scene, camera, controls, invalidate } = useThree()
  const fittedKey=useRef(null)
  const fitGraph=()=>frameScene(scene,camera,controls,invalidate)

  useFrame(()=>{
    if(fittedKey.current!==fitKey && controls) {fitGraph();fittedKey.current=fitKey}
  })
  return null
}
