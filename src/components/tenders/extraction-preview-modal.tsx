"use client";

import { useEffect, useState } from "react";
import type { ExtractResponse, StructureResponse, BoqLineItem } from "@/lib/api";
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
  
  // Local state for inline editing
  const [editableItems, setEditableItems] = useState<BoqLineItem[]>([]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Sync local editable state whenever AI structures new items
  useEffect(() => {
    if (structured) {
      setEditableItems(structured.items);
    }
  }, [structured]);

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
    if (!structured || editableItems.length === 0) return;
    setExportError(null);
    setExporting(true);
    try {
      // Export using the edited items
      const payload: StructureResponse = {
        ...structured,
        items: editableItems,
      };
      await exportBoqToExcel(payload, { projectName });
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

  const canExport = structured != null && editableItems.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="extraction-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 transition-all duration-300 scale-100">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-4 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900/50 rounded-t-2xl">
          <div>
            <h2
              id="extraction-title"
              className="text-xl font-bold text-gray-900 dark:text-white"
            >
              {view === "structured" && structured
                ? "Structured BOQ Verification"
                : "Extracted Raw Tables"}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
              {data.filename}
              {data.page_count != null ? ` · ${data.page_count} pages` : ""}
              {data.sheet_count != null ? ` · ${data.sheet_count} sheets` : ""}
              {view === "raw" && tables.length > 0
                ? ` · ${tables.length} table${tables.length === 1 ? "" : "s"}`
                : ""}
              {structured
                ? ` · ${editableItems.length} line item${editableItems.length === 1 ? "" : "s"} group-categorized`
                : ""}
            </p>
            {data.message && view === "raw" ? (
              <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
                {data.message}
              </p>
            ) : null}
            {structured?.summary ? (
              <p className="mt-2 text-sm text-gray-600 dark:text-neutral-300 font-medium">
                AI Summary: <span className="font-normal text-gray-500 dark:text-neutral-400">{structured.summary}</span>
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-3.5 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 shadow-xs cursor-pointer"
          >
            Close
          </button>
        </div>

        {structured ? (
          <div className="flex gap-2 border-b border-gray-200 px-6 py-2 bg-gray-50/20 dark:border-neutral-800 dark:bg-neutral-900/20">
            <button
              type="button"
              onClick={() => setView("raw")}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                view === "raw"
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-neutral-800 dark:text-neutral-300"
              }`}
            >
              Raw Extracted Table
            </button>
            <button
              type="button"
              onClick={() => setView("structured")}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                view === "structured"
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-neutral-800 dark:text-neutral-300"
              }`}
            >
              Structured & Cleaned BOQ
            </button>
          </div>
        ) : null}

        {view === "raw" && tables.length > 1 ? (
          <div className="flex flex-wrap gap-2 border-b border-gray-200 px-6 py-2 dark:border-neutral-800 bg-gray-50/10">
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
                  className={`rounded-lg px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                    i === activeIndex
                      ? "bg-gray-200 text-gray-900 dark:bg-neutral-700 dark:text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-neutral-800 dark:text-neutral-400"
                  }`}
                >
                  {tabLabel}
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
          {view === "structured" && structured ? (
            <StructuredBoqView
              items={editableItems}
              setItems={setEditableItems}
              model={structured.model}
              rowsAnalyzed={structured.rows_analyzed}
              warnings={structured.warnings}
            />
          ) : tables.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-gray-500 dark:text-neutral-400">
                No table data to preview. Try another file or verify database settings.
              </p>
            </div>
          ) : active ? (
            <>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-500">
                {label} · {active.rows.length} rows detected
              </p>
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
                <table className="min-w-full divide-y divide-gray-200 text-left text-xs dark:divide-neutral-800">
                  <tbody className="divide-y divide-gray-100 dark:divide-neutral-900">
                    {active.rows.slice(0, 200).map((row, ri) => (
                      <tr
                        key={ri}
                        className={
                          ri === 0
                            ? "bg-gray-50 font-bold dark:bg-neutral-900 text-gray-900 dark:text-white"
                            : "hover:bg-gray-50/40 dark:hover:bg-neutral-900/30"
                        }
                      >
                        {row.map((cell, ci) => (
                          <td
                            key={ci}
                            className="max-w-[240px] truncate whitespace-nowrap px-4 py-2.5 text-gray-800 dark:text-neutral-200"
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
                <p className="mt-2 text-xs text-gray-500 dark:text-neutral-500">
                  Showing first 200 rows. Use AI structuring to clean and consolidate all lines.
                </p>
              ) : null}
            </>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-200 px-6 py-4 bg-gray-50/50 dark:border-neutral-800 dark:bg-neutral-900/50 rounded-b-2xl sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500 dark:text-neutral-400 max-w-md">
            {view === "structured"
              ? "Verify categories, clean OCR mistakes, and edit values in the grid. Edits automatically sync to your finalized Excel export."
              : "Raw extracted view. Clean formatting inconsistencies, correct OCR errors, and normalize units automatically by triggering AI Structuring."}
          </p>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            {structureError ? (
              <p
                role="alert"
                className="max-w-md text-right text-xs font-medium text-red-600 dark:text-red-400"
              >
                {structureError}
              </p>
            ) : null}
            {exportError ? (
              <p
                role="alert"
                className="max-w-md text-right text-xs font-medium text-red-600 dark:text-red-400"
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
                  className="inline-flex items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  {exporting ? (
                    <>
                      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                      Exporting...
                    </>
                  ) : (
                    "Export Cleaned Excel"
                  )}
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleStructure}
                disabled={structuring || exporting || tables.length === 0}
                className="inline-flex items-center justify-center rounded-lg bg-violet-600 hover:bg-violet-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                {structuring ? (
                  <>
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                    Structuring with AI...
                  </>
                ) : structured ? (
                  "Re-run AI Structuring"
                ) : (
                  "Structure & Normalize with AI"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StructuredBoqView({
  items,
  setItems,
  model,
  rowsAnalyzed,
  warnings = [],
}: {
  items: BoqLineItem[];
  setItems: React.Dispatch<React.SetStateAction<BoqLineItem[]>>;
  model?: string | null;
  rowsAnalyzed?: number | null;
  warnings?: string[];
}) {
  const [editingCell, setEditingCell] = useState<{ index: number; field: keyof BoqLineItem } | null>(null);

  function handleCellChange(index: number, field: keyof BoqLineItem, val: string) {
    const updated = [...items];
    const item = { ...updated[index] };

    if (field === "quantity" || field === "rate" || field === "amount") {
      const numVal = val === "" ? null : parseFloat(val.replace(/,/g, ""));
      (item as any)[field] = numVal;

      // Recalculate amount if quantity or rate was edited
      if (field === "quantity" || field === "rate") {
        const qty = field === "quantity" ? numVal : item.quantity;
        const rate = field === "rate" ? numVal : item.rate;
        if (qty != null && rate != null) {
          item.amount = parseFloat((qty * rate).toFixed(2));
        }
      }
    } else {
      (item as any)[field] = val === "" ? null : val;
    }

    updated[index] = item;
    setItems(updated);
  }

  function handleAddRow() {
    const newItem: BoqLineItem = {
      item_no: "",
      category: "Miscellaneous",
      description: "New Line Item",
      unit: "nr",
      quantity: 1,
      rate: 0,
      amount: 0,
      remarks: "",
    };
    setItems([...items, newItem]);
  }

  function handleDeleteRow(index: number) {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  }

  if (items.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-500 dark:text-neutral-400">
          No BOQ line items were identified. Try structuring a different sheet.
        </p>
        {warnings.length > 0 ? <WarningsList warnings={warnings} /> : null}
      </div>
    );
  }

  // Calculate totals
  const totalVal = items.reduce((sum, item) => sum + (item.amount || 0), 0);

  return (
    <div className="space-y-4">
      {warnings.length > 0 ? <WarningsList warnings={warnings} /> : null}

      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-500">
          Cleaned Line Items
        </h3>
        <button
          type="button"
          onClick={handleAddRow}
          className="inline-flex items-center gap-1 rounded bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 px-2.5 py-1 text-xs font-bold text-gray-700 dark:text-neutral-200 cursor-pointer shadow-xs"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          Add Row
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
        <table className="min-w-full text-left text-xs divide-y divide-gray-200 dark:divide-neutral-800">
          <thead className="bg-gray-50 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:bg-neutral-900/50 dark:text-neutral-400">
            <tr>
              <th className="px-3 py-2.5 w-16">Item No</th>
              <th className="px-3 py-2.5 w-36">Category</th>
              <th className="px-3 py-2.5 min-w-[280px]">Description (OCR Standardized)</th>
              <th className="px-3 py-2.5 w-20">Unit</th>
              <th className="px-3 py-2.5 text-right w-24">Qty</th>
              <th className="px-3 py-2.5 text-right w-24">Rate ($)</th>
              <th className="px-3 py-2.5 text-right w-28">Amount ($)</th>
              <th className="px-3 py-2.5 w-40">Remarks</th>
              <th className="px-3 py-2.5 text-center w-12">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-neutral-900">
            {items.map((item, i) => (
              <tr key={i} className="text-gray-900 dark:text-neutral-100 hover:bg-gray-50/50 dark:hover:bg-neutral-900/20">
                {/* Item No */}
                <td className="px-2.5 py-1.5 whitespace-nowrap">
                  <input
                    type="text"
                    value={item.item_no ?? ""}
                    onChange={(e) => handleCellChange(i, "item_no", e.target.value)}
                    placeholder="—"
                    className="w-full bg-transparent border-0 border-b border-transparent focus:border-violet-500 focus:ring-0 px-1.5 py-0.5 text-xs text-gray-600 dark:text-neutral-400"
                  />
                </td>

                {/* Category */}
                <td className="px-2.5 py-1.5">
                  <input
                    type="text"
                    value={item.category ?? ""}
                    onChange={(e) => handleCellChange(i, "category", e.target.value)}
                    placeholder="Category"
                    className="w-full bg-transparent border-0 border-b border-transparent focus:border-violet-500 focus:ring-0 px-1.5 py-0.5 text-xs font-semibold text-violet-700 dark:text-violet-400"
                  />
                </td>

                {/* Description */}
                <td className="px-2.5 py-1.5">
                  <textarea
                    rows={1}
                    value={item.description}
                    onChange={(e) => handleCellChange(i, "description", e.target.value)}
                    className="w-full bg-transparent border-0 border-b border-transparent focus:border-violet-500 focus:ring-0 px-1.5 py-0.5 text-xs resize-y"
                  />
                </td>

                {/* Unit */}
                <td className="px-2.5 py-1.5 whitespace-nowrap">
                  <input
                    type="text"
                    value={item.unit ?? ""}
                    onChange={(e) => handleCellChange(i, "unit", e.target.value)}
                    placeholder="—"
                    className="w-full bg-transparent border-0 border-b border-transparent focus:border-violet-500 focus:ring-0 px-1.5 py-0.5 text-xs text-center"
                  />
                </td>

                {/* Quantity */}
                <td className="px-2.5 py-1.5 whitespace-nowrap">
                  <input
                    type="text"
                    value={item.quantity ?? ""}
                    onChange={(e) => handleCellChange(i, "quantity", e.target.value)}
                    placeholder="0"
                    className="w-full bg-transparent border-0 border-b border-transparent focus:border-violet-500 focus:ring-0 px-1.5 py-0.5 text-xs text-right font-medium tabular-nums"
                  />
                </td>

                {/* Rate */}
                <td className="px-2.5 py-1.5 whitespace-nowrap">
                  <input
                    type="text"
                    value={item.rate ?? ""}
                    onChange={(e) => handleCellChange(i, "rate", e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-transparent border-0 border-b border-transparent focus:border-violet-500 focus:ring-0 px-1.5 py-0.5 text-xs text-right font-medium tabular-nums"
                  />
                </td>

                {/* Amount */}
                <td className="px-2.5 py-1.5 whitespace-nowrap">
                  <input
                    type="text"
                    value={item.amount ?? ""}
                    onChange={(e) => handleCellChange(i, "amount", e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-transparent border-0 border-b border-transparent focus:border-violet-500 focus:ring-0 px-1.5 py-0.5 text-xs text-right font-bold text-gray-900 dark:text-white tabular-nums bg-gray-50/30 dark:bg-neutral-900/30"
                  />
                </td>

                {/* Remarks */}
                <td className="px-2.5 py-1.5">
                  <input
                    type="text"
                    value={item.remarks ?? ""}
                    onChange={(e) => handleCellChange(i, "remarks", e.target.value)}
                    placeholder="Add remarks..."
                    className="w-full bg-transparent border-0 border-b border-transparent focus:border-violet-500 focus:ring-0 px-1.5 py-0.5 text-xs text-gray-500"
                  />
                </td>

                {/* Delete button */}
                <td className="px-2.5 py-1.5 text-center whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleDeleteRow(i)}
                    className="p-1 rounded-md text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30 dark:hover:text-red-400 cursor-pointer"
                    title="Delete Row"
                  >
                    <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.8"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
            {/* Total Row */}
            <tr className="bg-gray-50/50 dark:bg-neutral-900/30 font-bold border-t border-gray-200 dark:border-neutral-800">
              <td colSpan={6} className="px-4 py-3 text-right text-gray-500 dark:text-neutral-400">
                Sum Total
              </td>
              <td className="px-4 py-3 text-right text-base text-gray-900 dark:text-white tabular-nums">
                ${formatNumber(totalVal)}
              </td>
              <td colSpan={2}></td>
            </tr>
          </tbody>
        </table>
      </div>

      {model ? (
        <p className="text-xs text-gray-400 dark:text-neutral-500 flex items-center justify-between">
          <span>AI Model: {model} {rowsAnalyzed != null ? `· Analyzed ${rowsAnalyzed} raw rows` : ""}</span>
          <span className="font-semibold text-violet-600 dark:text-violet-400">✓ Normalized & Structured</span>
        </p>
      ) : null}
    </div>
  );
}

function WarningsList({ warnings }: { warnings: string[] }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-300">
      <div className="flex gap-2">
        <svg className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <ul className="list-inside list-disc space-y-1">
          {warnings.map((w, i) => (
            <li key={i} className="text-xs">{w}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
