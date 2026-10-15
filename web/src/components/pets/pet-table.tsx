import type { Pet } from "@/lib/schemas/pet";

export type PetTableProps = { pets: Pet[] };

/** Pet rows in the order given, or the empty message when there are none (never both). */
export function PetTable({ pets }: PetTableProps) {
  return (
    <>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody data-testid="pet-list">
          {pets.map((pet) => (
            <tr key={pet.id} data-testid="pet-row">
              <td data-testid="pet-row-name">{pet.name}</td>
              <td data-testid="pet-row-status">{pet.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {pets.length === 0 && (
        <p data-testid="pet-list-empty">No pets with this status.</p>
      )}
    </>
  );
}
