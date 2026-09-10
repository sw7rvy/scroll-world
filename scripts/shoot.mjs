import { chromium } from 'playwright'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { config } from '../src/scroll-world.config.js'

const here = path.dirname(fileURLToPath(import.meta.url))

const URL = process.env.SHOT_URL ?? 'https://sw7rvy.github.io/scroll-world/'
const OUT = process.env.SHOT_OUT ?? path.join(here, '..', 'docs')
const WIDTH = Number(process.env.SHOT_WIDTH) || 1600
const HEIGHT = Number(process.env.SHOT_HEIGHT) || 900
// GPU vs software is decided by the ANGLE backend, not by headed mode: the
// headless shell reaches D3D11 just fine. Headed is a separate switch, and on
// some machines the full (non-shell) Chromium build will not start at all.
const GPU = process.env.SHOT_GPU === '1'
const HEADED = process.env.SHOT_HEADED === '1'
const CHANNEL = process.env.SHOT_CHANNEL || undefined
const MOBILE_NODE = process.env.SHOT_MOBILE_NODE ?? 'diorama'
const FORCE = process.env.SHOT_FORCE === '1'

// Text antialiasing and the dithering of the panels' radial-gradient scrim vary
// between browser sessions, so a byte comparison rewrites every file on every
// run. Compare at 1/8 scale instead: that averages most of the high-frequency
// noise away while any real change survives. Measured on this scene, session
// noise peaks at 17 (large white text over a mid-tone block, where glyph
// antialiasing survives the downsample) and the smallest genuine change at 61.
// 32 sits at the geometric midpoint, ~1.9x clear of both. Two rules, because a
// change can be loud and local or quiet and widespread: peak amplitude, and the
// share of cells clearing half the peak threshold.
const DIFF_SCALE = 8
const DIFF_PEAK = Number(process.env.SHOT_DIFF_PEAK) || 32
const DIFF_PCT = Number(process.env.SHOT_DIFF_PCT) || 0.05
const DIFF_FLOOR = Math.max(2, Math.round(DIFF_PEAK / 2))

const SWIFTSHADER = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']

mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({
  headless: !HEADED,
  channel: CHANNEL,
  args: ['--hide-scrollbars', ...(GPU ? ['--use-angle=d3d11'] : SWIFTSHADER)]
})

// A blank page used only to decode and compare PNGs, so the comparison never
// touches the page being captured.
const differ = await browser.newPage()
const tally = { new: 0, updated: 0, unchanged: 0 }

async function compare(prev, next) {
  return differ.evaluate(async ([a, b, S, floor]) => {
    const load = src => new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = 'data:image/png;base64,' + src
    })
    const [ia, ib] = await Promise.all([load(a), load(b)])
    if (ia.width !== ib.width || ia.height !== ib.height) return { resized: true }

    const w = Math.max(1, Math.round(ia.width / S))
    const h = Math.max(1, Math.round(ia.height / S))
    const c = document.createElement('canvas')
    c.width = w
    c.height = h * 2
    const ctx = c.getContext('2d', { willReadFrequently: true })
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(ia, 0, 0, w, h)
    ctx.drawImage(ib, 0, h, w, h)

    const pa = ctx.getImageData(0, 0, w, h).data
    const pb = ctx.getImageData(0, h, w, h).data
    let peak = 0
    let over = 0
    for (let i = 0; i < pa.length; i += 4) {
      const d = Math.max(
        Math.abs(pa[i] - pb[i]),
        Math.abs(pa[i + 1] - pb[i + 1]),
        Math.abs(pa[i + 2] - pb[i + 2])
      )
      if (d > peak) peak = d
      if (d > floor) over++
    }
    return { resized: false, peak, pct: (over / (w * h)) * 100 }
  }, [prev.toString('base64'), next.toString('base64'), DIFF_SCALE, DIFF_FLOOR])
}

async function write(buffer, file) {
  const target = path.join(OUT, file)

  const isNew = !existsSync(target)
  if (FORCE || isNew) {
    writeFileSync(target, buffer)
    tally[isNew ? 'new' : 'updated']++
    console.log(`  ${file.padEnd(22)} ${isNew ? 'created' : 'written (forced)'}`)
    return
  }

  const m = await compare(readFileSync(target), buffer)
  const changed = m.resized || m.peak > DIFF_PEAK || m.pct > DIFF_PCT

  if (changed) {
    writeFileSync(target, buffer)
    tally.updated++
    const why = m.resized ? 'resized' : `peak ${m.peak}, ${m.pct.toFixed(2)}% over`
    console.log(`  ${file.padEnd(22)} updated  (${why})`)
  } else {
    tally.unchanged++
    console.log(`  ${file.padEnd(22)} unchanged (noise peak ${m.peak})`)
  }
}

const page = await browser.newPage({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 1
})

const errors = []
page.on('pageerror', e => errors.push(String(e)))
page.on('console', m => m.type() === 'error' && errors.push(m.text()))

await page.goto(URL, { waitUntil: 'networkidle' })

if (WIDTH < config.breakpoint) {
  throw new Error(`SHOT_WIDTH ${WIDTH} is below the ${config.breakpoint}px breakpoint; the page mounts the mobile fallback, which has no scrollWorld hook`)
}

await page.waitForFunction(() => typeof window.scrollWorld === 'object', null, { timeout: 20000 })

const renderer = await page.evaluate(() => {
  const gl = document.getElementById('world-canvas').getContext('webgl2')
  const ext = gl.getExtension('WEBGL_debug_renderer_info')
  return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)
})
console.log(`renderer: ${renderer}`)

// Scene animations run off a shared clock. Pinning it makes every capture land
// on the same frame, so re-shooting only rewrites images that actually changed.
const CLOCK = Number(process.env.SHOT_CLOCK) || 6

await page.evaluate(t => window.scrollWorld.freezeTime(t), CLOCK)
await page.waitForTimeout(2500)

for (const [i, node] of config.nodes.entries()) {
  const file = `${String(i + 1).padStart(2, '0')}-${node.id}.png`

  await page.evaluate(n => {
    window.scrollWorld.preview(window.scrollWorld.trajectory.progressForNode(n))
  }, i)
  await page.waitForTimeout(2200)

  if (node.interactive) {
    let hit = false
    for (let x = WIDTH * 0.38; x <= WIDTH * 0.76 && !hit; x += 20) {
      for (let y = HEIGHT * 0.28; y <= HEIGHT * 0.76 && !hit; y += 20) {
        await page.mouse.move(x, y)
        await page.waitForTimeout(45)
        hit = await page.evaluate(() => {
          const p = document.querySelector('.panel__probe')
          return !!p && !p.hidden
        })
      }
    }
    if (!hit) console.warn(`  no module found under the pointer sweep for "${node.id}" - widen the sweep if the layout moved`)
    await page.waitForTimeout(700)
  }

  await write(await page.screenshot(), file)
}

await page.close()

const mobileNode = config.nodes.find(n => n.id === MOBILE_NODE)
if (!mobileNode) {
  throw new Error(`SHOT_MOBILE_NODE "${MOBILE_NODE}" is not a node id; expected one of ${config.nodes.map(n => n.id).join(', ')}`)
}

const mobile = await browser.newPage({
  viewport: { width: 375, height: 812 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true
})
mobile.on('pageerror', e => errors.push(String(e)))
mobile.on('console', m => m.type() === 'error' && errors.push(m.text()))

await mobile.goto(`${URL}#/${mobileNode.id}`, { waitUntil: 'networkidle' })
await mobile.waitForFunction(
  () => document.documentElement.dataset.mode === 'mobile' && !document.getElementById('mobile-root').hidden,
  null,
  { timeout: 20000 }
)
await mobile.waitForSelector('.snap-card')
await mobile.evaluate(t => window.scrollWorld.freezeTime(t), CLOCK)
await mobile.waitForTimeout(3000)

const landed = await mobile.evaluate(() => document.getElementById('iso-badge').textContent)
console.log(`  mobile deep link landed on: ${landed}`)

await write(await mobile.screenshot(), `mobile-${mobileNode.id}.png`)

await browser.close()

console.log(`${tally.new} created, ${tally.updated} updated, ${tally.unchanged} unchanged`)

if (errors.length) {
  console.error('page errors:', errors.slice(0, 5))
  process.exit(1)
}
