import Link from "next/link";

export default function PetListPage() {
  return (
    <main data-testid="pet-list-page">
      <h1>Pets</h1>
      <div className="bar">
        <Link href="/add" data-testid="add-pet-link">
          Add pet
        </Link>
      </div>
    </main>
  );
}
