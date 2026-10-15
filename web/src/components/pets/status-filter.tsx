"use client";

import { useRouter } from "next/navigation";
import { PetStatus } from "@/lib/schemas/pet";

export type StatusFilterProps = { value: PetStatus };

/** Status select; the URL (`/?status=<value>`) is the source of truth. */
export function StatusFilter({ value }: StatusFilterProps) {
  const router = useRouter();
  return (
    <label>
      Status
      <select
        data-testid="status-filter"
        value={value}
        onChange={(e) => {
          router.push(`/?status=${encodeURIComponent(e.target.value)}`);
        }}
      >
        {PetStatus.options.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </label>
  );
}
