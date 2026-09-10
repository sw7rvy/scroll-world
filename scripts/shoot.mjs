import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { config } from '../src/scroll-world.config.js'

const here = path.dirname(fileURLToPath(import.meta.url))

const URL = process.env.SHOT_URL ?? 'https://sw7rvy.github.io/scroll-world/'
const OUT = process.env.SHOT_OUT ?? path.join(here, '..', 'docs')
const WIDTH = Number(process.env.SHOT_WIDTH) || 1600
const HEIGHT = Number(process.env.SHOT_HEIGHT) || 900
const GPU = process.env.SHOT_GPU === '1'

const SWIFTSHADER = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']

mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({
  headless: !GPU,
  args: ['--hide-scrollbars', ...(GPU ? ['--use-angle=d3d11'] : SWIFTSHADER)]
})

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

  await page.screenshot({ path: path.join(OUT, file) })
  console.log(`  ${file}`)
}

await browser.close()

if (errors.length) {
  console.error('page errors:', errors.slice(0, 5))
  process.exit(1)
}
