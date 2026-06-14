import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Vite config. The Tailwind v4 plugin scans our JSX for utility classes;
// no separate tailwind.config.js / postcss.config.js is needed.
// (Chunk 5 will add a `/api/claude` dev-server middleware proxy here.)
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
