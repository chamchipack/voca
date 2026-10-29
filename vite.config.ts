import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages는 사용자 도메인(jpt.chamchipack.com)의 루트로 서비스된다
  base: '/',
  plugins: [
    react(),
    // 홈 화면 앱 + 오프라인. 새 버전은 다음에 열 때 자동 반영(데이터는 IndexedDB라 새로고침해도 유지)
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'ことばノート',
        short_name: 'ことば',
        description: 'JPT 일본어 단어장',
        lang: 'ko',
        start_url: '/',
        display: 'standalone',
        background_color: '#eef0f6',
        theme_color: '#eef0f6',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // 외부 글꼴(Pretendard, Google Fonts)은 처음 받을 때 캐시해서 오프라인에서도 쓴다
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'].includes(url.hostname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
