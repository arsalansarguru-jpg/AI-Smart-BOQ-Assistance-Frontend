"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { deleteTenderProject } from "../_actions";

export default function DeleteTenderButton({
  tenderId,
  tenderName,
}: {
  tenderId: string;
  tenderName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    const confirmed = window.confirm(
      `Delete tender "${tenderName}" and all uploaded documents? This cannot be undone.`
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteTenderProject(tenderId);
      if (result.error) {
        toast.error("Delete failed", { description: result.error });
        return;
      }
      toast.success("Tender project deleted");
      router.push("/tenders");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="inline-flex items-center rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 shadow-sm transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900/50 dark:bg-neutral-900 dark:text-red-400 dark:hover:bg-red-950/30"
    >
      {isPending ? "Deleting…" : "Delete tender"}
    </button>
  );
}
