import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

// MakerBot — React/Vite frontend. Devda backend PHP API'ni proxy qilamiz,
// shunda brauzerda /api/... so'rovlar to'g'ridan-to'g'ri ishlaydi va
// PHP session-cookie bir xil origin ichida saqlanadi (CORS kerak bo'lmaydi).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost',
        changeOrigin: true,
      },
    },
  },
})
