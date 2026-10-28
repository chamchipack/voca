import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages는 사용자 도메인(jpt.chamchipack.com)의 루트로 서비스된다
  base: '/',
  plugins: [react()],
})
