import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'prompt',
    includeAssets: ['icons/moon-icon.svg', 'icons/maskable.svg'],
    manifest: {
      id: '/', name: 'Nơi Ánh Trăng Rơi', short_name: 'Ánh Trăng',
      description: 'Một khoảng trời riêng cho những điều thương.',
      lang: 'vi', start_url: '/', scope: '/', display: 'standalone',
      theme_color: '#111320', background_color: '#111320',
      icons: [
        { src: '/icons/moon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icons/moon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ]
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,woff2,ttf}'],
      globIgnores: ['app-config.js'],
      navigateFallbackDenylist: [/^\/api\//],
      cleanupOutdatedCaches: true,
      runtimeCaching: [{
        urlPattern: /\/app-config\.js$/,
        handler: 'NetworkFirst',
        options: { cacheName: 'moon-public-config', networkTimeoutSeconds: 3,
          expiration: { maxEntries: 1, maxAgeSeconds: 604800 } }
      }],
      maximumFileSizeToCacheInBytes: 2_000_000
    }
  })],
  build: { sourcemap: false },
  server: { port: 5173, strictPort: true }
});
