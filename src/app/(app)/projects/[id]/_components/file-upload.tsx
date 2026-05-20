"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildStoragePath,
  formatBytes,
  isProjectFilesTableMissing,
  isStorageBucketMissing,
  MAX_FILE_BYTES,
  MAX_FILES_PER_BATCH,
  resolveMimeType,
  STORAGE_BUCKET,
  validateFile,
} from "@/lib/files";
import SetupFilesTableHint from "./setup-files-table-hint";
import SetupStorageBucketHint from "./setup-storage-bucket-hint";

type UploadResult = { name: string; ok: boolean; error?: string };

async function uploadSingleFile(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  file: File
): Promise<UploadResult> {
  const validationError = validateFile(file);
  if (validationError) {
    return { name: file.name, ok: false, error: validationError };
  }

  const mimeType = resolveMimeType(file);
  const storagePath = buildStoragePath(userId, projectId, file.name);

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: mimeType,
    });

  if (uploadError) {
    return { name: file.name, ok: false, error: uploadError.message };
  }

  const { error: insertError } = await supabase.from("project_files").insert({
    project_id: projectId,
    user_id: userId,
    storage_path: storagePath,
    original_filename: file.name,
    mime_type: mimeType,
    size_bytes: file.size,
  });

  if (insertError) {
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    return { name: file.name, ok: false, error: insertError.message };
  }

  return { name: file.name, ok: true };
}

export default function FileUpload({
  projectId,
  initialTableMissing = false,
  initialBucketMissing = false,
  projectRef = null,
}: {
  projectId: string;
  initialTableMissing?: boolean;
  initialBucketMissing?: boolean;
  projectRef?: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadLabel, setUploadLabel] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [setupKind, setSetupKind] = useState<"table" | "bucket" | null>(
    initialTableMissing ? "table" : initialBucketMissing ? "bucket" : null
  );
  const [lastResults, setLastResults] = useState<UploadResult[] | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const processFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      if (files.length === 0) return;

      setErrorMsg(null);
      setLastResults(null);
      setSetupKind(null);

      if (files.length > MAX_FILES_PER_BATCH) {
        setErrorMsg(
          `You can upload at most ${MAX_FILES_PER_BATCH} files at once. Select fewer files.`
        );
        return;
      }

      setUploading(true);

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setErrorMsg("You are not signed in.");
        setUploading(false);
        return;
      }

      const results: UploadResult[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadLabel(
          files.length === 1
            ? `Uploading ${file.name}...`
            : `Uploading ${i + 1} of ${files.length}: ${file.name}...`
        );

        const result = await uploadSingleFile(
          supabase,
          user.id,
          projectId,
          file
        );
        results.push(result);

        if (!result.ok && result.error) {
          if (isProjectFilesTableMissing(result.error)) {
            setSetupKind("table");
            setErrorMsg(null);
            setUploading(false);
            setUploadLabel(null);
            setLastResults(results);
            return;
          }
          if (isStorageBucketMissing(result.error)) {
            setSetupKind("bucket");
            setErrorMsg(null);
            setUploading(false);
            setUploadLabel(null);
            setLastResults(results);
            return;
          }
        }
      }

      setUploading(false);
      setUploadLabel(null);
      setLastResults(results);

      const failed = results.filter((r) => !r.ok);
      const succeeded = results.filter((r) => r.ok);

      if (failed.length > 0 && succeeded.length === 0) {
        setErrorMsg(
          failed.length === 1
            ? failed[0].error ?? "Upload failed."
            : `${failed.length} file(s) failed to upload. See details below.`
        );
      } else if (failed.length > 0) {
        setErrorMsg(
          `${succeeded.length} uploaded, ${failed.length} failed. See details below.`
        );
      }

      if (succeeded.length > 0) {
        router.refresh();
      }
    },
    [projectId, router]
  );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    if (list?.length) {
      void processFiles(list);
    }
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (uploading) return;
    const list = e.dataTransfer.files;
    if (list?.length) {
      void processFiles(list);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white">
        Upload files
      </h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
        PDF or Excel, up to {formatBytes(MAX_FILE_BYTES)} each. Select multiple
        files or drag them here (max {MAX_FILES_PER_BATCH} per batch).
      </p>

      {setupKind === "table" ? (
        <div className="mt-4">
          <SetupFilesTableHint />
        </div>
      ) : null}
      {setupKind === "bucket" ? (
        <div className="mt-4">
          <SetupStorageBucketHint projectRef={projectRef} />
        </div>
      ) : null}

      <div
        onDragEnter={(e) => {
          e.preventDefault();
          if (!uploading) setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragOver(false);
          }
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className={`mt-4 rounded-lg border-2 border-dashed px-4 py-8 text-center transition ${
          dragOver
            ? "border-gray-900 bg-gray-50 dark:border-white dark:bg-neutral-800"
            : "border-gray-200 dark:border-neutral-700"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.xls,.xlsx,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          disabled={uploading}
          onChange={handleFileChange}
        />
        <p className="text-sm text-gray-600 dark:text-neutral-400">
          Drag and drop files here, or
        </p>
        <button
          type="button"
          disabled={uploading}
          aria-busy={uploading}
          onClick={() => inputRef.current?.click()}
          className="mt-3 inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-gray-900 dark:hover:bg-neutral-200"
        >
          {uploading ? (
            <>
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent dark:border-gray-900 dark:border-t-transparent" />
              Uploading...
            </>
          ) : (
            "Choose files"
          )}
        </button>
        {uploadLabel ? (
          <p className="mt-3 text-sm font-medium text-gray-700 dark:text-neutral-300">
            {uploadLabel}
          </p>
        ) : null}
      </div>

      {errorMsg && !setupKind ? (
        <div
          role="alert"
          className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
        >
          {errorMsg}
        </div>
      ) : null}

      {lastResults && lastResults.some((r) => !r.ok) ? (
        <ul className="mt-3 space-y-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800/50">
          {lastResults.map((r) => (
            <li
              key={r.name}
              className={
                r.ok
                  ? "text-green-700 dark:text-green-400"
                  : "text-red-700 dark:text-red-300"
              }
            >
              {r.ok ? "✓" : "✗"} {r.name}
              {r.error ? ` — ${r.error}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
