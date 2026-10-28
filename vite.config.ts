import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages(https://chamchipack.github.io/voca/)에서 하위 경로로 서비스된다
  base: '/voca/',
  plugins: [react()],
})
