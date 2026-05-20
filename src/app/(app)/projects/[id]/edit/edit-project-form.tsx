"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateProject, type ProjectFormState } from "../../_actions";
import type { Project } from "@/lib/types";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-gray-900 dark:hover:bg-neutral-200 dark:focus:ring-white"
    >
      {pending ? "Saving..." : "Save changes"}
    </button>
  );
}

export default function EditProjectForm({ project }: { project: Project }) {
  const initialState: ProjectFormState = {
    values: {
      project_name: project.project_name,
      client_name: project.client_name,
      tender_number: project.tender_number ?? "",
    },
  };

  const boundUpdate = updateProject.bind(null, project.id);
  const [state, formAction] = useActionState(boundUpdate, initialState);

  const values = state.values ?? initialState.values!;

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label
          htmlFor="project_name"
          className="block text-sm font-medium text-gray-700 dark:text-neutral-300"
        >
          Project name <span className="text-red-500">*</span>
        </label>
        <input
          id="project_name"
          name="project_name"
          type="text"
          required
          maxLength={200}
          defaultValue={values.project_name}
          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:border-white dark:focus:ring-white"
        />
        {state.errors?.project_name ? (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            {state.errors.project_name}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="client_name"
          className="block text-sm font-medium text-gray-700 dark:text-neutral-300"
        >
          Client name <span className="text-red-500">*</span>
        </label>
        <input
          id="client_name"
          name="client_name"
          type="text"
          required
          maxLength={200}
          defaultValue={values.client_name}
          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:border-white dark:focus:ring-white"
        />
        {state.errors?.client_name ? (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            {state.errors.client_name}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="tender_number"
          className="block text-sm font-medium text-gray-700 dark:text-neutral-300"
        >
          Tender number{" "}
          <span className="text-xs font-normal text-gray-400 dark:text-neutral-500">
            (optional)
          </span>
        </label>
        <input
          id="tender_number"
          name="tender_number"
          type="text"
          maxLength={100}
          defaultValue={values.tender_number}
          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:border-white dark:focus:ring-white"
        />
        {state.errors?.tender_number ? (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            {state.errors.tender_number}
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

      <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-5 dark:border-neutral-800">
        <Link
          href={`/projects/${project.id}`}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          Cancel
        </Link>
        <SubmitButton />
      </div>
    </form>
  );
}
