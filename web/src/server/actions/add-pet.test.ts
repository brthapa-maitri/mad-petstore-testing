import { afterEach, describe, expect, it, vi } from "vitest";
import { ADD_FAILED } from "@/lib/schemas/pet";
import { addPet, type AddPetState } from "./add-pet";

const start: AddPetState = { ok: null, n: 0 };

function form(name: string, status = "available", category = ""): FormData {
  const f = new FormData();
  f.set("name", name);
  f.set("status", status);
  f.set("category", category);
  return f;
}

function reply(body: unknown, status = 200): Promise<Response> {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

/** Stub fetch; returns a getter for the JSON body of the last request. */
function stubFetch(respond: () => Promise<Response>) {
  let sent: unknown = undefined;
  const mock = vi.fn((_url: unknown, init?: RequestInit) => {
    sent = JSON.parse(init?.body as string);
    return respond();
  });
  vi.stubGlobal("fetch", mock);
  return { mock, sent: () => sent };
}

afterEach(() => vi.unstubAllGlobals());

describe("addPet", () => {
  it("rejects blank, 101-char names and 51-char categories without calling the API", async () => {
    const { mock } = stubFetch(() => reply({}));
    for (const f of [
      form("   "),
      form("a".repeat(101)),
      form("Rex", "available", "c".repeat(51)),
    ]) {
      expect((await addPet(start, f)).ok).toBe(false);
    }
    expect(mock).not.toHaveBeenCalled();
  });

  it("sends trimmed values, omits an empty category, keeps the id a string", async () => {
    const api = stubFetch(() =>
      reply({ id: "9007199254740993", name: "Rex", status: "sold" }),
    );
    const s = await addPet(start, form("  Rex ", "sold", "  "));
    expect(api.sent()).toEqual({ name: "Rex", status: "sold" });
    expect(s).toMatchObject({ ok: true, pet: { id: "9007199254740993" } });
  });

  it("sends the category as an object", async () => {
    const api = stubFetch(() =>
      reply({ id: "1", name: "Rex", status: "available" }),
    );
    await addPet(start, form("Rex", "available", "Dogs"));
    expect(api.sent()).toEqual({
      name: "Rex",
      status: "available",
      category: { name: "Dogs" },
    });
  });

  it("maps a 500 to the generic message", async () => {
    stubFetch(() => reply({ detail: "x" }, 500));
    expect(await addPet(start, form("Rex"))).toMatchObject({
      ok: false,
      error: ADD_FAILED,
    });
  });

  it("maps a network error to the generic message", async () => {
    stubFetch(() => Promise.reject(new Error("down")));
    expect(await addPet(start, form("Rex"))).toMatchObject({
      ok: false,
      error: ADD_FAILED,
    });
  });

  it("shows a string 422 detail", async () => {
    stubFetch(() => reply({ detail: "bad name" }, 422));
    expect(await addPet(start, form("Rex"))).toMatchObject({
      ok: false,
      error: "bad name",
    });
  });
});
