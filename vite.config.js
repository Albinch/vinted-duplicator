import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'index.html'),
        content: resolve(__dirname, 'src/content/content.js'),
        background: resolve(__dirname, 'src/background/background.js'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'popup' 
            ? 'assets/[name].js'
            : '[name].js'
        },
      },
    },
    outDir: 'dist',
  },
})