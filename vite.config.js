import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Only build the popup HTML, not the content scripts
      // Content scripts are built separately with esbuild (see scripts/build.js)
      input: {
        popup: resolve(__dirname, 'index.html'),
      },
    },
    outDir: 'dist',
    cssCodeSplit: false,
  },
})
