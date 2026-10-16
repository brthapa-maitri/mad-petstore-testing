import { defineConfig } from '@playwright/test';

// The API-stopped scenarios stop and start the local API container, so they only run against
// the local stack (WEB_URL unset or pointing at localhost).
const webUrl = process.env.WEB_URL ?? 'http://localhost:3000';
const local = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(webUrl);

export default defineConfig({
  testDir: 'tests',
  use: { baseURL: webUrl, browserName: 'chromium', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  reporter: [['html', { open: 'never' }], ['list']],
  projects: [
    // Needs a status with no pets, so it runs before anything adds pets.
    { name: 'empty-state', testMatch: 'empty-state.spec.ts' },
    {
      name: 'chromium',
      testIgnore: ['empty-state.spec.ts', 'api-down.spec.ts', '*.setup.ts', '*.teardown.ts'],
      dependencies: ['empty-state'],
    },
    ...(local
      ? [
          { name: 'stop-api', testMatch: 'stop-api.setup.ts', dependencies: ['chromium'], teardown: 'start-api' },
          { name: 'start-api', testMatch: 'start-api.teardown.ts' },
          { name: 'api-down', testMatch: 'api-down.spec.ts', dependencies: ['stop-api'] },
        ]
      : []),
  ],
});
