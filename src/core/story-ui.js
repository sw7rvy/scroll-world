import { config } from '../scroll-world.config.js'

export function createStoryUI({ story, beacons, onSeek }) {
  story.replaceChildren()
  beacons.replaceChildren()

  const panels = config.nodes.map((n, i) => {
    const el = document.createElement('article')
    el.className = `panel panel--${n.align ?? 'left'}`
    el.dataset.node = n.id

    const eyebrow = document.createElement('p')
    eyebrow.className = 'panel__eyebrow'
    eyebrow.textContent = n.eyebrow

    const title = document.createElement('h2')
    title.className = 'panel__title'
    title.textContent = n.title

    const body = document.createElement('p')
    body.className = 'panel__body'
    body.textContent = n.body

    el.append(eyebrow, title, body)

    if (n.cta) {
      const a = document.createElement('a')
      a.className = 'panel__cta'
      a.href = n.cta.href
      a.textContent = n.cta.label
      el.append(a)
    }

    if (n.interactive) {
      const probe = document.createElement('div')
      probe.className = 'panel__probe'
      probe.hidden = true
      el.append(probe)
    }

    story.append(el)
    return { el, node: n, index: i, opacity: -1 }
  })

  config.nodes.forEach((n, i) => {
    const b = document.createElement('button')
    b.className = 'beacon'
    b.type = 'button'
    b.setAttribute('aria-label', n.eyebrow)

    const dot = document.createElement('span')
    dot.className = 'beacon__dot'
    const label = document.createElement('span')
    label.className = 'beacon__label'
    label.textContent = n.eyebrow

    b.append(dot, label)
    b.addEventListener('click', () => onSeek(i))
    beacons.append(b)
  })

  const dots = Array.from(beacons.querySelectorAll('.beacon'))
  let activeBeacon = -1

  function update(sample, panelOpacity) {
    for (const p of panels) {
      const o = panelOpacity(p.index, sample)
      // Coalesce mid-fade writes, but never skip the endpoints: a pure delta
      // threshold leaves a panel parked at 0.997 instead of 1, at whatever
      // value the frame timing happened to land on.
      const settled = o === 0 || o === 1
      if (!settled && Math.abs(o - p.opacity) < 0.004) continue
      if (o === p.opacity) continue
      p.opacity = o
      p.el.style.opacity = o.toFixed(3)
      p.el.style.transform = `translate3d(0, ${((1 - o) * 22).toFixed(2)}px, 0)`
      p.el.style.visibility = o < 0.01 ? 'hidden' : 'visible'
      p.el.style.pointerEvents = o > 0.9 ? 'auto' : 'none'
    }

    if (sample.node !== activeBeacon) {
      dots.forEach((d, i) => d.classList.toggle('is-active', i === sample.node))
      activeBeacon = sample.node
    }
  }

  function setProbe(mod) {
    const p = panels.find(x => x.node.interactive)
    if (!p) return
    const probe = p.el.querySelector('.panel__probe')
    if (!probe) return
    if (!mod) {
      probe.hidden = true
      probe.replaceChildren()
      return
    }
    const strong = document.createElement('strong')
    strong.textContent = mod.label
    const span = document.createElement('span')
    span.textContent = mod.detail
    probe.replaceChildren(strong, span)
    probe.hidden = false
  }

  function destroy() {
    story.replaceChildren()
    beacons.replaceChildren()
  }

  return { update, setProbe, destroy }
}
