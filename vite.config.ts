import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'Hüküm Yolu',
        short_name: 'Hüküm Yolu',
        description:
          'Gizli rollü, politik gerilim dolu sosyal çıkarım masa oyunu. Arkadaşlarınla oda kur, rollerini gizle, hüküm ver.',
        lang: 'tr',
        dir: 'ltr',
        display: 'standalone',
        orientation: 'any',
        start_url: './',
        scope: './',
        theme_color: '#080b12',
        background_color: '#080b12',
        categories: ['games', 'social'],
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
