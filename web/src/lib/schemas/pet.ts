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
