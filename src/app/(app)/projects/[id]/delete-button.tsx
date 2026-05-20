"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteProject } from "../_actions";

export default function DeleteButton({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function handleDelete() {
    const confirmed = window.confirm(
      `Delete project "${projectName}"? This cannot be undone.`
    );
    if (!confirmed) return;

    setErrorMsg(null);
    startTransition(async () => {
      const result = await deleteProject(projectId);
      if (result.error) {
        setErrorMsg(result.error);
        return;
      }
      router.push("/projects");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        aria-busy={isPending}
        className="inline-flex items-center rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/50 dark:bg-neutral-900 dark:text-red-400 dark:hover:bg-red-950/30"
      >
        {isPending ? "Deleting..." : "Delete project"}
      </button>
      {errorMsg ? (
        <p className="max-w-xs text-right text-xs text-red-600 dark:text-red-400">
          {errorMsg}
        </p>
      ) : null}
    </div>
  );
}
