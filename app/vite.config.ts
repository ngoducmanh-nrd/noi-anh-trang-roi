import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => ({
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
  }), ...(mode === 'analyze' ? [visualizer({
    filename: 'dist/bundle-stats.html',
    template: 'treemap',
    gzipSize: true,
    brotliSize: true,
    open: false,
  })] : [])],
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler|use-sync-external-store)[\\/]/.test(id)) return 'vendor-react';
          if (/[\\/]node_modules[\\/](@firebase|firebase)[\\/]/.test(id)) return 'vendor-firebase';
          if (/[\\/]node_modules[\\/](@animate-ui|motion|motion-dom|motion-utils)[\\/]/.test(id)) return 'vendor-ui';
          if (/[\\/]node_modules[\\/]react-router/.test(id)) return 'vendor-router';
          return 'vendor-other';
        },
      },
    },
  },
  server: { port: 5173, strictPort: true }
}));
