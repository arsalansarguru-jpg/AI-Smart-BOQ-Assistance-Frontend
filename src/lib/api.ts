import { downloadBlob } from "@/lib/download";
import { getClientApiBaseUrl } from "@/lib/backend-url";

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
  category: string | null;
  description: string;
  unit: string | null;
  quantity: number | null;
  rate: number | null;
  amount: number | null;
  remarks: string | null;
  confidence?: number | null;
  original_text?: string | null;
};

export type StructureResponse = {
  filename: string;
  items: BoqLineItem[];
  summary?: string | null;
  warnings?: string[];
  model?: string | null;
  rows_analyzed?: number | null;
};

const API_BASE = {
  toString: () => getClientApiBaseUrl()
} as any as string;

export function getApiBaseUrl(): string {
  return getClientApiBaseUrl();
}

async function fetchWithFallback(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const base = getClientApiBaseUrl();
  const directUrl = `${base}${path}`;

  if (base === "/api/backend") {
    return fetch(directUrl, init);
  }

  try {
    return await fetch(directUrl, init);
  } catch (err) {
    console.warn(`Direct fetch to ${directUrl} failed, falling back to same-origin proxy:`, err);
    if (typeof window !== "undefined") {
      (window as any).__BACKEND_URL__ = "/api/backend";
    }
    const proxyUrl = `/api/backend${path}`;
    return fetch(proxyUrl, init);
  }
}

async function readApiErrorMessage(
  res: Response,
  fallback: string
): Promise<string> {
  const text = await res.text();
  try {
    const body = JSON.parse(text) as {
      detail?: string | { msg?: string }[];
    };
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) {
      return body.detail.map((d) => d.msg).filter(Boolean).join(", ");
    }
  } catch {
    if (/railway/i.test(text) && /not found/i.test(text)) {
      return (
        "Backend API is not deployed on Railway (404). Redeploy the backend service " +
        "(repo root directory: backend) and set API_URL on Vercel to the live service URL."
      );
    }
  }
  return fallback;
}

export async function extractFromFile(
  file: Blob,
  filename: string
): Promise<ExtractResponse> {
  const form = new FormData();
  form.append("file", file, filename);

  const res = await fetchWithFallback(`/api/extract`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    throw new Error(
      await readApiErrorMessage(res, `Extraction failed (${res.status})`)
    );
  }

  return res.json() as Promise<ExtractResponse>;
}

export async function structureExtractedBoq(
  extract: ExtractResponse
): Promise<StructureResponse> {
  const res = await fetchWithFallback(`/api/structure`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: extract.filename,
      tables: extract.tables,
    }),
  });

  if (!res.ok) {
    throw new Error(
      await readApiErrorMessage(res, `Structuring failed (${res.status})`)
    );
  }

  return res.json() as Promise<StructureResponse>;
}

export type QuotationLineItem = {
  item_name: string;
  brand?: string | null;
  unit?: string | null;
  quoted_rate: number;
  normalized_item_name?: string | null;
};

export type QuotationStructureResponse = {
  vendor_name: string;
  quotation_date?: string | null;
  items: QuotationLineItem[];
  confidence: number;
  summary?: string | null;
  warnings?: string[];
};

export async function structureExtractedQuotation(
  extract: ExtractResponse
): Promise<QuotationStructureResponse> {
  const res = await fetchWithFallback(`/api/structure/quotation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: extract.filename,
      tables: extract.tables,
    }),
  });

  if (!res.ok) {
    throw new Error(
      await readApiErrorMessage(res, `Quotation structuring failed (${res.status})`)
    );
  }

  return res.json() as Promise<QuotationStructureResponse>;
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
  const res = await fetchWithFallback(`/api/export/excel`, {
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
    throw new Error(
      await readApiErrorMessage(res, `Export failed (${res.status})`)
    );
  }

  const blob = await res.blob();
  const filename =
    parseContentDispositionFilename(res.headers.get("Content-Disposition")) ??
    defaultExportFilename(structured.filename);

  downloadBlob(blob, filename);
}

export type AutoLinkItemRequest = {
  id: string;
  description: string;
  category?: string | null;
};

export type AutoLinkDrawingRequest = {
  id: string;
  file_name: string;
};

export type AutoLinkRequest = {
  items: AutoLinkItemRequest[];
  drawings: AutoLinkDrawingRequest[];
  make_list_brands: string[];
};

export type AutoLinkMatchResponse = {
  item_id: string;
  drawings: {
    id: string;
    sheetNumber: string;
    title: string;
    fileUrl: string;
  }[];
  makes: {
    brand: string;
    status: string;
  }[];
  notes: string;
};

export type AutoLinkResponse = {
  matches: AutoLinkMatchResponse[];
};

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (typeof window !== "undefined") {
    const customKey = localStorage.getItem("custom_gemini_api_key");
    if (customKey && customKey.trim()) {
      headers["X-Gemini-API-Key"] = customKey.trim();
    }
  }
  return headers;
}

export async function autoLinkProjectFiles(
  payload: AutoLinkRequest
): Promise<AutoLinkResponse> {
  const res = await fetchWithFallback(`/api/sourcing/auto-link`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(
      await readApiErrorMessage(res, `AI Auto-linking failed (${res.status})`)
    );
  }

  return res.json() as Promise<AutoLinkResponse>;
}

export type PriceListMatchRequest = {
  description: string;
  category?: string | null;
  price_lists: string[];
};

export type PriceListMatchResponse = {
  matched: boolean;
  brand?: string | null;
  catalog_code?: string | null;
  list_price?: number | null;
  discount?: number | null;
  matched_description?: string | null;
  notes?: string | null;
};

export async function matchPriceListCatalog(
  payload: PriceListMatchRequest
): Promise<PriceListMatchResponse> {
  const res = await fetchWithFallback(`/api/sourcing/match-price-list`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(
      await readApiErrorMessage(res, `AI Catalog matching failed (${res.status})`)
    );
  }

  return res.json() as Promise<PriceListMatchResponse>;
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await fetchWithFallback(`/health`, { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

