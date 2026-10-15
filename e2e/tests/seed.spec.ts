import { test } from '@playwright/test';

// Seed for the Playwright test agents: the app's starting state is the pet list.
test('seed', async ({ page }) => {
  await page.goto('/');
});
