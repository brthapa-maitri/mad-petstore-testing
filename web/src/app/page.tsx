import Link from "next/link";
import { PetTable } from "@/components/pets/pet-table";
import { StatusFilter } from "@/components/pets/status-filter";
import { parseStatus } from "@/lib/status";
import { listPetsByStatus } from "@/server/pets";

type PetListPageProps = {
  searchParams: Promise<{ status?: string | string[] }>;
};

export default async function PetListPage({ searchParams }: PetListPageProps) {
  const status = parseStatus((await searchParams).status);
  const pets = await listPetsByStatus(status);
  return (
    <main data-testid="pet-list-page">
      <h1>Pets</h1>
      <div className="bar">
        <StatusFilter value={status} />
        <Link href="/add" data-testid="add-pet-link">
          Add pet
        </Link>
      </div>
      <PetTable pets={pets} />
    </main>
  );
}
