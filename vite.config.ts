import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['events', 'buffer', 'process'],
      globals: {
        process: true,
        Buffer: true,
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'https://api.openf1.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/v1'),
        secure: false
      },
      '/db': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
}) 