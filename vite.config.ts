import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/roundwise-192.png', 'icons/roundwise-512.png', 'brand/roundwise-mark.png'],
      manifest: {
        name: 'RoundWise Golf Performance Tracker',
        short_name: 'RoundWise',
        description: 'RoundWise mobile golf scorecard, performance analytics, scoring-zone tracking and round insights.',
        theme_color: '#0D1E3A',
        background_color: '#F7F6F2',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icons/roundwise-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/roundwise-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/roundwise-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
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
