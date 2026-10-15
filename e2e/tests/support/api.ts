import { expect, type APIRequestContext } from '@playwright/test';
import { API_URL, type PetStatus } from './env';

export type ApiPet = { id: string; name: string; status: PetStatus; category?: { name: string } };

/**
 * GET /pet/{id}. Returns the raw body text as well as the parsed pet, so a test can check the
 * id string the API sent before any JSON number handling could touch it.
 */
export async function getPet(request: APIRequestContext, id: string) {
  const res = await request.get(`${API_URL}/pet/${id}`);
  const text = await res.text();
  return { res, text, pet: res.ok() ? (JSON.parse(text) as ApiPet) : undefined };
}

export async function findByStatus(request: APIRequestContext, status: PetStatus): Promise<ApiPet[]> {
  const res = await request.get(`${API_URL}/pet/findByStatus`, { params: { status } });
  expect(res.status(), `findByStatus?status=${status}`).toBe(200);
  return (await res.json()) as ApiPet[];
}

/** Every error body is `{detail}`. */
export async function expectDetailError(res: { status(): number; json(): Promise<unknown> }, status: number) {
  expect(res.status()).toBe(status);
  const body = (await res.json()) as Record<string, unknown>;
  expect(body).toHaveProperty('detail');
}
