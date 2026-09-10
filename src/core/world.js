import {
  AmbientLight, Color, DirectionalLight, Fog, GridHelper, HemisphereLight, Mesh,
  MeshStandardMaterial, PCFSoftShadowMap, PlaneGeometry, Raycaster, Scene, Vector2,
  WebGLRenderer, ACESFilmicToneMapping
} from 'three'
import { config, palette } from '../scroll-world.config.js'
import { createCameraRig } from './camera-rig.js'
import { createEntryNode } from '../nodes/entry.js'
import { createDioramaNode } from '../nodes/diorama.js'
import { createArchitectureNode } from '../nodes/architecture.js'
import { createCtaNode } from '../nodes/cta.js'

const BUILDERS = {
  entry: createEntryNode,
  diorama: createDioramaNode,
  architecture: createArchitectureNode,
  cta: createCtaNode
}

export function createWorld(canvas) {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: window.devicePixelRatio < 2,
    powerPreference: 'high-performance',
    alpha: false
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFSoftShadowMap

  const scene = new Scene()
  scene.background = new Color(palette.bg)
  scene.fog = new Fog(palette.fog, 40, 300)

  const rig = createCameraRig(config.camera)

  scene.add(new AmbientLight(0xffffff, 0.62))
  scene.add(new HemisphereLight(0x8fa2ff, 0x0a0f18, 0.9))

  const key = new DirectionalLight(0xffffff, 1.6)
  key.position.set(26, 48, 22)
  key.castShadow = true
  key.shadow.mapSize.set(1024, 1024)
  key.shadow.camera.far = 320
  scene.add(key)

  const rim = new DirectionalLight(0x7fd8ff, 0.7)
  rim.position.set(-30, 16, -220)
  scene.add(rim)

  const ground = new Mesh(
    new PlaneGeometry(600, 700),
    new MeshStandardMaterial({ color: palette.ground, roughness: 0.9, metalness: 0.1 })
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.z = -110
  ground.receiveShadow = true
  scene.add(ground)

  const grid = new GridHelper(620, 124, 0x2c3a52, 0x1b2432)
  grid.position.set(0, 0.02, -110)
  grid.material.transparent = true
  grid.material.opacity = 0.65
  scene.add(grid)

  const nodes = config.nodes.map(n => {
    const node = BUILDERS[n.id](n.zone)
    scene.add(node.group)
    return node
  })

  const interactive = nodes.flatMap(n => n.interactive ?? [])
  const raycaster = new Raycaster()
  const pointer = new Vector2(-2, -2)
  let pointerDirty = false
  let hoverListener = null

  function onPointerMove(e) {
    pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1)
    pointerDirty = true
  }
  function onPointerLeave() {
    pointer.set(-2, -2)
    pointerDirty = true
  }
  canvas.addEventListener('pointermove', onPointerMove, { passive: true })
  canvas.addEventListener('pointerleave', onPointerLeave, { passive: true })

  function resize() {
    const w = window.innerWidth
    const h = window.innerHeight
    renderer.setSize(w, h, false)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    rig.setAspect(w / h)
  }
  resize()
  window.addEventListener('resize', resize)

  function render(sample, dt) {
    rig.apply(sample, dt)

    const activeNode = config.nodes[sample.node]
    nodes.forEach((node, i) => {
      node.update(dt, {
        progress: sample.progress,
        localP: i === sample.node ? sample.localP : 0,
        travel: sample.travel,
        active: i === sample.node
      })
    })

    if (activeNode.interactive && pointerDirty) {
      pointerDirty = false
      raycaster.setFromCamera(pointer, rig.camera)
      const hits = raycaster.intersectObjects(interactive, false)
      const target = nodes[sample.node]
      const id = hits.length && hits[0].instanceId !== undefined ? hits[0].instanceId : -1
      if (target.setHover?.(id)) hoverListener?.(target.hoveredModule?.() ?? null)
      canvas.style.cursor = id >= 0 ? 'pointer' : ''
    } else if (!activeNode.interactive && canvas.style.cursor) {
      canvas.style.cursor = ''
      nodes.forEach(n => n.setHover?.(-1))
      hoverListener?.(null)
    }

    renderer.render(scene, rig.camera)
  }

  function onHover(fn) {
    hoverListener = fn
  }

  function dispose() {
    window.removeEventListener('resize', resize)
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerleave', onPointerLeave)
    nodes.forEach(n => {
      scene.remove(n.group)
      n.dispose()
    })
    ground.geometry.dispose()
    ground.material.dispose()
    grid.geometry.dispose()
    grid.material.dispose()
    renderer.dispose()
  }

  return { render, resize, dispose, onHover, camera: rig.camera, scene, renderer }
}

