import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Spherical, Vector3 } from 'three'

export default function KeyboardOrbitControls({ controlsRef, ...props }) {
  const ownRef = useRef(null)
  const ref = controlsRef || ownRef
  const { gl, camera, invalidate } = useThree()
  useEffect(() => {
    const canvas = gl.domElement
    const previousTabIndex = canvas.getAttribute('tabindex')
    const previousLabel = canvas.getAttribute('aria-label')
    canvas.setAttribute('tabindex', '0')
    canvas.setAttribute('aria-label', '3D view. Arrow keys rotate; Shift and arrow keys pan.')
    const focus = () => canvas.focus({ preventScroll: true })
    const onKeyDown = event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return
      const controls = ref.current
      if (!controls?.enabled) return
      event.preventDefault()
      event.stopPropagation()
      const horizontal = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0
      const vertical = event.key === 'ArrowUp' ? 1 : event.key === 'ArrowDown' ? -1 : 0
      const offset = camera.position.clone().sub(controls.target)
      if (event.shiftKey) {
        camera.updateMatrixWorld()
        const step = Math.max(offset.length(), 0.1) * 0.035
        const movement = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(horizontal * step)
        movement.addScaledVector(new Vector3().setFromMatrixColumn(camera.matrixWorld, 1), vertical * step)
        camera.position.add(movement)
        controls.target.add(movement)
      } else {
        const spherical = new Spherical().setFromVector3(offset)
        spherical.theta += horizontal * 0.08
        spherical.phi -= vertical * 0.08
        spherical.makeSafe()
        camera.position.copy(controls.target).add(offset.setFromSpherical(spherical))
      }
      controls.update()
      invalidate()
    }
    canvas.addEventListener('pointerdown', focus)
    canvas.addEventListener('keydown', onKeyDown)
    return () => {
      canvas.removeEventListener('pointerdown', focus)
      canvas.removeEventListener('keydown', onKeyDown)
      if (previousTabIndex === null) canvas.removeAttribute('tabindex'); else canvas.setAttribute('tabindex', previousTabIndex)
      if (previousLabel === null) canvas.removeAttribute('aria-label'); else canvas.setAttribute('aria-label', previousLabel)
    }
  }, [gl, camera, invalidate, ref])
  return <OrbitControls ref={ref} {...props} />
}
