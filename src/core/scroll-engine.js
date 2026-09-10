import Lenis from 'lenis'
import { clamp01, frameRate } from './math.js'

export class ScrollEngine {
  constructor(opts = {}) {
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    this.lenis = new Lenis({
      duration: opts.duration ?? 1.15,
      lerp: this.reduced ? 1 : (opts.lerp ?? 0.1),
      wheelMultiplier: opts.wheelMultiplier ?? 1,
      smoothWheel: !this.reduced,
      syncTouch: false,
      autoRaf: false
    })

    this.damping = this.reduced ? 1 : (opts.damping ?? 0.26)
    this.epsilon = opts.epsilon ?? 0.00002
    this.raw = 0
    this.override = null
    this.value = 0
    this.velocity = 0
    this.subs = new Set()
    this.running = true
    this._last = performance.now()
    this._tick = this._tick.bind(this)
    this._id = requestAnimationFrame(this._tick)
  }

  _tick(time) {
    if (!this.running) return
    this._id = requestAnimationFrame(this._tick)

    const dt = Math.min((time - this._last) / 1000, 1 / 20)
    this._last = time

    this.lenis.raf(time)

    const limit = this.lenis.limit || 1
    this.raw = this.override === null ? clamp01(this.lenis.scroll / limit) : clamp01(this.override)

    const k = frameRate(this.damping, dt)
    const next = this.value + (this.raw - this.value) * k
    this.velocity = dt > 0 ? (next - this.value) / dt : 0
    this.value = Math.abs(this.raw - next) < this.epsilon ? this.raw : next

    for (const fn of this.subs) fn(this.value, dt, this)
  }

  setOverride(p) {
    this.override = p
  }

  onFrame(fn) {
    this.subs.add(fn)
    return () => this.subs.delete(fn)
  }

  scrollToProgress(p, opts = {}) {
    this.lenis.scrollTo((this.lenis.limit || 0) * clamp01(p), { duration: 1.4, ...opts })
  }

  resize() {
    this.lenis.resize()
  }

  destroy() {
    this.running = false
    cancelAnimationFrame(this._id)
    this.subs.clear()
    this.lenis.destroy()
  }
}

