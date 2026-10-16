// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PetTable } from "./pet-table";

afterEach(cleanup);

describe("PetTable", () => {
  it("renders a 19-digit id pet unchanged and no empty message", () => {
    render(
      <PetTable
        pets={[{ id: "9007199254740993123", name: "Rex", status: "sold" }]}
      />,
    );
    expect(screen.getByTestId("pet-row-name").textContent).toBe("Rex");
    expect(screen.getByTestId("pet-row-status").textContent).toBe("sold");
    expect(screen.queryByTestId("pet-list-empty")).toBeNull();
  });

  it("shows the empty message and no rows for an empty list", () => {
    render(<PetTable pets={[]} />);
    expect(screen.getByTestId("pet-list-empty").textContent).toBe(
      "No pets with this status.",
    );
    expect(screen.queryAllByTestId("pet-row")).toHaveLength(0);
  });
});
