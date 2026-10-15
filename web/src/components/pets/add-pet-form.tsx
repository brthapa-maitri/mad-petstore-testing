"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { addPet, type AddPetState } from "@/server/actions/add-pet";

const initial: AddPetState = { ok: null, n: 0 };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" data-testid="add-pet-submit" disabled={pending}>
      Add
    </button>
  );
}

/** Add-pet form. Inputs remount (via `key`) after each result so success clears them and errors keep them. */
export function AddPetForm() {
  const [state, action] = useActionState(addPet, initial);
  const fields = state.ok === false ? state.fields : null;
  return (
    <>
      <form action={action} noValidate data-testid="add-pet-form" key={state.n}>
        <label>
          Name
          <input
            name="name"
            data-testid="pet-name-input"
            defaultValue={fields?.name ?? ""}
          />
        </label>
        <label>
          Status
          <select
            name="status"
            data-testid="pet-status-select"
            defaultValue={fields?.status ?? "available"}
          >
            <option value="available">available</option>
            <option value="pending">pending</option>
            <option value="sold">sold</option>
          </select>
        </label>
        <label>
          Category
          <input
            name="category"
            data-testid="pet-category-input"
            defaultValue={fields?.category ?? ""}
          />
        </label>
        <Submit />
        <p data-testid="form-error" role="alert" hidden={state.ok !== false}>
          {state.ok === false ? state.error : ""}
        </p>
      </form>
      {state.ok === true ? (
        <section data-testid="created-pet">
          <h2>Added</h2>
          <p>
            Id <span data-testid="created-pet-id">{state.pet.id}</span>
          </p>
          <p>
            Name <span data-testid="created-pet-name">{state.pet.name}</span>
          </p>
          <p>
            Status{" "}
            <span data-testid="created-pet-status">{state.pet.status}</span>
          </p>
        </section>
      ) : null}
      <Link href="/" data-testid="back-to-list-link">
        Back to list
      </Link>
    </>
  );
}
