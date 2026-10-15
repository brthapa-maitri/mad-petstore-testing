import { expect, test } from '@playwright/test';
import { getPet } from './support/api';
import { makeCategory, makeExactLength, makePetName } from './support/data';
import { AddPetPage, CATEGORY_ERROR, NAME_ERROR, PetListPage } from './support/pages';

test.describe('Add a pet', () => {
  test('shows the id, name and status the API created, with the category stored', async ({ page, request }) => {
    const list = new PetListPage(page);
    await list.goto();
    await list.addLink.click();
    const add = new AddPetPage(page);
    await expect(add.form).toBeVisible();

    const name = makePetName();
    const id = await add.addPet({ name, status: 'pending', category: 'Dogs' });

    expect(id).toMatch(/^[0-9]{16,19}$/);
    const { res, pet } = await getPet(request, id);
    expect(res.status()).toBe(200);
    expect(pet).toEqual({ id, name, status: 'pending', category: { name: 'Dogs' } });
  });

  test('clears name and category and resets status to available after a successful add', async ({ page }) => {
    const add = new AddPetPage(page);
    await add.goto();
    await add.addPet({ name: makePetName(), status: 'sold', category: makeCategory() });

    await expect(add.name).toHaveValue('');
    await expect(add.category).toHaveValue('');
    await expect(add.status).toHaveValue('available');
  });

  test('rejects an empty name in form-error without creating a pet', async ({ page }) => {
    const add = new AddPetPage(page);
    await add.goto();
    await add.fill({ name: '' });
    await add.submitAndWait();
    await add.expectRejected(NAME_ERROR);
  });

  test('rejects a spaces-only name in form-error without creating a pet', async ({ page }) => {
    const add = new AddPetPage(page);
    await add.goto();
    await add.fill({ name: '     ' });
    await add.submitAndWait();
    await add.expectRejected(NAME_ERROR);
  });

  test('rejects a 101-character name and keeps what was typed', async ({ page }) => {
    const add = new AddPetPage(page);
    await add.goto();
    const name = makeExactLength(101);
    await add.fill({ name, status: 'pending', category: 'Cats' });
    await add.submitAndWait();
    await add.expectRejected(NAME_ERROR);

    await expect(add.name).toHaveValue(name);
    await expect(add.status).toHaveValue('pending');
    await expect(add.category).toHaveValue('Cats');
  });

  test('accepts a name of exactly 100 characters', async ({ page }) => {
    const add = new AddPetPage(page);
    await add.goto();
    const name = makeExactLength(100);
    await add.addPet({ name });
    await expect(add.createdName).toHaveText(name);
  });

  test('rejects a 51-character category in form-error', async ({ page }) => {
    const add = new AddPetPage(page);
    await add.goto();
    await add.fill({ name: makePetName(), category: makeExactLength(51) });
    await add.submitAndWait();
    await add.expectRejected(CATEGORY_ERROR);
  });

  test('accepts a category of exactly 50 characters', async ({ page, request }) => {
    const add = new AddPetPage(page);
    await add.goto();
    const category = makeExactLength(50);
    const id = await add.addPet({ name: makePetName(), category });
    const { pet } = await getPet(request, id);
    expect(pet?.category).toEqual({ name: category });
  });

  test('trims spaces around the name before saving', async ({ page, request }) => {
    const add = new AddPetPage(page);
    await add.goto();
    const name = makePetName();
    const id = await add.addPet({ name: `   ${name}   ` });
    await expect(add.createdName).toHaveText(name);
    expect((await getPet(request, id)).pet?.name).toBe(name);
  });

  test('shows markup and non-ASCII characters in a name as plain text', async ({ page }) => {
    const add = new AddPetPage(page);
    await add.goto();
    const name = `<b>Zoë 🐶</b> ${makePetName()}`;
    await add.addPet({ name });
    await expect(add.createdName).toHaveText(name);
  });

  test('allows two pets with the same name, each with its own id', async ({ page }) => {
    const add = new AddPetPage(page);
    await add.goto();
    const name = makePetName();
    const first = await add.addPet({ name });
    const second = await add.addPet({ name });
    expect(second).not.toBe(first);
  });

  test('clears the error once a corrected pet is submitted', async ({ page }) => {
    const add = new AddPetPage(page);
    await add.goto();
    await add.fill({ name: '' });
    await add.submitAndWait();
    await add.expectRejected(NAME_ERROR);

    await add.addPet({ name: makePetName() });
    await expect(add.error).toBeHidden();
    await expect(add.created).toBeVisible();
  });

  test('back-to-list-link returns to the pet list', async ({ page }) => {
    const add = new AddPetPage(page);
    await add.goto();
    await add.backLink.click();
    await expect(page).toHaveURL(/\/$/);
    await expect(new PetListPage(page).root).toBeVisible();
  });

  test('opens /add directly and after a reload with an empty form and no result', async ({ page }) => {
    const add = new AddPetPage(page);
    await add.goto();
    await page.reload();
    await expect(add.form).toBeVisible();
    await expect(add.name).toHaveValue('');
    await expect(add.status).toHaveValue('available');
    await expect(add.created).toHaveCount(0);
    await expect(add.error).toBeHidden();
  });
});
