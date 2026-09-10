export const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v)
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
export const lerp = (a, b, t) => a + (b - a) * t
export const invLerp = (a, b, v) => (b - a === 0 ? 0 : (v - a) / (b - a))

export const damp = (current, target, lambda, dt) => lerp(current, target, 1 - Math.exp(-lambda * dt))

export const frameRate = (k, dt) => 1 - Math.pow(1 - k, dt * 60)

export const easings = {
  linear: t => t,
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inOutQuint: t => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2),
  outExpo: t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t))
}

export const ease = (name, t) => (easings[name] ?? easings.inOutCubic)(clamp01(t))
