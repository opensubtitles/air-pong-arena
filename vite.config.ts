import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Whether to polyfill `node:` protocol imports.
      protocolImports: true,
    }),
  ],
  define: {
    // Simple-peer requires global to be defined
    global: 'globalThis',
  },
  // Ensure we can access from network for mobile testing
  // Ensure we can access from network for mobile testing
  server: {
    host: true,
    port: 5173
  },
  base: '/air-pong-arena/', // Essential for GitHub Pages relative paths
})
