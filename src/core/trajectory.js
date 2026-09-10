import { CatmullRomCurve3, Vector3 } from 'three'
import { clamp01, ease, lerp } from './math.js'

export function createTrajectory(nodes) {
  const posPts = []
  const tgtPts = []
  const keyIndex = []

  nodes.forEach((n, i) => {
    keyIndex[i] = posPts.length
    posPts.push(new Vector3(...n.pose.position))
    tgtPts.push(new Vector3(...n.pose.target))
    if (i < nodes.length - 1) {
      for (const v of n.via ?? []) {
        posPts.push(new Vector3(...v.position))
        tgtPts.push(new Vector3(...v.target))
      }
    }
  })

  const last = posPts.length - 1
  const posCurve = new CatmullRomCurve3(posPts, false, 'centripetal', 0.5)
  const tgtCurve = new CatmullRomCurve3(tgtPts, false, 'centripetal', 0.5)
  const keyU = keyIndex.map(i => i / last)

  const weights = nodes.map(n => n.span ?? 1)
  const total = weights.reduce((a, b) => a + b, 0)
  const bounds = [0]
  for (const w of weights) bounds.push(bounds[bounds.length - 1] + w / total)
  bounds[bounds.length - 1] = 1

  const outPos = new Vector3()
  const outTgt = new Vector3()
  const state = {
    progress: 0,
    node: 0,
    localP: 0,
    travel: 0,
    fov: nodes[0].pose.fov,
    position: outPos,
    target: outTgt
  }

  function sample(progress) {
    const p = clamp01(progress)
    let i = 0
    while (i < nodes.length - 1 && p >= bounds[i + 1]) i++

    const localP = clamp01((p - bounds[i]) / (bounds[i + 1] - bounds[i]))
    const node = nodes[i]
    const hold = node.hold ?? 0.4
    const isLast = i === nodes.length - 1

    const travel =
      isLast || hold >= 1
        ? 0
        : localP <= hold
          ? 0
          : ease(node.ease, (localP - hold) / (1 - hold))

    const u = isLast ? keyU[i] : lerp(keyU[i], keyU[i + 1], travel)
    posCurve.getPoint(u, outPos)
    tgtCurve.getPoint(u, outTgt)

    state.progress = p
    state.node = i
    state.localP = localP
    state.travel = travel
    state.fov = isLast ? node.pose.fov : lerp(node.pose.fov, nodes[i + 1].pose.fov, travel)
    return state
  }

  function panelOpacity(i, s) {
    if (s.node === i) return 1 - clamp01((s.travel - 0.15) / 0.35)
    if (s.node === i - 1) return clamp01((s.travel - 0.62) / 0.38)
    return 0
  }

  function progressForNode(i) {
    const node = nodes[i]
    const hold = Math.min(node.hold ?? 0.4, 0.999)
    return bounds[i] + (bounds[i + 1] - bounds[i]) * hold * 0.5
  }

  return { sample, panelOpacity, progressForNode, bounds, totalSpan: total, posCurve, tgtCurve }
}
