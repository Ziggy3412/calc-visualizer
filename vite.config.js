import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative asset paths so the built index.html works when Electron loads
  // it via file:// (absolute paths like "/assets/..." don't resolve there —
  // the web dev server at "/" is fine, but the packaged app needs "./assets/...").
  base: './',
})
