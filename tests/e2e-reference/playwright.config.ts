import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  retries: 0,
  use: { baseURL: process.env.WEB_URL ?? 'http://localhost:3000', browserName: 'chromium' },
  reporter: [['list']],
});
