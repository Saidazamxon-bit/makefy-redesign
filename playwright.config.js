import { defineConfig, devices } from 'playwright/test';

// E2E: `npx playwright install chromium && npm run e2e`
// API so'rovlari testda e2e/mockApi.js orqali sinaladi (backend/DB shart emas) — shuning uchun testlar deterministik.
export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 0,
  use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: { command: 'npm run build && npm run preview -- --port 4173 --strictPort', url: 'http://localhost:4173', reuseExistingServer: true, timeout: 120000 },
  projects: [
    { name: 'mobile-360', use: { ...devices['Pixel 5'], viewport: { width: 360, height: 740 } } },
    { name: 'desktop-1440', use: { viewport: { width: 1440, height: 900 } } },
  ],
});
