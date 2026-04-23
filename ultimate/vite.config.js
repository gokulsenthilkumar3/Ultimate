import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/Ultimate/',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  define: {
    __APP_VERSION__: JSON.stringify('2.0.0'),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  }
})
