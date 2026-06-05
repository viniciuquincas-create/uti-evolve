import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// deploy 2026-06-05T14:57:45
export default defineConfig({
  plugins: [react()],
  build: {
    minify: false,
    chunkSizeWarningLimit: 2000,
  },
})
