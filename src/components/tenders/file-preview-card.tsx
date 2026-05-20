"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { TenderFile } from "@/lib/types";
import { formatDateTime } from "@/lib/dates";
import { getTenderFileTypeLabel } from "@/lib/tenders/files";
import { openDownloadUrl } from "@/lib/download";
import {
  deleteTenderFile,
  getTenderFileDownloadUrl,
} from "@/app/(app)/tenders/[id]/_files-actions";

function FileTypeIcon({ label }: { label: string }) {
  const isPdf = label === "PDF";
  const isCad = label === "CAD";
  const isImage = label === "Image";

  return (
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
        isPdf
          ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
          : isCad
            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
            : isImage
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
      }`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.6}
      >
        {isImage ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        )}
      </svg>
    </div>
  );
}

export default function FilePreviewCard({
  file,
  tenderProjectId,
}: {
  file: TenderFile;
  tenderProjectId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [downloading, setDownloading] = useState(false);

  const typeLabel = getTenderFileTypeLabel(file.file_type, file.file_name);
  const busy = downloading || isPending;

  async function handleDownload() {
    setDownloading(true);
    try {
      const result = await getTenderFileDownloadUrl(file.file_url);
      if ("error" in result) {
        toast.error("Download failed", { description: result.error });
        return;
      }
      openDownloadUrl(result.url);
      toast.success("Download started");
    } catch (err) {
      toast.error("Download failed", {
        description: err instanceof Error ? err.message : "Try again.",
      });
    } finally {
      setDownloading(false);
    }
  }

  function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${file.file_name}"? This cannot be undone.`
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteTenderFile(file.id, tenderProjectId);
      if (result.error) {
        toast.error("Delete failed", { description: result.error });
        return;
      }
      toast.success("File deleted");
      router.refresh();
    });
  }

  return (
    <div className="flex gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition hover:border-gray-300 dark:border-neutral-700 dark:bg-neutral-900/80 dark:hover:border-neutral-600">
      <FileTypeIcon label={typeLabel} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
            {file.file_name}
          </p>
          <span className="shrink-0 rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-neutral-800 dark:text-neutral-300">
            {typeLabel}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-neutral-400">
          Uploaded {formatDateTime(file.created_at)}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={busy}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          >
            {downloading ? "Opening…" : "Download"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="inline-flex items-center rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900/50 dark:bg-neutral-800 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            {isPending ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
