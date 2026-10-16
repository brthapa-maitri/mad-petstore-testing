import { expect, test } from '@playwright/test';
import { startApi, waitForApiUp } from './support/api-container';
import { makePetName } from './support/data';
import { ADD_FAILED, AddPetPage, PetListPage } from './support/pages';

// Runs in the `api-down` project, after `stop-api` has stopped the API container.
// Serial: the last test brings the API back.
test.describe.configure({ mode: 'serial' });

test.describe('API stopped', () => {
  test('the pet list shows "Could not load pets." with a retry button, not the empty state', async ({ page }) => {
    const list = new PetListPage(page);
    await page.goto('/');
    await expect(list.root).toContainText('Could not load pets.');
    // error.tsx has no data-testid for its button (contracts/testids.md lists none); scope by the page root.
    await expect(list.root.getByRole('button')).toBeVisible();
    await expect(list.empty).toHaveCount(0);
    await expect(list.list).toHaveCount(0);
  });

  test('submitting /add shows "Could not add the pet. Try again." in form-error', async ({ page }) => {
    const add = new AddPetPage(page);
    await add.goto();
    const name = makePetName();
    await add.fill({ name, status: 'pending' });
    await add.submitAndWait();
    await add.expectRejected(ADD_FAILED);
    await expect(add.name).toHaveValue(name);
  });

  test('the retry button loads the list once the API is back', async ({ page, request }) => {
    test.info().annotations.push({ type: 'issue', description: 'ps-eqr.3' });
    const list = new PetListPage(page);
    await page.goto('/');
    await expect(list.root).toContainText('Could not load pets.');

    startApi();
    await waitForApiUp(request);

    await list.root.getByRole('button').click();
    try {
      await expect(list.list).toBeAttached({ timeout: 10_000 });
      await expect(list.root).not.toContainText('Could not load pets.');
    } finally {
      // Evidence for ps-eqr.3, kept in the HTML report: the page after the retry.
      await test.info().attach('after-retry', { body: await page.screenshot(), contentType: 'image/png' });
    }
  });
});
