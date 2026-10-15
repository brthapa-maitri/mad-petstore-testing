import { describe, expect, it } from "vitest";
import { Pet, PetId } from "./pet";

describe("PetId", () => {
  it("accepts a 19-digit string above 2^53", () => {
    expect(PetId.safeParse("9007199254740993").success).toBe(true);
    expect(PetId.safeParse("9223372036854775807").success).toBe(true);
  });
  it("rejects a number", () => {
    expect(PetId.safeParse(9007199254740993).success).toBe(false);
  });
  it("rejects non-digit or too long strings", () => {
    expect(PetId.safeParse("12ab").success).toBe(false);
    expect(PetId.safeParse("12345678901234567890").success).toBe(false);
  });
});

describe("Pet", () => {
  it("keeps the id as the exact string", () => {
    const pet = Pet.parse({
      id: "9007199254740993",
      name: "Rex",
      status: "sold",
    });
    expect(pet.id).toBe("9007199254740993");
  });
});
