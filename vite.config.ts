/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const base = '/golemanciens/';

export default defineConfig({
  base,
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Les Golémanciens de Cubeterre',
        short_name: 'Golémanciens',
        description: 'Une aventure en blocs avec des golems, des calculs et des énigmes.',
        lang: 'fr',
        // Identité explicite de l'application installée : Android la traite comme une nouvelle installation.
        id: 'golemanciens',
        start_url: base,
        scope: base,
        // Essai : mêmes réglages que Dictée-Blocs, dont l'icône s'ouvre sur les mêmes appareils Android.
        display: 'standalone',
        orientation: 'any',
        background_color: '#1d2b53',
        theme_color: '#1d2b53',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,webmanifest}'],
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/content/**/*.test.ts', 'tests/sim/**/*.test.ts'],
    environment: 'node',
  },
});
