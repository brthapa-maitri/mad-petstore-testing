import "server-only";
import { getEnv } from "@/env";

/**
 * Fetch from the Petstore API. Server-only: the browser never calls the API.
 * Always `no-store`; callers decide what to do with the Response.
 */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const { API_URL } = getEnv();
  return fetch(new URL(path, API_URL), { cache: "no-store", ...init });
}
