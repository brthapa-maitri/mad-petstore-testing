import { describe, expect, it } from "vitest";
import { parseStatus } from "./status";

describe("parseStatus", () => {
  it.each(["available", "pending", "sold"] as const)("keeps %s", (s) => {
    expect(parseStatus(s)).toBe(s);
  });

  it.each([undefined, "foo", "", ["sold", "pending"]])(
    "falls back to available for %j",
    (raw) => {
      expect(parseStatus(raw)).toBe("available");
    },
  );
});
