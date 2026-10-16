import { z } from "zod";

/** int64 as a decimal string. Never z.number(), never Number(id). */
export const PetId = z.string().regex(/^[0-9]{1,19}$/);
export const PetStatus = z.enum(["available", "pending", "sold"]);
export const Category = z.object({ name: z.string().min(1).max(50) }).strict();
export const NewPet = z
  .object({
    name: z.string().min(1).max(100),
    status: PetStatus,
    category: Category.optional(),
  })
  .strict();
export const Pet = z
  .object({
    id: PetId,
    name: z.string(),
    status: PetStatus,
    category: Category.optional(),
  })
  .strict();

export type PetId = z.infer<typeof PetId>;
export type PetStatus = z.infer<typeof PetStatus>;
export type Category = z.infer<typeof Category>;
export type NewPet = z.infer<typeof NewPet>;
export type Pet = z.infer<typeof Pet>;

export const ADD_FAILED = "Could not add the pet. Try again.";
export const NAME_ERROR = "Name is required (1–100 characters).";
export const CATEGORY_ERROR = "Category must be at most 50 characters.";

export type NewPetParse =
  { ok: true; data: NewPet } | { ok: false; error: string };

/**
 * Validate raw add-pet form values with the shared `NewPet` schema.
 * Name and category are trimmed; an empty category is omitted (never null).
 */
export function parseNewPetForm(raw: {
  name: string;
  status: string;
  category: string;
}): NewPetParse {
  const category = raw.category.trim();
  const result = NewPet.safeParse({
    name: raw.name.trim(),
    status: raw.status,
    ...(category === "" ? {} : { category: { name: category } }),
  });
  if (result.success) return { ok: true, data: result.data };
  const paths = result.error.issues.map((i) => i.path[0]);
  if (paths.includes("name")) return { ok: false, error: NAME_ERROR };
  if (paths.includes("category")) return { ok: false, error: CATEGORY_ERROR };
  return { ok: false, error: "Status must be available, pending or sold." };
}
