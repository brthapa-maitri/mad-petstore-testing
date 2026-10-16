import { describe, expect, it } from "vitest";
import { parseNewPetForm, Pet, PetId } from "./pet";

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

describe("parseNewPetForm", () => {
  it("trims name and category and omits an empty category", () => {
    expect(
      parseNewPetForm({ name: "  Rex ", status: "sold", category: "  " }),
    ).toEqual({ ok: true, data: { name: "Rex", status: "sold" } });
    expect(
      parseNewPetForm({ name: "Rex", status: "sold", category: " Dogs " }),
    ).toEqual({
      ok: true,
      data: { name: "Rex", status: "sold", category: { name: "Dogs" } },
    });
  });
  it("rejects blank and over-long values", () => {
    expect(
      parseNewPetForm({ name: "  ", status: "sold", category: "" }).ok,
    ).toBe(false);
    expect(
      parseNewPetForm({ name: "a".repeat(101), status: "sold", category: "" })
        .ok,
    ).toBe(false);
    expect(
      parseNewPetForm({ name: "a".repeat(100), status: "sold", category: "" })
        .ok,
    ).toBe(true);
  });
});
