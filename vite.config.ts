import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/golf-192.png', 'icons/golf-512.png'],
      manifest: {
        name: 'Golf Method Scorecard',
        short_name: 'Golf Scorecard',
        description: 'Mobile golf scorecard with method scoring, scoring-zone metrics, offline saving and course import.',
        theme_color: '#173f33',
        background_color: '#f4f7f5',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icons/golf-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/golf-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/golf-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,png,svg,json,woff2}'],
        cleanupOutdatedCaches: true
      }
    })
  ]
})
