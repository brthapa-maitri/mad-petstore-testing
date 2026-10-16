import { expect, test } from '@playwright/test';
import { makePetName } from './support/data';
import { STATUSES } from './support/env';
import { AddPetPage, PetListPage } from './support/pages';

test.describe('Pet list by status', () => {
  test('defaults to available and shows only available pets', async ({ page }) => {
    const name = makePetName();
    const add = new AddPetPage(page);
    await add.goto();
    await add.addPet({ name, status: 'available' });

    const list = new PetListPage(page);
    await list.goto();
    await expect(list.filter).toHaveValue('available');
    await expect(list.rowNamed(name)).toHaveCount(1);
    await list.expectOnlyStatus('available');
  });

  for (const status of STATUSES) {
    test(`filters by ${status} and keeps it in the URL after a refresh`, async ({ page }) => {
      const name = makePetName();
      const add = new AddPetPage(page);
      await add.goto();
      await add.addPet({ name, status });

      const list = new PetListPage(page);
      // Start from another status so choosing `status` is a real change.
      await list.goto(status === 'available' ? '?status=sold' : '');
      await list.chooseStatus(status);
      await expect(list.rowNamed(name)).toHaveCount(1);
      await list.expectOnlyStatus(status);

      await page.reload();
      await expect(page).toHaveURL(new RegExp(`/\\?status=${status}$`));
      await expect(list.filter).toHaveValue(status);
      await expect(list.rowNamed(name)).toHaveCount(1);
      await list.expectOnlyStatus(status);
    });
  }

  test('shows a newly added pet at the top of its status list', async ({ page }) => {
    const name = makePetName();
    const add = new AddPetPage(page);
    await add.goto();
    await add.addPet({ name, status: 'pending' });
    await add.backLink.click();

    const list = new PetListPage(page);
    await expect(list.root).toBeVisible();
    await list.chooseStatus('pending');
    await expect(list.rowNames.first()).toHaveText(name);
  });

  test('lists pets newest first', async ({ page }) => {
    const older = makePetName();
    const newer = makePetName();
    const add = new AddPetPage(page);
    await add.goto();
    await add.addPet({ name: older, status: 'sold' });
    await add.addPet({ name: newer, status: 'sold' });

    const list = new PetListPage(page);
    await list.goto('?status=sold');
    await expect(list.rowNames.nth(0)).toHaveText(newer);
    await expect(list.rowNames.nth(1)).toHaveText(older);
  });

  test('treats an unknown status in the URL like the default list', async ({ page }) => {
    const list = new PetListPage(page);
    await list.goto('?status=foo');
    await expect(list.filter).toHaveValue('available');
    await list.expectOnlyStatus('available');
  });

  test('restores the previous filter with the browser back button', async ({ page }) => {
    const list = new PetListPage(page);
    await list.goto();
    await list.chooseStatus('pending');
    await list.chooseStatus('sold');

    await page.goBack();
    await expect(page).toHaveURL(/\/\?status=pending$/);
    await expect(list.filter).toHaveValue('pending');
    await list.expectOnlyStatus('pending');
  });

  test('add-pet-link opens the add-pet screen', async ({ page }) => {
    const list = new PetListPage(page);
    await list.goto();
    await list.addLink.click();
    await expect(page).toHaveURL(/\/add$/);
    await expect(new AddPetPage(page).form).toBeVisible();
  });
});
