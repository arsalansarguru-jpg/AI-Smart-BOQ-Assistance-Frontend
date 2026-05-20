import { createClient } from "@/lib/supabase/server";
import {
  checkProjectFilesTable,
  isTableMissingStatus,
} from "@/lib/db-setup";
import type { ProjectFile } from "@/lib/types";
import FileRow from "./file-row";
import SetupFilesTableHint from "./setup-files-table-hint";

export default async function FileList({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName?: string;
}) {
  const tableStatus = await checkProjectFilesTable();
  const tableMissing = isTableMissingStatus(tableStatus);

  const supabase = await createClient();
  const { data, error } = tableMissing
    ? { data: null, error: null }
    : await supabase
        .from("project_files")
        .select("*")
        .eq("project_id", projectId)
        .order("uploaded_at", { ascending: false });

  const files = (data ?? []) as ProjectFile[];

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="border-b border-gray-200 px-5 py-4 dark:border-neutral-800">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          Project files
        </h2>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-neutral-400">
          {tableMissing
            ? "Setup required before files can be listed."
            : files.length === 0
              ? "No files uploaded yet."
              : `${files.length} file${files.length === 1 ? "" : "s"}`}
        </p>
      </div>

      {tableMissing ? (
        <div className="px-5 py-4">
          <SetupFilesTableHint />
        </div>
      ) : error ? (
        <div
          role="alert"
          className="px-5 py-4 text-sm text-red-700 dark:text-red-300"
        >
          Failed to load files: {error.message}
        </div>
      ) : files.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-gray-500 dark:text-neutral-400">
          Upload one or more BOQ PDFs or Excel sheets above.
        </p>
      ) : (
        <ul>
          {files.map((file) => (
            <FileRow
              key={file.id}
              file={file}
              projectId={projectId}
              projectName={projectName}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
