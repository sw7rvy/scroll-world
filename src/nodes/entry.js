import {
  BoxGeometry, BufferGeometry, Color, Float32BufferAttribute, Group, Mesh,
  MeshStandardMaterial, Points, PointsMaterial, TorusGeometry
} from 'three'
import { palette } from '../scroll-world.config.js'
import { createRandom } from '../core/math.js'

export function createEntryNode(zone) {
  const group = new Group()
  group.position.set(...zone)

  const stone = new MeshStandardMaterial({ color: 0x151a24, roughness: 0.85, metalness: 0.1 })
  const glow = new MeshStandardMaterial({
    color: palette.accent,
    emissive: new Color(palette.accent),
    emissiveIntensity: 2.2,
    roughness: 0.3
  })

  const pillar = new BoxGeometry(3, 22, 3)
  for (const x of [-11, 11]) {
    const m = new Mesh(pillar, stone)
    m.position.set(x, 11, 0)
    group.add(m)
  }

  const lintel = new Mesh(new BoxGeometry(28, 2.4, 4.4), stone)
  lintel.position.set(0, 23, 0)
  group.add(lintel)

  const seam = new Mesh(new BoxGeometry(19, 0.14, 0.14), glow)
  seam.position.set(0, 21.4, 2.3)
  group.add(seam)

  const halo = new Mesh(new TorusGeometry(6.4, 0.06, 8, 96), glow)
  halo.position.set(0, 10, -14)
  group.add(halo)

  const count = 420
  const rand = createRandom(0x5c0117)
  const arr = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    arr[i * 3] = (rand() - 0.5) * 90
    arr[i * 3 + 1] = rand() * 34
    arr[i * 3 + 2] = (rand() - 0.5) * 90
  }
  const motes = new BufferGeometry()
  motes.setAttribute('position', new Float32BufferAttribute(arr, 3))
  const dust = new Points(
    motes,
    new PointsMaterial({ color: palette.ink, size: 0.13, transparent: true, opacity: 0.42, depthWrite: false })
  )
  group.add(dust)

  return {
    id: 'entry',
    group,
    interactive: [],
    update(dt, state) {
      const t = state.elapsed
      halo.rotation.z = t * 0.15
      halo.scale.setScalar(1 + Math.sin(t * 0.7) * 0.02)
      dust.rotation.y = t * 0.012
      seam.material.emissiveIntensity = 1.8 + Math.sin(t * 1.6) * 0.5 + state.localP * 1.2
    },
    dispose() {
      pillar.dispose()
      lintel.geometry.dispose()
      seam.geometry.dispose()
      halo.geometry.dispose()
      motes.dispose()
      stone.dispose()
      glow.dispose()
      dust.material.dispose()
    }
  }
}
