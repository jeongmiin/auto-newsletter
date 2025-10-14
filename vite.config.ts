import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === 'production'
    ? '/auto-newsletter/'
    : '/',
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  // public 폴더 처리 명시
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // 소스맵 생성으로 디버깅 용이
    sourcemap: true,
    // 청크 크기 경고 제한 증가
    chunkSizeWarningLimit: 1000,
  },
})
