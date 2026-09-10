import {
  BoxGeometry, BufferGeometry, Color, Float32BufferAttribute, Group, InstancedMesh,
  LineBasicMaterial, LineSegments, Matrix4, MeshStandardMaterial, Object3D, Vector3
} from 'three'
import { palette } from '../scroll-world.config.js'

export const MODULES = [
  { id: 'edge', label: 'Edge ingress', detail: 'TLS termination, rate limits, regional failover', at: [-11, 4, 10] },
  { id: 'bus', label: 'Event bus', detail: 'Exactly-once delivery, replayable partitions', at: [11, 7, 2] },
  { id: 'store', label: 'State store', detail: 'Versioned records, point-in-time restore', at: [-12, 11, -8] },
  { id: 'engine', label: 'Rules engine', detail: 'Declarative policy, hot reload, dry-run mode', at: [10, 14, -14] },
  { id: 'agents', label: 'Agent runtime', detail: 'Sandboxed tools, budgets, full audit trail', at: [-8, 17, -22] },
  { id: 'obs', label: 'Observability', detail: 'Traces, cost per request, SLO burn alerts', at: [12, 20, -30] }
]

const LINKS = [[0, 1], [1, 2], [1, 3], [2, 3], [3, 4], [1, 4], [4, 5], [3, 5]]

export function createArchitectureNode(zone) {
  const group = new Group()
  group.position.set(...zone)

  const geo = new BoxGeometry(5, 5, 5)
  const mat = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.45, emissive: new Color(0x0f1826), emissiveIntensity: 1 })
  const mesh = new InstancedMesh(geo, mat, MODULES.length)
  mesh.userData.kind = 'architecture-module'

  const dummy = new Object3D()
  const base = new Color(0x54648a)
  const hot = new Color(palette.accent)

  MODULES.forEach((m, i) => {
    dummy.position.set(...m.at)
    dummy.rotation.set(0, i * 0.4, 0)
    dummy.updateMatrix()
    mesh.setMatrixAt(i, dummy.matrix)
    mesh.setColorAt(i, base)
  })
  mesh.instanceMatrix.needsUpdate = true
  group.add(mesh)

  const verts = []
  for (const [a, b] of LINKS) verts.push(...MODULES[a].at, ...MODULES[b].at)
  const lineGeo = new BufferGeometry()
  lineGeo.setAttribute('position', new Float32BufferAttribute(verts, 3))
  const lineMat = new LineBasicMaterial({ color: palette.accent, transparent: true, opacity: 0.4 })
  const lines = new LineSegments(lineGeo, lineMat)
  group.add(lines)

  const tmp = new Matrix4()
  const scaleVec = new Vector3()
  const cur = new Color()
  let hovered = -1
  let t = 0

  return {
    id: 'architecture',
    group,
    interactive: [mesh],
    setHover(instanceId) {
      if (hovered === instanceId) return false
      hovered = instanceId
      MODULES.forEach((_, i) => {
        cur.copy(i === hovered ? hot : base)
        mesh.setColorAt(i, cur)
      })
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      return true
    },
    hoveredModule: () => (hovered >= 0 ? MODULES[hovered] : null),
    update(dt, state) {
      t += dt
      lineMat.opacity = 0.3 + (state.active ? state.localP * 0.45 : 0.05)
      MODULES.forEach((m, i) => {
        const bob = Math.sin(t * 0.8 + i) * 0.22
        const scale = i === hovered ? 1.22 : 1
        tmp.makeRotationY(t * 0.12 + i * 0.4)
        tmp.scale(scaleVec.setScalar(scale))
        tmp.setPosition(m.at[0], m.at[1] + bob, m.at[2])
        mesh.setMatrixAt(i, tmp)
      })
      mesh.instanceMatrix.needsUpdate = true
    },
    dispose() {
      geo.dispose()
      mat.dispose()
      lineGeo.dispose()
      lineMat.dispose()
      mesh.dispose()
    }
  }
}

