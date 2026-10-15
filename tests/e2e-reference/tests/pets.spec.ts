import { test, expect, type Page } from '@playwright/test';

const unique = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

async function addPet(page: Page, name: string, status: string) {
  await page.goto('/');
  await page.getByTestId('add-pet-link').click();
  await page.getByTestId('pet-name-input').fill(name);
  await page.getByTestId('pet-status-select').selectOption(status);
  await page.getByTestId('add-pet-submit').click();
  await expect(page.getByTestId('created-pet-name')).toHaveText(name);
  await expect(page.getByTestId('created-pet-status')).toHaveText(status);
  await expect(page.getByTestId('created-pet-id')).toHaveText(/^[0-9]{1,19}$/);
}

async function expectOnlyStatus(page: Page, status: string, mustInclude: string) {
  await expect(page.getByTestId('pet-row-name').filter({ hasText: mustInclude })).toHaveCount(1);
  await expect(page.getByTestId('pet-row-status').filter({ hasNotText: status })).toHaveCount(0);
}

test('adding a pet shows the pet the API created', async ({ page }) => {
  await addPet(page, unique('Added'), 'available');
});

test('list defaults to available pets only', async ({ page }) => {
  const available = unique('Avail');
  await addPet(page, available, 'available');
  await addPet(page, unique('Pend'), 'pending');
  await page.goto('/');
  await expect(page.getByTestId('status-filter')).toHaveValue('available');
  await expectOnlyStatus(page, 'available', available);
});

test('filtering by sold shows only sold pets', async ({ page }) => {
  const sold = unique('Sold');
  await addPet(page, sold, 'sold');
  await page.goto('/');
  await page.getByTestId('status-filter').selectOption('sold');
  await expectOnlyStatus(page, 'sold', sold);
});

test('adding a pet without a name shows an error', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('add-pet-link').click();
  await page.getByTestId('add-pet-submit').click();
  await expect(page.getByTestId('form-error')).toBeVisible();
  await expect(page.getByTestId('created-pet')).toBeHidden();
});
