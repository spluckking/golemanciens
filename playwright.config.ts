import { defineConfig } from '@playwright/test';

const PORT = 4173;
const isCI = !!process.env.CI;

/** Tablette Xiaomi Pad 7 Pro émulée en paysage, avec le tactile. */
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/golemanciens/`,
    viewport: { width: 1280, height: 853 },
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
    locale: 'fr-FR',
    launchOptions: {
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
    },
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'tablette-chromium', use: { browserName: 'chromium' } }],
  webServer: {
    // En CI, le build est déjà fait par l'étape précédente.
    command: isCI
      ? `npx vite preview --port ${PORT} --strictPort`
      : `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/golemanciens/`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
