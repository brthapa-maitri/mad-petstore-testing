import { expect, type Locator, type Page } from '@playwright/test';
import type { PetStatus } from './env';

/** The pet list at `/`. */
export class PetListPage {
  readonly root: Locator;
  readonly filter: Locator;
  readonly addLink: Locator;
  readonly list: Locator;
  readonly rows: Locator;
  readonly rowNames: Locator;
  readonly rowStatuses: Locator;
  readonly empty: Locator;

  constructor(readonly page: Page) {
    this.root = page.getByTestId('pet-list-page');
    this.filter = page.getByTestId('status-filter');
    this.addLink = page.getByTestId('add-pet-link');
    this.list = page.getByTestId('pet-list');
    this.rows = page.getByTestId('pet-row');
    this.rowNames = page.getByTestId('pet-row-name');
    this.rowStatuses = page.getByTestId('pet-row-status');
    this.empty = page.getByTestId('pet-list-empty');
  }

  async goto(query = ''): Promise<void> {
    await this.page.goto(`/${query}`);
    await expect(this.root).toBeVisible();
  }

  /** Choose a status in the filter and wait for the URL to follow it. */
  async chooseStatus(status: PetStatus): Promise<void> {
    await this.filter.selectOption(status);
    await expect(this.page).toHaveURL(new RegExp(`/\\?status=${status}$`));
    await expect(this.filter).toHaveValue(status);
  }

  rowNamed(name: string): Locator {
    return this.rowNames.filter({ hasText: name });
  }

  /** The list has rows and every row shows `status`. */
  async expectOnlyStatus(status: PetStatus): Promise<void> {
    await expect(this.rowStatuses.filter({ hasNotText: status })).toHaveCount(0);
    await expect(this.empty).toHaveCount(0);
  }
}

/** The add-pet screen at `/add`. */
export class AddPetPage {
  readonly root: Locator;
  readonly form: Locator;
  readonly name: Locator;
  readonly status: Locator;
  readonly category: Locator;
  readonly submit: Locator;
  readonly error: Locator;
  readonly created: Locator;
  readonly createdId: Locator;
  readonly createdName: Locator;
  readonly createdStatus: Locator;
  readonly backLink: Locator;

  constructor(readonly page: Page) {
    this.root = page.getByTestId('add-pet-page');
    this.form = page.getByTestId('add-pet-form');
    this.name = page.getByTestId('pet-name-input');
    this.status = page.getByTestId('pet-status-select');
    this.category = page.getByTestId('pet-category-input');
    this.submit = page.getByTestId('add-pet-submit');
    this.error = page.getByTestId('form-error');
    this.created = page.getByTestId('created-pet');
    this.createdId = page.getByTestId('created-pet-id');
    this.createdName = page.getByTestId('created-pet-name');
    this.createdStatus = page.getByTestId('created-pet-status');
    this.backLink = page.getByTestId('back-to-list-link');
  }

  async goto(): Promise<void> {
    await this.page.goto('/add');
    await expect(this.form).toBeVisible();
  }

  async fill(pet: { name: string; status?: PetStatus; category?: string }): Promise<void> {
    await this.name.fill(pet.name);
    await this.status.selectOption(pet.status ?? 'available');
    await this.category.fill(pet.category ?? '');
  }

  /**
   * Submit and wait for the server action's answer. The form remounts (React `key`) after every
   * result, success or error, so the old name input leaving the DOM marks the end of the round trip.
   */
  async submitAndWait(): Promise<void> {
    const input = await this.name.elementHandle();
    if (!input) throw new Error('pet-name-input is not on the page');
    await this.submit.click();
    await expect.poll(() => input.evaluate((el) => el.isConnected), { timeout: 15_000 }).toBe(false);
    await input.dispose();
  }

  /** Add a pet through the form and return the id string the page shows. */
  async addPet(pet: { name: string; status?: PetStatus; category?: string }): Promise<string> {
    await this.fill(pet);
    await this.submitAndWait();
    await expect(this.error).toBeHidden();
    await expect(this.createdName).toHaveText(pet.name.trim());
    await expect(this.createdStatus).toHaveText(pet.status ?? 'available');
    const id = (await this.createdId.textContent()) ?? '';
    expect(id).toMatch(/^[0-9]{1,19}$/);
    return id;
  }

  async expectRejected(message: string): Promise<void> {
    await expect(this.error).toBeVisible();
    await expect(this.error).toHaveText(message);
    await expect(this.created).toBeHidden();
  }
}

export const NAME_ERROR = 'Name is required (1–100 characters).';
export const CATEGORY_ERROR = 'Category must be at most 50 characters.';
export const ADD_FAILED = 'Could not add the pet. Try again.';
