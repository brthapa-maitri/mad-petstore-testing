import { test as setup } from '@playwright/test';
import { stopApi, waitForApiDown } from './support/api-container';

setup('stop the API', async ({ request }) => {
  stopApi();
  await waitForApiDown(request);
});
