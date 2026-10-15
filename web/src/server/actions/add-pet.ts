"use server";

import { apiFetch } from "@/server/api";
import { ADD_FAILED, parseNewPetForm, Pet } from "@/lib/schemas/pet";

export type AddPetState =
  | { ok: null; n: number }
  | { ok: true; n: number; pet: Pet }
  | {
      ok: false;
      n: number;
      error: string;
      fields: { name: string; status: string; category: string };
    };

function text(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
}

/** Server Action for the add-pet form. Never throws; never calls the API on invalid input. */
export async function addPet(
  prev: AddPetState,
  form: FormData,
): Promise<AddPetState> {
  const n = prev.n + 1;
  const fields = {
    name: text(form, "name"),
    status: text(form, "status"),
    category: text(form, "category"),
  };
  const parsed = parseNewPetForm(fields);
  if (!parsed.ok) return { ok: false, n, error: parsed.error, fields };

  try {
    const res = await apiFetch("/pet", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    if (res.ok) {
      const pet = Pet.safeParse(await res.json());
      if (pet.success) return { ok: true, n, pet: pet.data };
    } else if (res.status === 422) {
      const body = (await res.json()) as { detail?: unknown };
      if (typeof body.detail === "string") {
        return { ok: false, n, error: body.detail, fields };
      }
    }
  } catch {
    // network error or unparseable body: fall through to the generic message
  }
  return { ok: false, n, error: ADD_FAILED, fields };
}
