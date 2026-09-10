import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.VITE_BASE || '/',
  server: { port: Number(process.env.PORT) || 5183, open: true },
  build: { target: 'es2020', sourcemap: true }
})
