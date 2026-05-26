import type { TenderFileCategory } from "@/lib/types";

export const TENDER_STORAGE_BUCKET = "tender-files";

export const MAX_TENDER_FILE_BYTES = 50 * 1024 * 1024;

export const MAX_TENDER_FILES_PER_BATCH = 25;

const BOQ_EXTENSIONS = new Set(["pdf", "xls", "xlsx"]);
const DRAWING_EXTENSIONS = new Set([
  "pdf",
  "dwg",
  "dxf",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "tif",
  "tiff",
]);
const MAKE_LIST_EXTENSIONS = new Set([
  "pdf",
  "xls",
  "xlsx",
  "doc",
  "docx",
  "csv",
]);

const EXTENSION_TO_MIME: Record<string, string> = {
  pdf: "application/pdf",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  csv: "text/csv",
  dwg: "application/acad",
  dxf: "image/vnd.dxf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  tif: "image/tiff",
  tiff: "image/tiff",
};

export type TenderCategoryConfig = {
  category: TenderFileCategory;
  title: string;
  description: string;
  hints: string[];
  accept: string;
  extensions: Set<string>;
};

export const TENDER_CATEGORY_CONFIG: Record<
  TenderFileCategory,
  TenderCategoryConfig
> = {
  boq: {
    category: "boq",
    title: "BOQ Files",
    description:
      "Upload bill of quantities documents for AI extraction and structuring.",
    hints: [
      "BOQ PDFs",
      "BOQ Excel spreadsheets (.xls, .xlsx)",
    ],
    accept:
      ".pdf,.xls,.xlsx,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    extensions: BOQ_EXTENSIONS,
  },
  drawings: {
    category: "drawings",
    title: "Drawing Files",
    description:
      "Upload architectural and MEP drawings for scope cross-reference.",
    hints: [
      "Architectural drawings",
      "MEP drawings",
      "PDF, DWG, DXF, or image files",
    ],
    accept:
      ".pdf,.dwg,.dxf,.png,.jpg,.jpeg,.webp,.gif,.tif,.tiff,application/pdf,image/*",
    extensions: DRAWING_EXTENSIONS,
  },
  make_list: {
    category: "make_list",
    title: "Make Lists & Supplier Price Lists / Catalogs",
    description:
      "Upload approved manufacturer makes, supplier catalogs, and retail price list PDFs.",
    hints: [
      "Approved manufacturer makes",
      "Supplier price lists & catalogs (.pdf, .xls)",
      "Material specification sheets",
    ],
    accept:
      ".pdf,.xls,.xlsx,.doc,.docx,.csv,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/csv",
    extensions: MAKE_LIST_EXTENSIONS,
  },
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

export function resolveTenderMimeType(file: File): string {
  const ext = getFileExtension(file.name);
  if (file.type && file.type !== "application/octet-stream") {
    return file.type;
  }
  return EXTENSION_TO_MIME[ext] ?? file.type ?? "application/octet-stream";
}

export function validateTenderFile(
  file: File,
  category: TenderFileCategory
): string | null {
  const config = TENDER_CATEGORY_CONFIG[category];
  const ext = getFileExtension(file.name);

  if (!config.extensions.has(ext)) {
    const allowed = [...config.extensions].map((e) => `.${e}`).join(", ");
    return `File type not allowed. Accepted: ${allowed}.`;
  }

  if (file.size > MAX_TENDER_FILE_BYTES) {
    return `File is too large. Maximum size is ${formatBytes(MAX_TENDER_FILE_BYTES)}.`;
  }

  if (file.size === 0) {
    return "File is empty.";
  }

  return null;
}

export function buildTenderStoragePath(
  projectId: string,
  category: TenderFileCategory,
  originalFilename: string
): string {
  const safeName = originalFilename.replace(/[/\\]/g, "_");
  return `tenders/${projectId}/${category}/${crypto.randomUUID()}-${safeName}`;
}

export function getTenderFileTypeLabel(mimeType: string, fileName: string): string {
  const ext = getFileExtension(fileName);
  if (mimeType === "application/pdf" || ext === "pdf") return "PDF";
  if (ext === "dwg" || ext === "dxf") return "CAD";
  if (mimeType.startsWith("image/")) return "Image";
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    ext === "xls" ||
    ext === "xlsx" ||
    ext === "csv"
  ) {
    return "Spreadsheet";
  }
  if (mimeType.includes("word") || ext === "doc" || ext === "docx") {
    return "Document";
  }
  return "File";
}

export function isTenderFilesTableMissing(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("tender_files") &&
    (lower.includes("schema cache") ||
      lower.includes("does not exist") ||
      lower.includes("could not find the table"))
  );
}

export function isTenderProjectsTableMissing(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("tender_projects") &&
    (lower.includes("schema cache") ||
      lower.includes("does not exist") ||
      lower.includes("could not find the table"))
  );
}

export function isTenderStorageBucketMissing(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("bucket not found") ||
    (lower.includes("bucket") && lower.includes("not found"))
  );
}

export const TENDER_SETUP_HINT =
  "Run supabase/tender_documents.sql in Supabase SQL Editor, then create the tender-files storage bucket (private).";
