import { PerspectiveCamera, Vector3 } from 'three'
import { damp } from './math.js'

export function createCameraRig({ near, far }, opts = {}) {
  const camera = new PerspectiveCamera(55, 1, near, far)
  const pos = new Vector3()
  const tgt = new Vector3()
  const lambda = opts.lambda ?? 14
  let fov = 55
  let primed = false

  function apply(sample, dt) {
    if (!primed) {
      pos.copy(sample.position)
      tgt.copy(sample.target)
      fov = sample.fov
      primed = true
    } else {
      pos.x = damp(pos.x, sample.position.x, lambda, dt)
      pos.y = damp(pos.y, sample.position.y, lambda, dt)
      pos.z = damp(pos.z, sample.position.z, lambda, dt)
      tgt.x = damp(tgt.x, sample.target.x, lambda, dt)
      tgt.y = damp(tgt.y, sample.target.y, lambda, dt)
      tgt.z = damp(tgt.z, sample.target.z, lambda, dt)
      fov = damp(fov, sample.fov, lambda, dt)
    }

    camera.position.copy(pos)
    camera.lookAt(tgt)
    if (Math.abs(camera.fov - fov) > 0.001) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }
  }

  function setAspect(aspect) {
    camera.aspect = aspect
    camera.updateProjectionMatrix()
  }

  return { camera, apply, setAspect, focus: tgt }
}
