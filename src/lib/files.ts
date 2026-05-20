export const STORAGE_BUCKET = "project-files";

export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export const MAX_FILES_PER_BATCH = 20;

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

const EXTENSION_TO_MIME: Record<string, AllowedMimeType> = {
  pdf: "application/pdf",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? (parts.pop()?.toLowerCase() ?? "") : "";
}

export function resolveMimeType(file: File): string {
  if (file.type && ALLOWED_MIME_TYPES.includes(file.type as AllowedMimeType)) {
    return file.type;
  }
  const ext = getFileExtension(file.name);
  return EXTENSION_TO_MIME[ext] ?? file.type;
}

export function validateFile(file: File): string | null {
  const mime = resolveMimeType(file);
  if (!ALLOWED_MIME_TYPES.includes(mime as AllowedMimeType)) {
    return "Only PDF and Excel files (.pdf, .xls, .xlsx) are allowed.";
  }
  if (file.size > MAX_FILE_BYTES) {
    return `File is too large. Maximum size is ${formatBytes(MAX_FILE_BYTES)}.`;
  }
  if (file.size === 0) {
    return "File is empty.";
  }
  return null;
}

export function getMimeLabel(mimeType: string): string {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) {
    return "Excel";
  }
  return "File";
}

export function buildStoragePath(
  userId: string,
  projectId: string,
  originalFilename: string
): string {
  const safeName = originalFilename.replace(/[/\\]/g, "_");
  return `${userId}/${projectId}/${crypto.randomUUID()}-${safeName}`;
}

/** True when Supabase has no project_files table yet (Day 3 SQL not run). */
export function isProjectFilesTableMissing(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("project_files") &&
    (lower.includes("schema cache") ||
      lower.includes("does not exist") ||
      lower.includes("could not find the table"))
  );
}

/** True when Storage bucket `project-files` was not created in Supabase. */
export function isStorageBucketMissing(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("bucket not found") ||
    (lower.includes("bucket") && lower.includes("not found"))
  );
}

export const PROJECT_FILES_SETUP_HINT =
  "Run supabase/day3a_table_only.sql in Supabase SQL Editor, create the project-files storage bucket (private), then run supabase/day3c_storage_policies.sql.";
