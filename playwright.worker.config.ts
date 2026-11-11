import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/worker',
  outputDir: '.data/playwright-worker',
  fullyParallel: false,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:8788', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'bunx opennextjs-cloudflare preview --port 8788',
    url: 'http://127.0.0.1:8788',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
