"use client";

import { useEffect } from "react";

export default function PetListError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main data-testid="pet-list-page">
      <h1>Pets</h1>
      <p role="alert">Could not load pets.</p>
      <button type="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
