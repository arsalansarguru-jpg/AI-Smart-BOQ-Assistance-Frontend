"use client";

import { useState, useEffect, useMemo } from "react";
import {
  extractFromFile,
  structureExtractedQuotation,
  QuotationLineItem
} from "@/lib/api";
import {
  fetchVendorQuotations,
  saveVendorQuotation,
  deleteVendorQuotation,
  LocalVendorQuotation
} from "@/lib/tenders/quotations";

export default function VendorQuotationsPage() {
  const [quotations, setQuotations] = useState<LocalVendorQuotation[]>([]);
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"timeline" | "comparison">("timeline");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNormalizedItem, setSelectedNormalizedItem] = useState<string | null>(null);
  
  // Upload and parsing states
  const [uploading, setUploading] = useState(false);
  const [processingStep, setProcessingStep] = useState<
    "" | "extracting" | "structuring" | "normalizing" | "storing" | "completed"
  >("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [expandedQuotationId, setExpandedQuotationId] = useState<string | null>(null);

  const loadQuotations = async () => {
    setLoading(true);
    try {
      const res = await fetchVendorQuotations();
      setQuotations(res.quotations);
      setIsLocalMode(res.isLocalMode);
      
      // Auto-select the first normalized item if available
      if (res.quotations.length > 0) {
        const firstItem = res.quotations[0].items[0];
        if (firstItem && !selectedNormalizedItem) {
          setSelectedNormalizedItem(firstItem.normalized_item_name);
        }
      }
    } catch (err) {
      console.error("Failed to load quotations", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuotations();
  }, []);

  // Group items by their normalized names for the Price Comparison Matrix
  const normalizedGroups = useMemo(() => {
    const groups: Record<
      string,
      {
        normalized_item_name: string;
        items: {
          quotation_id: string;
          vendor_name: string;
          quotation_date: string;
          original_item_name: string;
          brand?: string | null;
          unit?: string | null;
          quoted_rate: number;
          isLocalOnly?: boolean;
        }[];
      }
    > = {};

    for (const q of quotations) {
      for (const item of q.items) {
        const normName = item.normalized_item_name.toLowerCase().trim();
        if (!groups[normName]) {
          groups[normName] = {
            normalized_item_name: item.normalized_item_name,
            items: []
          };
        }
        groups[normName].items.push({
          quotation_id: q.id,
          vendor_name: q.vendor_name,
          quotation_date: q.quotation_date,
          original_item_name: item.item_name,
          brand: item.brand,
          unit: item.unit,
          quoted_rate: item.quoted_rate,
          isLocalOnly: q.isLocalOnly
        });
      }
    }
    return groups;
  }, [quotations]);

  // Filtered keys of the normalized items
  const filteredGroupKeys = useMemo(() => {
    const keys = Object.keys(normalizedGroups);
    if (!searchQuery.trim()) return keys;
    const q = searchQuery.toLowerCase();
    return keys.filter((k) => k.includes(q));
  }, [normalizedGroups, searchQuery]);

  // Set default selected normalized item when tab changes or search resolves
  useEffect(() => {
    if (filteredGroupKeys.length > 0) {
      if (!selectedNormalizedItem || !filteredGroupKeys.includes(selectedNormalizedItem.toLowerCase().trim())) {
        // Find matching key case
        const matched = Object.values(normalizedGroups).find(
          (g) => g.normalized_item_name.toLowerCase().trim() === filteredGroupKeys[0]
        );
        if (matched) {
          setSelectedNormalizedItem(matched.normalized_item_name);
        }
      }
    } else {
      setSelectedNormalizedItem(null);
    }
  }, [filteredGroupKeys, normalizedGroups]);

  // Check if this rate matches a duplicate quote
  const checkIsDuplicate = (
    vendor: string,
    brand: string | null | undefined,
    rate: number,
    date: string,
    index: number,
    groupItems: any[]
  ) => {
    return groupItems.some(
      (other, idx) =>
        idx !== index &&
        other.vendor_name.toLowerCase() === vendor.toLowerCase() &&
        (other.brand ?? "") === (brand ?? "") &&
        other.quoted_rate === rate &&
        other.quotation_date === date
    );
  };

  // Find the latest quotation date for a vendor to power the glowing indicator
  const getLatestQuotationDateForVendor = (vendor: string) => {
    const dates = quotations
      .filter((q) => q.vendor_name.toLowerCase() === vendor.toLowerCase())
      .map((q) => q.quotation_date);
    if (dates.length === 0) return "";
    return dates.sort().reverse()[0];
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    setUploading(true);
    setUploadError(null);
    setProcessingStep("extracting");

    try {
      // Step 1: Extract tables from the document
      const extractRes = await extractFromFile(file, file.name);

      // Step 2: Use Gemini AI to structure the invoice/quotation
      setProcessingStep("structuring");
      const structureRes = await structureExtractedQuotation(extractRes);

      // Step 3: Run Gemini Normalization prompts
      setProcessingStep("normalizing");
      const dbItems = structureRes.items.map((it) => ({
        item_name: it.item_name,
        brand: it.brand ?? null,
        unit: it.unit ?? null,
        quoted_rate: it.quoted_rate,
        normalized_item_name: it.normalized_item_name || it.item_name.toLowerCase().trim()
      }));

      // Step 4: Save quotation in database/localStorage
      setProcessingStep("storing");
      await saveVendorQuotation(
        file.name,
        structureRes.vendor_name || "Unknown",
        structureRes.quotation_date || new Date().toISOString().split("T")[0],
        dbItems
      );

      setProcessingStep("completed");
      await loadQuotations();

      setTimeout(() => {
        setUploading(false);
        setProcessingStep("");
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || "An error occurred during quotation parsing.");
      setUploading(false);
      setProcessingStep("");
    }
  };

  const handleDelete = async (id: string, isLocalOnly: boolean) => {
    if (!confirm("Are you sure you want to delete this quotation?")) return;
    try {
      await deleteVendorQuotation(id, !!isLocalOnly);
      await loadQuotations();
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  // Compute comparison stats for the currently selected item
  const comparisonStats = useMemo(() => {
    if (!selectedNormalizedItem) return null;
    const group = normalizedGroups[selectedNormalizedItem.toLowerCase().trim()];
    if (!group || group.items.length === 0) return null;

    const rates = group.items.map((it) => it.quoted_rate);
    const min = Math.min(...rates);
    const max = Math.max(...rates);
    const avg = rates.reduce((a, b) => a + b, 0) / rates.length;

    return { min, max, avg };
  }, [selectedNormalizedItem, normalizedGroups]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-8 sm:px-10">
      {/* Header section */}
      <div className="mb-8 flex flex-col justify-between gap-4 border-b border-gray-100 pb-5 dark:border-neutral-800 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Vendor Quotations
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
            Intelligent material rate extraction, normalization, and side-by-side comparison
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5 dark:bg-neutral-800">
          <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
          <span className="text-xs font-medium text-gray-600 dark:text-neutral-300">
            Quotation Intelligence
          </span>
        </div>
      </div>

      {/* Self-healing alert banner if running in local storage fallback */}
      {isLocalMode && (
        <div className="mb-6 rounded-xl border border-amber-200/50 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="flex gap-3">
            <svg
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Running in Local Cache Mode
              </h3>
              <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-400/85">
                The database tables for quotations do not exist in your Supabase schema yet. The system has automatically activated its local cache mode. All parsed quotations are saved safely in your browser.
              </p>
              <p className="mt-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                To sync to database: Run the SQL DDL script located at <code className="bg-amber-100/50 px-1 py-0.5 rounded text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">supabase/vendor_quotations.sql</code> in your Supabase SQL Editor.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab switches */}
      <div className="mb-6 flex border-b border-gray-200 dark:border-neutral-800">
        <button
          onClick={() => setActiveTab("timeline")}
          className={`border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === "timeline"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-neutral-400 dark:hover:text-white"
          }`}
        >
          Upload & History
        </button>
        <button
          onClick={() => setActiveTab("comparison")}
          className={`border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === "comparison"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-neutral-400 dark:hover:text-white"
          }`}
        >
          Price Comparison Cockpit
        </button>
      </div>

      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center">
          <svg className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="mt-2 text-sm text-gray-500 dark:text-neutral-400">Loading quotations...</span>
        </div>
      ) : activeTab === "timeline" ? (
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Upload Zone */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white mb-4">
                Upload New Quotation
              </h2>

              {!uploading ? (
                <label className="group flex h-48 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 transition hover:bg-gray-100 dark:border-neutral-700 dark:bg-neutral-800/40 dark:hover:bg-neutral-800/80">
                  <div className="flex flex-col items-center justify-center pb-6 pt-5">
                    <svg
                      className="mb-3 h-10 w-10 text-gray-400 group-hover:scale-110 transition duration-200"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="1.6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="mb-1 text-sm font-semibold text-gray-700 dark:text-neutral-300">
                      Drag & drop quotation
                    </p>
                    <p className="text-xs text-gray-500 dark:text-neutral-400">
                      PDF, XLS, XLSX up to 50MB
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.xls,.xlsx"
                    onChange={handleFileUpload}
                  />
                </label>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  {/* Glowing spinner orb */}
                  <div className="relative mb-6 flex h-16 w-16 items-center justify-center">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500 text-white shadow">
                      <svg className="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </span>
                  </div>

                  {/* Checklist loader */}
                  <div className="w-full space-y-3 px-4">
                    <ChecklistItem
                      label="Extracting PDF/Excel tables..."
                      active={processingStep === "extracting"}
                      done={
                        processingStep !== "extracting" &&
                        processingStep !== ""
                      }
                    />
                    <ChecklistItem
                      label="Structuring raw rows..."
                      active={processingStep === "structuring"}
                      done={
                        processingStep !== "extracting" &&
                        processingStep !== "structuring" &&
                        processingStep !== ""
                      }
                    />
                    <ChecklistItem
                      label="Normalizing names via Gemini..."
                      active={processingStep === "normalizing"}
                      done={
                        processingStep === "storing" ||
                        processingStep === "completed"
                      }
                    />
                    <ChecklistItem
                      label="Indexing pricing into database..."
                      active={processingStep === "storing"}
                      done={processingStep === "completed"}
                    />
                  </div>
                </div>
              )}

              {uploadError && (
                <div className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/20 dark:text-red-400">
                  <p className="font-semibold">Error parsing quotation:</p>
                  <p className="mt-0.5">{uploadError}</p>
                </div>
              )}
            </div>
          </div>

          {/* History Timeline */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white mb-2">
              Quotation History Timeline
            </h2>

            {quotations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center dark:border-neutral-800 dark:bg-neutral-900">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 7.5h1.5m-1.5 3h1.5m-7.5-6h7.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z"
                  />
                </svg>
                <p className="mt-4 text-sm font-medium text-gray-900 dark:text-white">
                  No quotation sheets processed yet
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-neutral-400">
                  Upload a vendor PDF or Excel price sheet to start extracting rates.
                </p>
              </div>
            ) : (
              quotations.map((q) => {
                const isExpanded = expandedQuotationId === q.id;
                return (
                  <div
                    key={q.id}
                    className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-gray-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                        <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400">
                          <svg
                            className="h-6 w-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth="1.6"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                            />
                          </svg>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {q.vendor_name}
                            </h3>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                              {q.items.length} materials
                            </span>
                            {q.isLocalOnly && (
                              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                local mode
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 truncate max-w-sm sm:max-w-md" title={q.file_name}>
                            {q.file_name}
                          </p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-neutral-400">
                            Quoted: <span className="font-medium">{q.quotation_date}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExpandedQuotationId(isExpanded ? null : q.id)}
                          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                        >
                          <svg
                            className={`h-5 w-5 transform transition-transform duration-200 ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(q.id, !!q.isLocalOnly)}
                          className="rounded-lg p-2 text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
                          title="Delete Quotation"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Expandable items preview */}
                    {isExpanded && (
                      <div className="mt-4 border-t border-gray-100 pt-4 dark:border-neutral-800">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-gray-100 text-gray-400 dark:border-neutral-800 uppercase tracking-wider font-semibold">
                                <th className="pb-2">Material Item (Original)</th>
                                <th className="pb-2">Brand</th>
                                <th className="pb-2">Unit</th>
                                <th className="pb-2 text-right">Quoted Rate</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-neutral-800/50">
                              {q.items.map((item) => (
                                <tr key={item.id} className="text-gray-700 dark:text-neutral-300">
                                  <td className="py-2.5 max-w-xs truncate" title={item.item_name}>
                                    {item.item_name}
                                  </td>
                                  <td className="py-2.5 text-gray-500 dark:text-neutral-400">
                                    {item.brand || "—"}
                                  </td>
                                  <td className="py-2.5 text-gray-500 dark:text-neutral-400">
                                    {item.unit || "—"}
                                  </td>
                                  <td className="py-2.5 text-right font-semibold text-gray-900 dark:text-white">
                                    ₹{item.quoted_rate.toLocaleString("en-IN")}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* Price Comparison Matrix Workspace */
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Material Suggestion Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Search materials (e.g. cable, pipe)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 pl-10 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-850 dark:text-white"
                />
                <svg
                  className="absolute left-3.5 top-3 h-4 w-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-1">
                {filteredGroupKeys.length === 0 ? (
                  <p className="text-center text-xs text-gray-400 py-4">No matching materials found.</p>
                ) : (
                  filteredGroupKeys.map((key) => {
                    const group = normalizedGroups[key];
                    const active = selectedNormalizedItem?.toLowerCase().trim() === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedNormalizedItem(group.normalized_item_name)}
                        className={`w-full text-left rounded-xl px-4 py-3 text-sm font-medium transition flex items-center justify-between ${
                          active
                            ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300"
                            : "hover:bg-gray-50 text-gray-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                        }`}
                      >
                        <span className="truncate pr-2 capitalize">{group.normalized_item_name}</span>
                        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500 dark:bg-neutral-800 dark:text-neutral-400">
                          {group.items.length} rates
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Comparison Side-by-side Pane */}
          <div className="lg:col-span-2 space-y-6">
            {selectedNormalizedItem && normalizedGroups[selectedNormalizedItem.toLowerCase().trim()] ? (
              <>
                {/* Selected Item Stats Summary */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Comparing Rates For
                  </span>
                  <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white capitalize mt-0.5">
                    {selectedNormalizedItem}
                  </h2>

                  {comparisonStats && (
                    <div className="mt-5 grid grid-cols-3 gap-4 border-t border-gray-100 pt-5 dark:border-neutral-800">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                          Lowest Rate
                        </div>
                        <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                          ₹{comparisonStats.min.toLocaleString("en-IN")}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                          Average Rate
                        </div>
                        <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                          ₹{Math.round(comparisonStats.avg).toLocaleString("en-IN")}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                          Highest Rate
                        </div>
                        <div className="text-lg font-bold text-red-500">
                          ₹{comparisonStats.max.toLocaleString("en-IN")}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Side-by-Side Vendor Quotation Table */}
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:border-neutral-800 dark:bg-neutral-850 dark:text-neutral-400">
                          <th className="px-6 py-4">Vendor</th>
                          <th className="px-6 py-4">Quotation Date</th>
                          <th className="px-6 py-4">Original Description / Brand</th>
                          <th className="px-6 py-4 text-right">Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-neutral-800/50">
                        {normalizedGroups[selectedNormalizedItem.toLowerCase().trim()].items.map((rate, index, all) => {
                          const latestDate = getLatestQuotationDateForVendor(rate.vendor_name);
                          const isLatest = rate.quotation_date === latestDate;
                          
                          // Duplicate Quote warning if same vendor, brand, rate, date uploaded twice
                          const isDuplicate = checkIsDuplicate(
                            rate.vendor_name,
                            rate.brand,
                            rate.quoted_rate,
                            rate.quotation_date,
                            index,
                            all
                          );

                          // Cheapest tag highlighting
                          const isCheapest = rate.quoted_rate === comparisonStats?.min;

                          return (
                            <tr
                              key={`${rate.quotation_id}-${index}`}
                              className={`transition ${
                                isCheapest
                                  ? "bg-emerald-50/20 dark:bg-emerald-950/10"
                                  : isDuplicate
                                  ? "bg-red-50/20 dark:bg-red-950/10"
                                  : "hover:bg-gray-50/50 dark:hover:bg-neutral-800/30"
                              }`}
                            >
                              <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                                <div className="flex items-center gap-2">
                                  {rate.vendor_name}
                                  {/* glowing dot latest indicators */}
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                                      isLatest
                                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                                        : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                                    }`}
                                  >
                                    <span
                                      className={`h-1 w-1 rounded-full ${
                                        isLatest ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                                      }`}
                                    />
                                    {isLatest ? "Latest" : "Older"}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-xs text-gray-500 dark:text-neutral-400">
                                {rate.quotation_date}
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-xs text-gray-800 dark:text-neutral-200">
                                  {rate.original_item_name}
                                </div>
                                <div className="mt-1 flex items-center gap-2">
                                  {rate.brand && (
                                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold text-gray-500 dark:bg-neutral-800 dark:text-neutral-400">
                                      Brand: {rate.brand}
                                    </span>
                                  )}
                                  {rate.unit && (
                                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold text-gray-500 dark:bg-neutral-800 dark:text-neutral-400">
                                      Unit: {rate.unit}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex flex-col items-end gap-1">
                                  <span
                                    className={`text-base font-bold ${
                                      isCheapest ? "text-emerald-600 dark:text-emerald-400" : "text-gray-900 dark:text-white"
                                    }`}
                                  >
                                    ₹{rate.quoted_rate.toLocaleString("en-IN")}
                                  </span>
                                  {isCheapest && (
                                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                      Cheapest Rate
                                    </span>
                                  )}
                                  
                                  {/* Duplicate warning flags */}
                                  {isDuplicate && (
                                    <span
                                      className="flex items-center gap-1 text-[9px] font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/40 px-1.5 py-0.5 rounded"
                                      title="This vendor submitted the identical material item and rate on the same date."
                                    >
                                      ⚠ Duplicate Quote Detected
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center dark:border-neutral-800 dark:bg-neutral-900">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
                <p className="mt-4 text-sm font-medium text-gray-900 dark:text-white">
                  No materials indexed for comparison
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-neutral-400">
                  Please upload vendor quotations under the History tab first.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function ChecklistItem({
  label,
  active,
  done
}: {
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 transition duration-200 ${
        done ? "text-emerald-600 dark:text-emerald-400" : active ? "text-indigo-600 dark:text-indigo-400 font-semibold" : "text-gray-400"
      }`}
    >
      {done ? (
        <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
        </svg>
      ) : active ? (
        <svg className="h-5 w-5 shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : (
        <span className="h-2 w-2 rounded-full bg-gray-300 dark:bg-neutral-700 ml-1.5 shrink-0" />
      )}
      <span className="text-xs">{label}</span>
    </div>
  );
}
