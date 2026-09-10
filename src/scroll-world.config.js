export const palette = {
  bg: 0x06070c,
  fog: 0x06070c,
  ground: 0x11161f,
  ink: 0xeef1f7,
  accent: 0x39e0d0,
  amber: 0xffb35c,
  violet: 0x7b6bff
}

export const config = {
  breakpoint: 768,

  scroll: {
    lerp: 0.1,
    duration: 1.15,
    wheelMultiplier: 1,
    damping: 0.26,
    epsilon: 0.00002,
    vhPerSpan: 130
  },

  camera: { near: 0.1, far: 520 },

  nodes: [
    {
      id: 'entry',
      zone: [0, 0, 0],
      span: 1.15,
      hold: 0.42,
      ease: 'inOutCubic',
      align: 'left',
      eyebrow: '01 / Exterior',
      title: 'We build the systems\nyour company runs on.',
      body: 'One continuous shot. No cuts, no page loads. Scroll to move through the work.',
      cta: null,
      pose: { position: [0, 9, 46], target: [0, 8, 2], fov: 55 },
      via: [{ position: [16, 15, 12], target: [2, 6, -34] }],
      iso: { position: [32, 26, 32], target: [0, 12, 0], zoom: 48 }
    },
    {
      id: 'diorama',
      zone: [0, 0, -70],
      span: 1.0,
      hold: 0.46,
      ease: 'inOutCubic',
      align: 'right',
      eyebrow: '02 / Platform',
      title: 'A single operating surface.',
      body: 'Ingest, model, automate, report. Four services on one runtime instead of four vendors on four contracts.',
      cta: null,
      pose: { position: [2, 24, -28], target: [0, 5, -70], fov: 42 },
      via: [{ position: [-26, 14, -100], target: [0, 8, -138] }],
      iso: { position: [34, 28, 34], target: [0, 5, -70], zoom: 58 }
    },
    {
      id: 'architecture',
      zone: [0, 0, -150],
      span: 1.35,
      hold: 0.5,
      ease: 'inOutCubic',
      align: 'left',
      interactive: true,
      eyebrow: '03 / Architecture',
      title: 'Every node is inspectable.',
      body: 'Hover any module to trace its dependencies. Same graph the platform exposes at runtime.',
      cta: null,
      pose: { position: [0, 10, -126], target: [0, 10, -155], fov: 64 },
      via: [{ position: [0, 5, -184], target: [0, 8, -218] }],
      iso: { position: [36, 32, 36], target: [0, 12, -155], zoom: 62 }
    },
    {
      id: 'cta',
      zone: [0, 0, -230],
      span: 0.9,
      hold: 1,
      ease: 'outCubic',
      align: 'center',
      eyebrow: '04 / Next',
      title: 'Start the build.',
      body: 'Two-week architecture sprint. Fixed scope, fixed price, working system at the end.',
      cta: { label: 'Book the sprint', href: '#contact' },
      pose: { position: [0, 12, -206], target: [0, 13, -232], fov: 50 },
      via: [],
      iso: { position: [30, 26, 30], target: [0, 14, -237], zoom: 50 }
    }
  ]
}

export const nodeById = Object.fromEntries(config.nodes.map((n, i) => [n.id, { ...n, index: i }]))
