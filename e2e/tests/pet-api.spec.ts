import { expect, test } from '@playwright/test';
import { expectDetailError, getPet } from './support/api';
import { makePetName } from './support/data';
import { API_URL, TWO_POW_53 } from './support/env';
import { AddPetPage } from './support/pages';

test.describe('Pet API', () => {
  test('returns 404 {detail} for an unknown pet id', async ({ request }) => {
    await expectDetailError((await getPet(request, '1')).res, 404);
  });

  test('returns 404 {detail}, not 500, for an id above the int64 maximum', async ({ request }) => {
    await expectDetailError((await getPet(request, '9999999999999999999')).res, 404);
  });

  test('returns 422 {detail} for a non-numeric pet id', async ({ request }) => {
    await expectDetailError((await getPet(request, 'abc')).res, 422);
  });

  test('returns 422 {detail} for an unknown status filter', async ({ request }) => {
    const res = await request.get(`${API_URL}/pet/findByStatus`, { params: { status: 'bogus' } });
    await expectDetailError(res, 422);
  });

  test('shows an id above 2^53 unchanged, as the same string the API returns', async ({ page, request }) => {
    const add = new AddPetPage(page);
    await add.goto();
    const shown = await add.addPet({ name: makePetName() });

    expect(BigInt(shown) > TWO_POW_53).toBe(true);
    const { res, text } = await getPet(request, shown);
    expect(res.status()).toBe(200);
    // Compare against the raw JSON text so no number parsing can hide a rounding difference.
    expect(text).toContain(`"id":"${shown}"`);
  });
});
