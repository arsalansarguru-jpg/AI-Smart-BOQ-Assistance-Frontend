"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ProjectFile } from "@/lib/types";
import { formatDateTime } from "@/lib/dates";
import { formatBytes, getMimeLabel } from "@/lib/files";
import { openDownloadUrl } from "@/lib/download";
import { deleteFile, getDownloadUrl } from "../_files-actions";
import ExtractTablesButton from "./extract-tables-button";

export default function FileRow({
  file,
  projectId,
  projectName,
}: {
  file: ProjectFile;
  projectId: string;
  projectName?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [extracting, setExtracting] = useState(false);

  const busy = downloading || isPending || extracting;

  const uploaded = formatDateTime(file.uploaded_at);

  async function handleDownload() {
    setErrorMsg(null);
    setDownloading(true);
    try {
      const result = await getDownloadUrl(file.storage_path);
      if ("error" in result) {
        setErrorMsg(result.error);
        return;
      }
      openDownloadUrl(result.url);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Download failed. Try again."
      );
    } finally {
      setDownloading(false);
    }
  }

  function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${file.original_filename}"? This cannot be undone.`
    );
    if (!confirmed) return;

    setErrorMsg(null);
    startTransition(async () => {
      const result = await deleteFile(file.id, projectId);
      if (result.error) {
        setErrorMsg(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3 last:border-0 dark:border-neutral-800 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium text-gray-900 dark:text-white">
            {file.original_filename}
          </span>
          <span className="shrink-0 rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-neutral-800 dark:text-neutral-300">
            {getMimeLabel(file.mime_type)}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-neutral-400">
          {formatBytes(file.size_bytes)} · Uploaded {uploaded}
        </p>
        {errorMsg ? (
          <p
            role="alert"
            className="mt-1 text-xs text-red-600 dark:text-red-400"
          >
            {errorMsg}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <ExtractTablesButton
          file={file}
          projectName={projectName}
          disabled={busy}
          onError={setErrorMsg}
          onBusyChange={setExtracting}
        />
        <button
          type="button"
          onClick={handleDownload}
          disabled={busy}
          aria-busy={downloading}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          {downloading ? "Downloading..." : "Download"}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={busy}
          aria-busy={isPending}
          className="inline-flex items-center rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/50 dark:bg-neutral-900 dark:text-red-400 dark:hover:bg-red-950/30"
        >
          {isPending ? "Deleting..." : "Delete file"}
        </button>
      </div>
    </li>
  );
}
