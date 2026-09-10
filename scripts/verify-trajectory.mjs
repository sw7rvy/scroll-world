import { config } from '../src/scroll-world.config.js'
import { createTrajectory } from '../src/core/trajectory.js'

const t = createTrajectory(config.nodes)
let fail = 0
const check = (name, ok, extra = '') => {
  if (!ok) {
    fail++
    console.log(`FAIL ${name} ${extra}`)
  }
}

check('bounds start', t.bounds[0] === 0)
check('bounds end', Math.abs(t.bounds.at(-1) - 1) < 1e-9, t.bounds.at(-1))
check('bounds monotonic', t.bounds.every((b, i) => i === 0 || b > t.bounds[i - 1]))

const STEPS = 4000
let prev = null
let maxJump = 0
const nodeHits = new Set()

for (let i = 0; i <= STEPS; i++) {
  const p = i / STEPS
  const s = t.sample(p)
  nodeHits.add(s.node)
  check(`fov finite @${p}`, Number.isFinite(s.fov), s.fov)
  check(`pos finite @${p}`, [s.position.x, s.position.y, s.position.z].every(Number.isFinite))
  check(`tgt finite @${p}`, [s.target.x, s.target.y, s.target.z].every(Number.isFinite))
  check(`localP range @${p}`, s.localP >= 0 && s.localP <= 1, s.localP)
  if (prev) maxJump = Math.max(maxJump, Math.hypot(s.position.x - prev.x, s.position.y - prev.y, s.position.z - prev.z))
  prev = { x: s.position.x, y: s.position.y, z: s.position.z }
}

check('all nodes reachable', nodeHits.size === config.nodes.length, [...nodeHits].join(','))
check('no camera teleport', maxJump < 1.2, `maxJump=${maxJump.toFixed(4)}`)

for (let i = 0; i < config.nodes.length; i++) {
  const s = t.sample(t.progressForNode(i))
  check(`node ${i} parks at pose`, s.node === i && s.travel === 0, `node=${s.node} travel=${s.travel}`)
  const pose = config.nodes[i].pose.position
  const d = Math.hypot(s.position.x - pose[0], s.position.y - pose[1], s.position.z - pose[2])
  check(`node ${i} pose exact`, d < 1e-6, `dist=${d}`)
  check(`node ${i} panel visible`, t.panelOpacity(i, s) > 0.99, t.panelOpacity(i, s))
}

let maxSum = 0
for (let i = 0; i <= STEPS; i++) {
  const s = t.sample(i / STEPS)
  const sum = config.nodes.reduce((a, _, k) => a + t.panelOpacity(k, s), 0)
  maxSum = Math.max(maxSum, sum)
  check(`opacity range @${i}`, config.nodes.every((_, k) => {
    const o = t.panelOpacity(k, s)
    return o >= 0 && o <= 1
  }))
}
check('panels never stack', maxSum <= 1.001, `maxSum=${maxSum.toFixed(3)}`)

const head = t.sample(0)
check('progress 0 -> node 0 pose', head.node === 0 && head.travel === 0)
const tail = t.sample(1)
check('progress 1 -> last node', tail.node === config.nodes.length - 1)
const lastPose = config.nodes.at(-1).pose.position
check(
  'progress 1 parks at CTA',
  Math.hypot(tail.position.x - lastPose[0], tail.position.y - lastPose[1], tail.position.z - lastPose[2]) < 1e-6
)

console.log(fail === 0 ? `PASS (maxJump=${maxJump.toFixed(4)}, track=${Math.round(t.totalSpan * config.scroll.vhPerSpan)}vh)` : `${fail} FAILURES`)
process.exit(fail === 0 ? 0 : 1)
