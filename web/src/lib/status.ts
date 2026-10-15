import { PetStatus } from "@/lib/schemas/pet";

export const DEFAULT_STATUS: PetStatus = "available";

/** Map a raw `?status=` value to a valid status; anything else is `available`. */
export function parseStatus(raw: string | string[] | undefined): PetStatus {
  const parsed = PetStatus.safeParse(raw);
  return parsed.success ? parsed.data : DEFAULT_STATUS;
}
