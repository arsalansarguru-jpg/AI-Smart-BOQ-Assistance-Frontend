"use client";

import { useState } from "react";
import type { ProjectFile } from "@/lib/types";
import { extractFromFile, type ExtractResponse } from "@/lib/api";
import { getDownloadUrl } from "../_files-actions";
import ExtractionPreviewModal from "./extraction-preview-modal";

const EXTRACTABLE_MIME = new Set([
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

function isExtractable(file: ProjectFile): boolean {
  if (EXTRACTABLE_MIME.has(file.mime_type)) return true;
  const lower = file.original_filename.toLowerCase();
  return (
    lower.endsWith(".pdf") || lower.endsWith(".xls") || lower.endsWith(".xlsx")
  );
}

export default function ExtractTablesButton({
  file,
  projectName,
  disabled = false,
  onError,
  onBusyChange,
}: {
  file: ProjectFile;
  projectName?: string;
  disabled?: boolean;
  onError?: (message: string | null) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ExtractResponse | null>(null);

  if (!isExtractable(file)) {
    return null;
  }

  async function handleExtract() {
    onError?.(null);
    setLoading(true);
    onBusyChange?.(true);
    setPreview(null);

    try {
      const urlResult = await getDownloadUrl(file.storage_path);
      if ("error" in urlResult) {
        onError?.(urlResult.error);
        return;
      }

      const blobRes = await fetch(urlResult.url);
      if (!blobRes.ok) {
        onError?.("Could not download file for extraction.");
        return;
      }
      const blob = await blobRes.blob();

      const result = await extractFromFile(blob, file.original_filename);
      setPreview(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Extraction failed.";
      if (
        message.includes("fetch") ||
        message.includes("Failed to fetch") ||
        message.includes("NetworkError")
      ) {
        onError?.(
          "Cannot reach extraction API. Start the backend: cd backend, activate .venv, then run: python -m uvicorn app.main:app --reload --port 8000"
        );
      } else {
        onError?.(message);
      }
    } finally {
      setLoading(false);
      onBusyChange?.(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleExtract}
        disabled={disabled || loading}
        aria-busy={loading}
        className="inline-flex items-center rounded-md border border-gray-900 bg-gray-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white dark:bg-white dark:text-gray-900 dark:hover:bg-neutral-200"
      >
        {loading ? "Extracting..." : "Extract tables"}
      </button>
      {preview ? (
        <ExtractionPreviewModal
          data={preview}
          projectName={projectName}
          onClose={() => setPreview(null)}
        />
      ) : null}
    </>
  );
}
