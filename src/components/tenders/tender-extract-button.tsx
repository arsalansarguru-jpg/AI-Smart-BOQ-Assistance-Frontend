"use client";

import { useState } from "react";
import type { TenderFile } from "@/lib/types";
import { extractFromFile, type ExtractResponse } from "@/lib/api";
import { getTenderFileDownloadUrl } from "@/app/(app)/tenders/[id]/_files-actions";
import ExtractionPreviewModal from "./extraction-preview-modal";

const EXTRACTABLE_TYPES = new Set([
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

function isExtractable(file: TenderFile): boolean {
  if (EXTRACTABLE_TYPES.has(file.file_type)) return true;
  const lower = file.file_name.toLowerCase();
  return (
    lower.endsWith(".pdf") || lower.endsWith(".xls") || lower.endsWith(".xlsx")
  );
}

export default function TenderExtractButton({
  file,
  projectName,
  disabled = false,
  onError,
  onBusyChange,
}: {
  file: TenderFile;
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
      const urlResult = await getTenderFileDownloadUrl(file.file_url);
      if ("error" in urlResult) {
        onError?.(urlResult.error);
        return;
      }

      const blobRes = await fetch(urlResult.url);
      if (!blobRes.ok) {
        onError?.("Could not download file for table extraction.");
        return;
      }
      const blob = await blobRes.blob();

      const result = await extractFromFile(blob, file.file_name);
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
          "Cannot reach extraction API. Start the backend: python -m uvicorn app.main:app --reload --port 8000"
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
        className="inline-flex items-center rounded-md border border-gray-900 bg-gray-900 px-2.5 py-1 text-xs font-bold text-white shadow-xs transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white dark:bg-white dark:text-gray-900 dark:hover:bg-neutral-200 cursor-pointer"
      >
        {loading ? (
          <>
            <span className="inline-block h-3 w-3 animate-spin rounded-full border border-white border-t-transparent dark:border-gray-900 dark:border-t-transparent mr-1" />
            Extracting…
          </>
        ) : (
          "Extract tables"
        )}
      </button>
      {preview ? (
        <ExtractionPreviewModal
          data={preview}
          projectName={projectName}
          tenderProjectId={file.tender_project_id}
          onClose={() => setPreview(null)}
        />
      ) : null}
    </>
  );
}
