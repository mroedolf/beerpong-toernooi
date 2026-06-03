import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/beerpong-toernooi/',
  plugins: [vue(), tailwindcss()],
  test: {
    environment: 'jsdom',
  },
})
