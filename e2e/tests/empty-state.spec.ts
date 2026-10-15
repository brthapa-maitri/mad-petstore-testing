import { expect, test } from '@playwright/test';
import { findByStatus } from './support/api';
import { STATUSES } from './support/env';
import { PetListPage } from './support/pages';

// Runs before every other project (see playwright.config.ts): the contract has no DELETE, so a
// status with no pets only exists on a fresh database.
test('shows the empty message and no rows for a status with no pets', async ({ page, request }) => {
  let emptyStatus: (typeof STATUSES)[number] | undefined;
  for (const status of STATUSES) {
    if ((await findByStatus(request, status)).length === 0) {
      emptyStatus = status;
      break;
    }
  }
  test.skip(
    emptyStatus === undefined,
    'Every status already has pets. Start from a fresh database to run this test: ' +
      'docker compose --profile app down && docker compose --profile app up -d --build',
  );

  const list = new PetListPage(page);
  await list.goto(`?status=${emptyStatus}`);
  await expect(list.filter).toHaveValue(emptyStatus!);
  await expect(list.empty).toHaveText('No pets with this status.');
  await expect(list.rows).toHaveCount(0);
});
