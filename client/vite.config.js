import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // the API runs on :3000, so /api calls are forwarded there instead of the Vite server
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})