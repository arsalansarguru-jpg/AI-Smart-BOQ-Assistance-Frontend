"use client";

import { useActionState } from "react";
import {
  createTenderProject,
  type TenderFormState,
} from "../_actions";

const initialState: TenderFormState = {};

export default function CreateTenderForm() {
  const [state, formAction, pending] = useActionState(
    createTenderProject,
    initialState
  );

  return (
    <form
      action={formAction}
      className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="space-y-5">
        <div>
          <label
            htmlFor="tender_name"
            className="block text-sm font-medium text-gray-700 dark:text-neutral-300"
          >
            Tender name
          </label>
          <input
            id="tender_name"
            name="tender_name"
            type="text"
            required
            defaultValue={state.values?.tender_name ?? ""}
            placeholder="e.g. Marina Tower — Phase 2 MEP"
            className="mt-1.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white dark:focus:border-white dark:focus:ring-white"
          />
          {state.errors?.tender_name ? (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {state.errors.tender_name}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="client_name"
            className="block text-sm font-medium text-gray-700 dark:text-neutral-300"
          >
            Client name
          </label>
          <input
            id="client_name"
            name="client_name"
            type="text"
            required
            defaultValue={state.values?.client_name ?? ""}
            placeholder="e.g. ABC Construction LLC"
            className="mt-1.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white dark:focus:border-white dark:focus:ring-white"
          />
          {state.errors?.client_name ? (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {state.errors.client_name}
            </p>
          ) : null}
        </div>

        {state.errors?.form ? (
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
          >
            {state.errors.form}
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800 disabled:opacity-60 dark:bg-white dark:text-gray-900 dark:hover:bg-neutral-200"
        >
          {pending ? "Creating…" : "Create tender project"}
        </button>
      </div>
    </form>
  );
}
