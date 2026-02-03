import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['**/*.spec.ts', '**/*.spec.tsx'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 60000, // 60 seconds timeout for tests
  expect: {
    timeout: 10000, // 10 seconds timeout for assertions
  },
  reporter: [
    ['html'],
    ['./tests/playwright-reporter.ts']
  ],
  use: {
    baseURL: 'https://cjd80.rbw.ovh',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10000, // 10 seconds timeout for actions
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chromium'],
      },
    },
  ],

  // webServer disabled - tests run against live deployment at https://cjd80.rbw.ovh
  // webServer: {
  //   command: 'npm run dev:next -- -p 5001',
  //   url: 'http://localhost:5001',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120000,
  // },
});
