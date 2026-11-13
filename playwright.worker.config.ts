import { defineConfig, devices } from '@playwright/test';

const externalUrl = process.env.WORKER_TEST_URL;

export default defineConfig({
  testDir: './tests/worker',
  outputDir: '.data/playwright-worker',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: externalUrl ?? 'http://127.0.0.1:8788',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  webServer: externalUrl
    ? undefined
    : {
        command: process.env.WORKER_GRPC_URL
          ? 'bunx opennextjs-cloudflare preview --port 8788 --persist-to .data/worker-preview --var "IPMA_GRPC_URL:$WORKER_GRPC_URL"'
          : 'bunx opennextjs-cloudflare preview --port 8788 --persist-to .data/worker-preview',
        url: 'http://127.0.0.1:8788',
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
