import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.BUILD_TS': JSON.stringify('2026-05-10T21:16'),
  },
  build: {
    chunkSizeWarningLimit: 1000,
  },
})
