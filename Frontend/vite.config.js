import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      global: true,
      process: true,
      buffer: true,
    }),
  ],
  define: {
    global: 'window', // Keep this as backup or remove if polyfill handles it
  },
  server: {
    port: 3001,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      }
    }
  }
})
