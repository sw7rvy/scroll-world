import {
  BoxGeometry, Color, CylinderGeometry, Group, Mesh, MeshStandardMaterial
} from 'three'
import { palette } from '../scroll-world.config.js'

const SERVICES = [
  { label: 'Ingest', offset: [-9, 0, -6], height: 5.5, color: palette.accent },
  { label: 'Model', offset: [7, 0, -8], height: 8.5, color: palette.violet },
  { label: 'Automate', offset: [-6, 0, 8], height: 6.8, color: palette.amber },
  { label: 'Report', offset: [9, 0, 6], height: 4.2, color: palette.accent }
]

export function createDioramaNode(zone) {
  const group = new Group()
  group.position.set(...zone)

  const plinth = new Mesh(
    new CylinderGeometry(21, 22.5, 2.4, 64),
    new MeshStandardMaterial({ color: 0x10141d, roughness: 0.7, metalness: 0.15 })
  )
  plinth.position.y = -1.2
  plinth.receiveShadow = true
  group.add(plinth)

  const blocks = SERVICES.map(s => {
    const mat = new MeshStandardMaterial({
      color: 0x232c3d,
      emissive: new Color(s.color),
      emissiveIntensity: 0.35,
      roughness: 0.42,
      metalness: 0.25
    })
    const mesh = new Mesh(new BoxGeometry(6, s.height, 6), mat)
    mesh.position.set(s.offset[0], s.height / 2, s.offset[2])
    mesh.castShadow = true
    mesh.userData.base = s.height / 2
    group.add(mesh)

    const cap = new Mesh(
      new BoxGeometry(6.2, 0.16, 6.2),
      new MeshStandardMaterial({ color: s.color, emissive: new Color(s.color), emissiveIntensity: 2.4 })
    )
    cap.position.set(s.offset[0], s.height + 0.1, s.offset[2])
    group.add(cap)
    return { mesh, cap, spec: s }
  })

  let t = 0
  return {
    id: 'diorama',
    group,
    interactive: [],
    update(dt, state) {
      t += dt
      group.rotation.y = state.progress * 0.8 + Math.sin(t * 0.12) * 0.06
      blocks.forEach((b, i) => {
        const phase = Math.sin(t * 0.9 + i * 1.3)
        const rise = state.active ? 1 : 0.25
        const lift = b.mesh.userData.base + phase * 0.18 * rise
        b.mesh.position.y = lift
        b.cap.position.y = lift + b.mesh.geometry.parameters.height / 2 + 0.1
        b.mesh.material.emissiveIntensity = 0.28 + (state.active ? state.localP * 0.5 : 0)
      })
    },
    dispose() {
      plinth.geometry.dispose()
      plinth.material.dispose()
      blocks.forEach(b => {
        b.mesh.geometry.dispose()
        b.mesh.material.dispose()
        b.cap.geometry.dispose()
        b.cap.material.dispose()
      })
    }
  }
}

