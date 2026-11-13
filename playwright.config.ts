import { defineConfig, devices } from '@playwright/test';

const production = process.env.E2E_PRODUCTION === '1';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:3001', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      command: 'node --import tsx tests/fixtures/grpc-server.ts',
      port: 50061,
      reuseExistingServer: false,
    },
    {
      command: production
        ? 'bun run build && bun run start --port 3001'
        : 'bun run dev --port 3001',
      url: 'http://127.0.0.1:3001',
      env: {
        IPMA_GRPC_URL: 'http://127.0.0.1:50061',
        NEXT_DIST_DIR: 'build/e2e',
        EXPOSE_TESTING_API: production ? '1' : '0',
      },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
