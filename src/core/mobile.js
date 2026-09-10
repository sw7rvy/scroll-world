import {
  ACESFilmicToneMapping, AmbientLight, Color, DirectionalLight, Group, HemisphereLight,
  OrthographicCamera, Scene, Vector3, WebGLRenderer
} from 'three'
import { config, palette } from '../scroll-world.config.js'
import { createEntryNode } from '../nodes/entry.js'
import { createDioramaNode } from '../nodes/diorama.js'
import { createArchitectureNode } from '../nodes/architecture.js'
import { createCtaNode } from '../nodes/cta.js'
import { clamp01, easings } from './math.js'

const BUILDERS = {
  entry: createEntryNode,
  diorama: createDioramaNode,
  architecture: createArchitectureNode,
  cta: createCtaNode
}

function buildCard(n, i) {
  const card = document.createElement('section')
  card.className = 'snap-card'
  card.dataset.index = String(i)

  const eyebrow = document.createElement('p')
  eyebrow.className = 'snap-card__eyebrow'
  eyebrow.textContent = n.eyebrow

  const title = document.createElement('h2')
  title.className = 'snap-card__title'
  title.textContent = n.title

  const body = document.createElement('p')
  body.className = 'snap-card__body'
  body.textContent = n.body

  card.append(eyebrow, title, body)

  if (n.cta) {
    const a = document.createElement('a')
    a.className = 'snap-card__cta'
    a.href = n.cta.href
    a.textContent = n.cta.label
    card.append(a)
  }
  return card
}

export function mountMobile({ root, canvas, rail, dots, badge, webgl = true }) {
  root.hidden = false
  rail.replaceChildren()
  dots.replaceChildren()

  const cards = config.nodes.map((n, i) => {
    const card = buildCard(n, i)
    rail.append(card)

    const dot = document.createElement('button')
    dot.type = 'button'
    dot.className = 'snap-dot'
    dot.setAttribute('aria-label', n.eyebrow)
    dot.addEventListener('click', () => card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }))
    dots.append(dot)
    return card
  })

  if (!webgl) {
    const stage = canvas.parentElement
    if (stage) stage.hidden = true
    const flat = new IntersectionObserver(
      entries => {
        const v = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (!v) return
        const i = Number(v.target.dataset.index)
        Array.from(dots.children).forEach((d, di) => d.classList.toggle('is-active', di === i))
      },
      { root: rail, threshold: [0.55, 0.9] }
    )
    cards.forEach(c => flat.observe(c))
    return function unmountFlat() {
      flat.disconnect()
      if (stage) stage.hidden = false
      rail.replaceChildren()
      dots.replaceChildren()
      root.hidden = true
    }
  }

  const scene = new Scene()
  scene.background = new Color(palette.bg)

  const worldRoot = new Group()
  scene.add(worldRoot)

  const built = config.nodes.map(n => {
    const node = BUILDERS[n.id](n.zone)
    worldRoot.add(node.group)
    return node
  })

  scene.add(new AmbientLight(0xffffff, 0.5))
  scene.add(new HemisphereLight(0x6f86ff, 0x05070b, 0.6))
  const key = new DirectionalLight(0xffffff, 1.2)
  key.position.set(20, 40, 20)
  scene.add(key)

  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = ACESFilmicToneMapping

  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 900)

  const camPos = new Vector3()
  const camTgt = new Vector3()
  const fromPos = new Vector3()
  const fromTgt = new Vector3()
  const toPos = new Vector3()
  const toTgt = new Vector3()

  let zoom = config.nodes[0].iso.zoom
  let fromZoom = zoom
  let toZoom = zoom
  let index = 0
  let tween = 1
  let raf = 0
  let last = performance.now()

  function frameFor(i) {
    const n = config.nodes[i]
    return {
      position: new Vector3(
        n.zone[0] + n.iso.position[0],
        n.iso.position[1],
        n.zone[2] + n.iso.position[2]
      ),
      target: new Vector3(...n.iso.target),
      zoom: n.iso.zoom
    }
  }

  function applyViewport() {
    const w = canvas.clientWidth || window.innerWidth
    const h = canvas.clientHeight || Math.round(window.innerHeight * 0.48)
    renderer.setSize(w, h, false)
    const aspect = w / h || 1
    camera.left = -zoom * aspect * 0.5
    camera.right = zoom * aspect * 0.5
    camera.top = zoom * 0.5
    camera.bottom = -zoom * 0.5
    camera.updateProjectionMatrix()
  }

  function seek(i, instant) {
    if (i === index && tween >= 1 && !instant) return
    const f = frameFor(i)
    fromPos.copy(camPos)
    fromTgt.copy(camTgt)
    fromZoom = zoom
    toPos.copy(f.position)
    toTgt.copy(f.target)
    toZoom = f.zoom
    index = i
    tween = instant ? 1 : 0
    badge.textContent = config.nodes[i].eyebrow
    Array.from(dots.children).forEach((d, di) => d.classList.toggle('is-active', di === i))
    const hash = `#/${config.nodes[i].id}`
    if (location.hash !== hash) history.replaceState(null, '', hash)
    if (instant) {
      camPos.copy(toPos)
      camTgt.copy(toTgt)
      zoom = toZoom
    }
  }

  const deepLink = config.nodes.findIndex(n => location.hash === `#/${n.id}`)
  const startIndex = deepLink < 0 ? 0 : deepLink

  const first = frameFor(startIndex)
  camPos.copy(first.position)
  camTgt.copy(first.target)
  zoom = first.zoom
  seek(startIndex, true)
  applyViewport()
  if (startIndex > 0) rail.scrollLeft = cards[startIndex].offsetLeft

  const observer = new IntersectionObserver(
    entries => {
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
      if (visible) seek(Number(visible.target.dataset.index), false)
    },
    { root: rail, threshold: [0.55, 0.9] }
  )
  cards.forEach(c => observer.observe(c))

  function loop(now) {
    raf = requestAnimationFrame(loop)
    const dt = Math.min((now - last) / 1000, 1 / 20)
    last = now

    if (tween < 1) {
      tween = clamp01(tween + dt / 0.65)
      const e = easings.inOutCubic(tween)
      camPos.lerpVectors(fromPos, toPos, e)
      camTgt.lerpVectors(fromTgt, toTgt, e)
      zoom = fromZoom + (toZoom - fromZoom) * e
      applyViewport()
    }

    camera.position.copy(camPos)
    camera.lookAt(camTgt)

    const span = Math.max(built.length - 1, 1)
    built.forEach((n, i) =>
      n.update(dt, { progress: index / span, localP: i === index ? 1 : 0, travel: 0, active: i === index })
    )
    renderer.render(scene, camera)
  }
  raf = requestAnimationFrame(loop)

  window.addEventListener('resize', applyViewport)

  return function unmount() {
    cancelAnimationFrame(raf)
    observer.disconnect()
    window.removeEventListener('resize', applyViewport)
    built.forEach(n => {
      worldRoot.remove(n.group)
      n.dispose()
    })
    renderer.dispose()
    rail.replaceChildren()
    dots.replaceChildren()
    badge.textContent = ''
    root.hidden = true
  }
}
