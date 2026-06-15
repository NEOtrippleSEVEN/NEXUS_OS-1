import { defineConfig } from 'vitest/config'

// pacing.js is pure JS (no JSX, no DOM), so run unit tests in a plain Node
// environment — no need to load the React / Tailwind Vite plugins here.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,jsx}'],
  },
})
