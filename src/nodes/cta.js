import {
  Color, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry,
  RingGeometry, TorusGeometry
} from 'three'
import { palette } from '../scroll-world.config.js'

export function createCtaNode(zone) {
  const group = new Group()
  group.position.set(...zone)

  const glow = new MeshStandardMaterial({
    color: palette.accent,
    emissive: new Color(palette.accent),
    emissiveIntensity: 3,
    roughness: 0.2
  })

  const portal = new Mesh(new TorusGeometry(15, 0.16, 12, 180), glow)
  portal.position.set(0, 15.5, -13)
  group.add(portal)

  const inner = new Mesh(
    new RingGeometry(0, 14.85, 96),
    new MeshBasicMaterial({ color: 0x0b1620, transparent: true, opacity: 0.9 })
  )
  inner.position.set(0, 15.5, -13.3)
  group.add(inner)

  const reflect = new Mesh(
    new PlaneGeometry(60, 60),
    new MeshStandardMaterial({ color: 0x0a0d14, roughness: 0.18, metalness: 0.9 })
  )
  reflect.rotation.x = -Math.PI / 2
  reflect.position.y = 0.02
  group.add(reflect)

  return {
    id: 'cta',
    group,
    interactive: [],
    update(dt, state) {
      const t = state.elapsed
      portal.rotation.z = t * 0.08
      const pulse = 1 + Math.sin(t * 1.4) * 0.015
      portal.scale.setScalar(pulse)
      glow.emissiveIntensity = 2.2 + (state.active ? state.localP * 2.4 : 0) + Math.sin(t * 2) * 0.3
      inner.material.opacity = 0.92 - (state.active ? state.localP * 0.25 : 0)
    },
    dispose() {
      portal.geometry.dispose()
      inner.geometry.dispose()
      inner.material.dispose()
      reflect.geometry.dispose()
      reflect.material.dispose()
      glow.dispose()
    }
  }
}

