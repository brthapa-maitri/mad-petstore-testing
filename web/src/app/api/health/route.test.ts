import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

afterEach(() => vi.unstubAllGlobals());

describe("GET /api/health", () => {
  it("returns 200 when the API answers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("{}", { status: 200 }))),
    );
    const res = await GET();
    expect(res.status).toBe(200);
  });
  it("returns 503 when the API is unhealthy", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("{}", { status: 500 }))),
    );
    expect((await GET()).status).toBe(503);
  });
  it("returns 503 when the API is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("down"))),
    );
    expect((await GET()).status).toBe(503);
  });
});
