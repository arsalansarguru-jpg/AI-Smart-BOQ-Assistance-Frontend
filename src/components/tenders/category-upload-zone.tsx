"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { TenderFile, TenderFileCategory } from "@/lib/types";
import {
  buildTenderStoragePath,
  formatBytes,
  isTenderFilesTableMissing,
  isTenderStorageBucketMissing,
  MAX_TENDER_FILE_BYTES,
  MAX_TENDER_FILES_PER_BATCH,
  resolveTenderMimeType,
  TENDER_CATEGORY_CONFIG,
  TENDER_STORAGE_BUCKET,
  validateTenderFile,
} from "@/lib/tenders/files";
import UploadProgress from "./upload-progress";
import FilePreviewCard from "./file-preview-card";

type UploadResult = { name: string; ok: boolean; error?: string };

async function uploadSingleTenderFile(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  category: TenderFileCategory,
  file: File
): Promise<UploadResult> {
  const validationError = validateTenderFile(file, category);
  if (validationError) {
    return { name: file.name, ok: false, error: validationError };
  }

  const mimeType = resolveTenderMimeType(file);
  const storagePath = buildTenderStoragePath(projectId, category, file.name);

  const { error: uploadError } = await supabase.storage
    .from(TENDER_STORAGE_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: mimeType,
    });

  if (uploadError) {
    return { name: file.name, ok: false, error: uploadError.message };
  }

  const { error: insertError } = await supabase.from("tender_files").insert({
    tender_project_id: projectId,
    category,
    file_name: file.name,
    file_url: storagePath,
    file_type: mimeType,
    uploaded_by: userId,
  });

  if (insertError) {
    await supabase.storage.from(TENDER_STORAGE_BUCKET).remove([storagePath]);
    return { name: file.name, ok: false, error: insertError.message };
  }

  return { name: file.name, ok: true };
}

type CategoryUploadZoneProps = {
  tenderProjectId: string;
  category: TenderFileCategory;
  files: TenderFile[];
  setupRequired?: boolean;
};

export default function CategoryUploadZone({
  tenderProjectId,
  category,
  files,
  setupRequired = false,
}: CategoryUploadZoneProps) {
  const config = TENDER_CATEGORY_CONFIG[category];
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, fileName: "" });
  const [dragOver, setDragOver] = useState(false);

  const processFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const selected = Array.from(fileList);
      if (selected.length === 0) return;

      if (setupRequired) {
        toast.error("Database setup required", {
          description: "Run supabase/tender_documents.sql in Supabase first.",
        });
        return;
      }

      if (selected.length > MAX_TENDER_FILES_PER_BATCH) {
        toast.error("Too many files", {
          description: `Upload at most ${MAX_TENDER_FILES_PER_BATCH} files per batch.`,
        });
        return;
      }

      setUploading(true);
      setProgress({ current: 0, total: selected.length, fileName: "" });

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Not signed in");
        setUploading(false);
        return;
      }

      const results: UploadResult[] = [];

      for (let i = 0; i < selected.length; i++) {
        const file = selected[i];
        setProgress({
          current: i,
          total: selected.length,
          fileName: file.name,
        });

        const result = await uploadSingleTenderFile(
          supabase,
          user.id,
          tenderProjectId,
          category,
          file
        );
        results.push(result);

        if (!result.ok && result.error) {
          if (
            isTenderFilesTableMissing(result.error) ||
            isTenderStorageBucketMissing(result.error)
          ) {
            toast.error("Setup required", {
              description: result.error,
            });
            setUploading(false);
            setProgress({ current: 0, total: 0, fileName: "" });
            return;
          }
        }
      }

      setProgress({
        current: selected.length,
        total: selected.length,
        fileName: "",
      });
      setUploading(false);

      const succeeded = results.filter((r) => r.ok);
      const failed = results.filter((r) => !r.ok);

      if (succeeded.length > 0) {
        toast.success(
          `${succeeded.length} file${succeeded.length === 1 ? "" : "s"} uploaded`,
          { description: config.title }
        );
        router.refresh();
      }

      if (failed.length > 0) {
        toast.error(
          `${failed.length} file${failed.length === 1 ? "" : "s"} failed`,
          {
            description:
              failed.length === 1
                ? (failed[0].error ?? "Upload failed")
                : failed.map((f) => f.name).join(", "),
          }
        );
      }
    },
    [category, config.title, router, setupRequired, tenderProjectId]
  );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    if (list?.length) void processFiles(list);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (uploading) return;
    const list = e.dataTransfer.files;
    if (list?.length) void processFiles(list);
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="border-b border-gray-100 px-5 py-4 dark:border-neutral-800">
        <div className="flex items-start gap-3">
          <CategoryIcon category={category} />
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {config.title}
            </h3>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-neutral-400">
              {config.description}
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {config.hints.map((hint) => (
                <li
                  key={hint}
                  className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-neutral-800 dark:text-neutral-300"
                >
                  {hint}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="p-5">
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
          className={`rounded-lg border-2 border-dashed px-4 py-8 text-center transition ${
            dragOver
              ? "border-gray-900 bg-gray-50 dark:border-white dark:bg-neutral-800"
              : "border-gray-200 dark:border-neutral-700"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={config.accept}
            className="hidden"
            disabled={uploading || setupRequired}
            onChange={handleFileChange}
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="mx-auto h-8 w-8 text-gray-400 dark:text-neutral-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 12V4m0 0l-4 4m4-4l4 4"
            />
          </svg>
          <p className="mt-3 text-sm text-gray-600 dark:text-neutral-400">
            Drag and drop files here, or
          </p>
          <button
            type="button"
            disabled={uploading || setupRequired}
            onClick={() => inputRef.current?.click()}
            className="mt-3 inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-gray-900 dark:hover:bg-neutral-200"
          >
            {uploading ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent dark:border-gray-900 dark:border-t-transparent" />
                Uploading…
              </>
            ) : (
              "Choose files"
            )}
          </button>
          <p className="mt-2 text-xs text-gray-400 dark:text-neutral-500">
            Max {formatBytes(MAX_TENDER_FILE_BYTES)} per file · up to{" "}
            {MAX_TENDER_FILES_PER_BATCH} per batch
          </p>
        </div>

        {uploading && progress.total > 0 ? (
          <UploadProgress
            current={progress.current}
            total={progress.total}
            fileName={progress.fileName}
          />
        ) : null}

        {files.length > 0 ? (
          <div className="mt-5">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-500">
              Uploaded ({files.length})
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {files.map((file) => (
                <FilePreviewCard
                  key={file.id}
                  file={file}
                  tenderProjectId={tenderProjectId}
                />
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-4 text-center text-sm text-gray-400 dark:text-neutral-500">
            No files in this category yet.
          </p>
        )}
      </div>
    </section>
  );
}

function CategoryIcon({ category }: { category: TenderFileCategory }) {
  const paths: Record<TenderFileCategory, string> = {
    boq: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    drawings:
      "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z",
    make_list:
      "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  };

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-neutral-200">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.6}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d={paths[category]}
        />
      </svg>
    </div>
  );
}
