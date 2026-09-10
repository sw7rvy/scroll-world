export function supportsWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2')) ||
      !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')))
  } catch {
    return false
  }
}

export function createModeController({ breakpoint, onDesktop, onMobile, force }) {
  const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
  let mode = null
  let teardown = null

  function resolve() {
    if (force) return force
    return mq.matches ? 'mobile' : 'desktop'
  }

  function apply() {
    const next = resolve()
    if (next === mode) return
    if (teardown) teardown()
    mode = next
    document.documentElement.dataset.mode = mode
    teardown = mode === 'mobile' ? onMobile() : onDesktop()
  }

  mq.addEventListener('change', apply)
  apply()

  return {
    get mode() {
      return mode
    },
    destroy() {
      mq.removeEventListener('change', apply)
      if (teardown) teardown()
    }
  }
}
