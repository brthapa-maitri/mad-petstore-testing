"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect } from "react";

export default function PetListError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  useEffect(() => {
    console.error(error);
  }, [error]);
  // reset() alone re-renders the cached failed segment; refresh() re-requests the Server Component.
  const retry = () => {
    startTransition(() => {
      router.refresh();
      reset();
    });
  };
  return (
    <main data-testid="pet-list-page">
      <h1>Pets</h1>
      <p role="alert">Could not load pets.</p>
      <button type="button" onClick={retry}>
        Try again
      </button>
    </main>
  );
}
