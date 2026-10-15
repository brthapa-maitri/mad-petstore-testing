import "server-only";
import { z } from "zod";
import { apiFetch } from "@/server/api";
import { Pet, type PetStatus } from "@/lib/schemas/pet";

/** Pets with one status, newest first as the API returns them. Throws on any failure. */
export async function listPetsByStatus(status: PetStatus): Promise<Pet[]> {
  const res = await apiFetch(
    `/pet/findByStatus?status=${encodeURIComponent(status)}`,
  );
  if (!res.ok) throw new Error(`findByStatus failed: ${String(res.status)}`);
  return z.array(Pet).parse(await res.json());
}
