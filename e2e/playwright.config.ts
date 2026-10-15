import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  use: { baseURL: process.env.WEB_URL ?? 'http://localhost:3000', browserName: 'chromium' },
  reporter: [['html', { open: 'never' }], ['list']],
});
