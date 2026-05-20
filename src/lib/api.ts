import { downloadBlob } from "@/lib/download";

export type ExtractTableBlock = {
  page: number | null;
  sheet: string | null;
  rows: (string | null)[][];
};

export type ExtractResponse = {
  filename: string;
  file_type: "pdf" | "excel" | string;
  page_count?: number | null;
  sheet_count?: number | null;
  tables: ExtractTableBlock[];
  message?: string | null;
};

export type BoqLineItem = {
  item_no: string | null;
  section: string | null;
  description: string;
  unit: string | null;
  quantity: number | null;
  rate: number | null;
  amount: number | null;
  remarks: string | null;
};

export type StructureResponse = {
  filename: string;
  items: BoqLineItem[];
  summary?: string | null;
  warnings?: string[];
  model?: string | null;
  rows_analyzed?: number | null;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:8000";

export function getApiBaseUrl(): string {
  return API_BASE;
}

export async function extractFromFile(
  file: Blob,
  filename: string
): Promise<ExtractResponse> {
  const form = new FormData();
  form.append("file", file, filename);

  const res = await fetch(`${API_BASE}/api/extract`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    let message = `Extraction failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") {
        message = body.detail;
      } else if (Array.isArray(body.detail)) {
        message = body.detail.map((d: { msg?: string }) => d.msg).join(", ");
      }
    } catch {
      /* use default message */
    }
    throw new Error(message);
  }

  return res.json() as Promise<ExtractResponse>;
}

export async function structureExtractedBoq(
  extract: ExtractResponse
): Promise<StructureResponse> {
  const res = await fetch(`${API_BASE}/api/structure`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: extract.filename,
      tables: extract.tables,
    }),
  });

  if (!res.ok) {
    let message = `Structuring failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") {
        message = body.detail;
      } else if (Array.isArray(body.detail)) {
        message = body.detail.map((d: { msg?: string }) => d.msg).join(", ");
      }
    } catch {
      /* use default message */
    }
    throw new Error(message);
  }

  return res.json() as Promise<StructureResponse>;
}

export type ExportBoqOptions = {
  projectName?: string;
};

function parseContentDispositionFilename(header: string | null): string | null {
  if (!header) return null;
  const match = /filename\*?=(?:UTF-8'')?"?([^";\n]+)"?/i.exec(header);
  return match?.[1]?.trim() ?? null;
}

function defaultExportFilename(sourceFilename: string): string {
  const base = sourceFilename.replace(/\.[^.]+$/, "").trim() || "boq";
  const safe = base.replace(/[<>:"/\\|?*]/g, "_").slice(0, 80);
  return `${safe}_BOQ_export.xlsx`;
}

export async function exportBoqToExcel(
  structured: StructureResponse,
  options?: ExportBoqOptions
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/export/excel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: structured.filename,
      items: structured.items,
      project_name: options?.projectName ?? null,
      summary: structured.summary ?? null,
    }),
  });

  if (!res.ok) {
    let message = `Export failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") {
        message = body.detail;
      } else if (Array.isArray(body.detail)) {
        message = body.detail.map((d: { msg?: string }) => d.msg).join(", ");
      }
    } catch {
      /* use default message */
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const filename =
    parseContentDispositionFilename(res.headers.get("Content-Disposition")) ??
    defaultExportFilename(structured.filename);

  downloadBlob(blob, filename);
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}
