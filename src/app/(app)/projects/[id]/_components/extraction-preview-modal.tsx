"use client";

import { useEffect, useState } from "react";
import type { ExtractResponse, StructureResponse } from "@/lib/api";
import { exportBoqToExcel, structureExtractedBoq } from "@/lib/api";

type ViewMode = "raw" | "structured";

function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "";
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export default function ExtractionPreviewModal({
  data,
  projectName,
  onClose,
}: {
  data: ExtractResponse;
  projectName?: string;
  onClose: () => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [view, setView] = useState<ViewMode>("raw");
  const [structuring, setStructuring] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [structureError, setStructureError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [structured, setStructured] = useState<StructureResponse | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const tables = data.tables;
  const active = tables[activeIndex];

  const label =
    active?.sheet != null
      ? `Sheet: ${active.sheet}`
      : active?.page != null
        ? `Page ${active.page}`
        : `Table ${activeIndex + 1}`;

  async function handleStructure() {
    if (tables.length === 0) return;
    setStructureError(null);
    setStructuring(true);
    try {
      const result = await structureExtractedBoq(data);
      setStructured(result);
      setView("structured");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Structuring failed.";
      if (
        message.includes("fetch") ||
        message.includes("Failed to fetch") ||
        message.includes("NetworkError")
      ) {
        setStructureError(
          "Cannot reach API. Start the backend on port 8000 and set GEMINI_API_KEY in backend/.env."
        );
      } else {
        setStructureError(message);
      }
    } finally {
      setStructuring(false);
    }
  }

  async function handleExport() {
    if (!structured || structured.items.length === 0) return;
    setExportError(null);
    setExporting(true);
    try {
      await exportBoqToExcel(structured, { projectName });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Export failed.";
      if (
        message.includes("fetch") ||
        message.includes("Failed to fetch") ||
        message.includes("NetworkError")
      ) {
        setExportError(
          "Cannot reach API. Start the backend on port 8000, then try again."
        );
      } else {
        setExportError(message);
      }
    } finally {
      setExporting(false);
    }
  }

  const canExport = structured != null && structured.items.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="extraction-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-xl border border-gray-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-neutral-800">
          <div>
            <h2
              id="extraction-title"
              className="text-lg font-semibold text-gray-900 dark:text-white"
            >
              {view === "structured" && structured
                ? "Structured BOQ"
                : "Extracted tables"}
            </h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-neutral-400">
              {data.filename}
              {data.page_count != null ? ` · ${data.page_count} pages` : ""}
              {data.sheet_count != null ? ` · ${data.sheet_count} sheets` : ""}
              {view === "raw" && tables.length > 0
                ? ` · ${tables.length} table${tables.length === 1 ? "" : "s"}`
                : ""}
              {structured
                ? ` · ${structured.items.length} line item${structured.items.length === 1 ? "" : "s"}`
                : ""}
            </p>
            {data.message && view === "raw" ? (
              <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                {data.message}
              </p>
            ) : null}
            {structured?.summary ? (
              <p className="mt-2 text-sm text-gray-600 dark:text-neutral-300">
                {structured.summary}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            Close
          </button>
        </div>

        {structured ? (
          <div className="flex gap-2 border-b border-gray-200 px-5 py-2 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setView("raw")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                view === "raw"
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-neutral-800 dark:text-neutral-300"
              }`}
            >
              Raw extraction
            </button>
            <button
              type="button"
              onClick={() => setView("structured")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                view === "structured"
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-neutral-800 dark:text-neutral-300"
              }`}
            >
              Structured BOQ
            </button>
          </div>
        ) : null}

        {view === "raw" && tables.length > 1 ? (
          <div className="flex flex-wrap gap-2 border-b border-gray-200 px-5 py-2 dark:border-neutral-800">
            {tables.map((t, i) => {
              const tabLabel =
                t.sheet != null
                  ? t.sheet
                  : t.page != null
                    ? `Page ${t.page}`
                    : `Table ${i + 1}`;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                    i === activeIndex
                      ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-neutral-800 dark:text-neutral-300"
                  }`}
                >
                  {tabLabel}
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-auto p-5">
          {view === "structured" && structured ? (
            <StructuredBoqView data={structured} />
          ) : tables.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-neutral-400">
              No table data to preview. Try another file or check the PDF
              layout.
            </p>
          ) : active ? (
            <>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-neutral-500">
                {label} · {active.rows.length} rows
              </p>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-neutral-700">
                <table className="min-w-full divide-y divide-gray-200 text-left text-xs dark:divide-neutral-700">
                  <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                    {active.rows.slice(0, 200).map((row, ri) => (
                      <tr
                        key={ri}
                        className={
                          ri === 0
                            ? "bg-gray-50 font-medium dark:bg-neutral-800/80"
                            : ""
                        }
                      >
                        {row.map((cell, ci) => (
                          <td
                            key={ci}
                            className="max-w-[240px] truncate whitespace-nowrap px-3 py-2 text-gray-900 dark:text-neutral-100"
                            title={cell ?? ""}
                          >
                            {cell ?? ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {active.rows.length > 200 ? (
                <p className="mt-2 text-xs text-gray-500 dark:text-neutral-400">
                  Showing first 200 rows. Use Structure with AI for a cleaned
                  line-item list.
                </p>
              ) : null}
            </>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-200 px-5 py-3 dark:border-neutral-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500 dark:text-neutral-400">
            {view === "structured"
              ? "AI-assisted BOQ — review line items, then export to Excel."
              : "Raw extraction — use Structure with AI to map rows to standard BOQ columns."}
          </p>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            {structureError ? (
              <p
                role="alert"
                className="max-w-md text-right text-xs text-red-600 dark:text-red-400"
              >
                {structureError}
              </p>
            ) : null}
            {exportError ? (
              <p
                role="alert"
                className="max-w-md text-right text-xs text-red-600 dark:text-red-400"
              >
                {exportError}
              </p>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
              {canExport ? (
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={exporting || structuring}
                  className="inline-flex items-center justify-center rounded-md border border-emerald-700 bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                >
                  {exporting ? "Exporting..." : "Export to Excel"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleStructure}
                disabled={structuring || exporting || tables.length === 0}
                className="inline-flex items-center justify-center rounded-md border border-violet-700 bg-violet-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-violet-500 dark:bg-violet-600 dark:hover:bg-violet-700"
              >
                {structuring
                  ? "Structuring with AI..."
                  : structured
                    ? "Re-run AI structuring"
                    : "Structure with AI"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StructuredBoqView({ data }: { data: StructureResponse }) {
  const warnings = data.warnings ?? [];

  if (data.items.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-500 dark:text-neutral-400">
          No BOQ line items were identified. Try raw extraction on a different
          sheet or file.
        </p>
        {warnings.length > 0 ? <WarningsList warnings={warnings} /> : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {warnings.length > 0 ? <WarningsList warnings={warnings} /> : null}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-neutral-700">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-gray-50 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:bg-neutral-800 dark:text-neutral-400">
            <tr>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2">Section</th>
              <th className="min-w-[200px] px-3 py-2">Description</th>
              <th className="px-3 py-2">Unit</th>
              <th className="px-3 py-2 text-right">Qty</th>
              <th className="px-3 py-2 text-right">Rate</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
            {data.items.map((item, i) => (
              <tr key={i} className="text-gray-900 dark:text-neutral-100">
                <td className="whitespace-nowrap px-3 py-2 text-gray-500 dark:text-neutral-400">
                  {item.item_no ?? "—"}
                </td>
                <td className="max-w-[120px] truncate px-3 py-2 text-gray-600 dark:text-neutral-300">
                  {item.section ?? "—"}
                </td>
                <td className="px-3 py-2">{item.description}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  {item.unit ?? "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                  {formatNumber(item.quantity) || "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                  {formatNumber(item.rate) || "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                  {formatNumber(item.amount) || "—"}
                </td>
                <td className="max-w-[160px] truncate px-3 py-2 text-gray-500 dark:text-neutral-400">
                  {item.remarks ?? ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.model ? (
        <p className="text-xs text-gray-400 dark:text-neutral-500">
          Model: {data.model}
          {data.rows_analyzed != null
            ? ` · ${data.rows_analyzed} rows analyzed`
            : ""}
        </p>
      ) : null}
    </div>
  );
}

function WarningsList({ warnings }: { warnings: string[] }) {
  return (
    <ul className="list-inside list-disc space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
      {warnings.map((w, i) => (
        <li key={i}>{w}</li>
      ))}
    </ul>
  );
}
