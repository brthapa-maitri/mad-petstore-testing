import { test as teardown } from '@playwright/test';
import { startApi, waitForApiUp } from './support/api-container';

teardown('start the API again', async ({ request }) => {
  startApi();
  await waitForApiUp(request);
});
