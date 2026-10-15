import Link from "next/link";

export default function AddPetPage() {
  return (
    <main data-testid="add-pet-page">
      <h1>Add pet</h1>
      <Link href="/" data-testid="back-to-list-link">
        Back to list
      </Link>
    </main>
  );
}
