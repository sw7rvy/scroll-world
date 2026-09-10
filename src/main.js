import { config } from './scroll-world.config.js'
import { createTrajectory } from './core/trajectory.js'
import { ScrollEngine } from './core/scroll-engine.js'
import { createWorld } from './core/world.js'
import { createStoryUI } from './core/story-ui.js'
import { mountMobile } from './core/mobile.js'
import { createModeController, supportsWebGL } from './core/responsive.js'

const dom = {
  canvas: document.getElementById('world-canvas'),
  story: document.getElementById('story'),
  beacons: document.getElementById('beacons'),
  track: document.getElementById('scroll-track'),
  mobileRoot: document.getElementById('mobile-root'),
  isoCanvas: document.getElementById('iso-canvas'),
  rail: document.getElementById('snap-rail'),
  dots: document.getElementById('snap-dots'),
  badge: document.getElementById('iso-badge')
}

const trajectory = createTrajectory(config.nodes)

function mountDesktop() {
  document.documentElement.style.setProperty(
    '--track',
    `${Math.round(trajectory.totalSpan * config.scroll.vhPerSpan)}vh`
  )

  const world = createWorld(dom.canvas)
  const engine = new ScrollEngine(config.scroll)

  const ui = createStoryUI({
    story: dom.story,
    beacons: dom.beacons,
    onSeek: i => engine.scrollToProgress(trajectory.progressForNode(i))
  })

  world.onHover(mod => ui.setProbe(mod))

  const unsubscribe = engine.onFrame((progress, dt) => {
    const sample = trajectory.sample(progress)
    world.render(sample, dt)
    ui.update(sample, trajectory.panelOpacity)
  })

  const onResize = () => engine.resize()
  window.addEventListener('resize', onResize)

  window.scrollWorld = {
    engine,
    trajectory,
    seekNode: i => engine.scrollToProgress(trajectory.progressForNode(i)),
    preview: p => engine.setOverride(p),
    release: () => engine.setOverride(null)
  }

  return () => {
    window.removeEventListener('resize', onResize)
    unsubscribe()
    engine.destroy()
    ui.destroy()
    delete window.scrollWorld
    world.dispose()
    document.documentElement.style.removeProperty('--track')
  }
}

const webgl = supportsWebGL()

function mountMobileMode() {
  window.scrollTo(0, 0)
  return mountMobile({
    root: dom.mobileRoot,
    canvas: dom.isoCanvas,
    rail: dom.rail,
    dots: dom.dots,
    badge: dom.badge,
    webgl
  })
}

const controller = createModeController({
  breakpoint: config.breakpoint,
  force: webgl ? null : 'mobile',
  onDesktop: mountDesktop,
  onMobile: mountMobileMode
})

if (import.meta.hot) import.meta.hot.dispose(() => controller.destroy())

export { controller, trajectory }

