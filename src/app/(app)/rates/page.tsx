"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { fetchVendorQuotations, LocalVendorQuotation, saveVendorQuotation } from "@/lib/tenders/quotations";
import { extractFromFile, structureExtractedQuotation } from "@/lib/api";
import { toast } from "sonner";

type ProjectUsage = {
  project_name: string;
  city: string;
  qty: number;
  rate: number;
  date: string;
};

type VendorRate = {
  vendor_name: string;
  brand: string;
  rate: number;
  date: string;
  unit: string;
};

type MaterialRateIntel = {
  id: string;
  item_name: string;
  category: string;
  base_unit: string;
  historical_prices: { month: string; rate: number }[];
  project_usage: ProjectUsage[];
  city_pricing: { city: string; rate: number; index: number }[];
  vendor_rates: VendorRate[];
};

const MASTER_RATES_DATABASE: MaterialRateIntel[] = [
  {
    id: "m-1",
    item_name: "copper cable 3 core 2.5mm",
    category: "Electrical",
    base_unit: "mtr",
    historical_prices: [
      { month: "Dec", rate: 130 },
      { month: "Jan", rate: 132 },
      { month: "Feb", rate: 135 },
      { month: "Mar", rate: 138 },
      { month: "Apr", rate: 142 },
      { month: "May", rate: 145 },
    ],
    project_usage: [
      { project_name: "Alpha IT Towers Phase 2", city: "Mumbai", qty: 1200, rate: 142, date: "2026-04-15" },
      { project_name: "Signature Residential Suites", city: "Bangalore", qty: 800, rate: 138, date: "2026-02-10" },
      { project_name: "Delta MEP Metro Station", city: "Delhi", qty: 3500, rate: 130, date: "2025-12-05" },
    ],
    city_pricing: [
      { city: "Mumbai", rate: 145, index: 1.00 },
      { city: "Delhi", rate: 141, index: 0.97 },
      { city: "Bangalore", rate: 143, index: 0.98 },
      { city: "Chennai", rate: 140, index: 0.96 },
      { city: "Dubai", rate: 170, index: 1.17 },
    ],
    vendor_rates: [
      { vendor_name: "Havells", brand: "Havells", rate: 145, date: "2026-05-15", unit: "mtr" },
      { vendor_name: "Anchor", brand: "Anchor", rate: 138, date: "2026-05-10", unit: "mtr" },
      { vendor_name: "Polycab", brand: "Polycab", rate: 142, date: "2026-05-12", unit: "mtr" },
    ]
  },
  {
    id: "m-2",
    item_name: "copper armoured cable 4 core 16mm",
    category: "Electrical",
    base_unit: "mtr",
    historical_prices: [
      { month: "Dec", rate: 395 },
      { month: "Jan", rate: 398 },
      { month: "Feb", rate: 405 },
      { month: "Mar", rate: 410 },
      { month: "Apr", rate: 415 },
      { month: "May", rate: 420 },
    ],
    project_usage: [
      { project_name: "Lodha World Towers", city: "Mumbai", qty: 650, rate: 415, date: "2026-04-01" },
      { project_name: "RMZ Ecoworld Wing C", city: "Bangalore", qty: 1500, rate: 405, date: "2026-02-20" },
    ],
    city_pricing: [
      { city: "Mumbai", rate: 420, index: 1.00 },
      { city: "Delhi", rate: 412, index: 0.98 },
      { city: "Bangalore", rate: 418, index: 0.99 },
      { city: "Chennai", rate: 408, index: 0.97 },
      { city: "Dubai", rate: 485, index: 1.15 },
    ],
    vendor_rates: [
      { vendor_name: "Havells", brand: "Havells", rate: 420, date: "2026-05-15", unit: "mtr" },
      { vendor_name: "Anchor", brand: "Anchor", rate: 412, date: "2026-05-10", unit: "mtr" },
      { vendor_name: "Finolex", brand: "Finolex", rate: 415, date: "2026-05-08", unit: "mtr" },
    ]
  },
  {
    id: "m-3",
    item_name: "pvc conduit pipe 25mm",
    category: "Electrical",
    base_unit: "mtr",
    historical_prices: [
      { month: "Dec", rate: 35 },
      { month: "Jan", rate: 36 },
      { month: "Feb", rate: 36.5 },
      { month: "Mar", rate: 37 },
      { month: "Apr", rate: 37.5 },
      { month: "May", rate: 38 },
    ],
    project_usage: [
      { project_name: "Delta MEP Metro Station", city: "Delhi", qty: 12000, rate: 35, date: "2025-12-05" },
      { project_name: "Alpha IT Towers Phase 2", city: "Mumbai", qty: 4500, rate: 37.5, date: "2026-04-15" },
    ],
    city_pricing: [
      { city: "Mumbai", rate: 38, index: 1.00 },
      { city: "Delhi", rate: 36.5, index: 0.96 },
      { city: "Bangalore", rate: 37.2, index: 0.98 },
      { city: "Chennai", rate: 36.0, index: 0.95 },
      { city: "Dubai", rate: 44.0, index: 1.16 },
    ],
    vendor_rates: [
      { vendor_name: "Polycab", brand: "Polycab", rate: 38, date: "2026-05-12", unit: "mtr" },
      { vendor_name: "Anchor", brand: "Anchor", rate: 41, date: "2026-05-10", unit: "mtr" },
    ]
  },
  {
    id: "m-4",
    item_name: "copper pipe 25mm",
    category: "HVAC",
    base_unit: "mtr",
    historical_prices: [
      { month: "Dec", rate: 410 },
      { month: "Jan", rate: 412 },
      { month: "Feb", rate: 418 },
      { month: "Mar", rate: 422 },
      { month: "Apr", rate: 425 },
      { month: "May", rate: 430 },
    ],
    project_usage: [
      { project_name: "L&T Business Park HVAC", city: "Mumbai", qty: 850, rate: 425, date: "2026-04-10" },
      { project_name: "Brigade Tech Gardens VRF", city: "Bangalore", qty: 1400, rate: 418, date: "2026-02-15" },
    ],
    city_pricing: [
      { city: "Mumbai", rate: 430, index: 1.00 },
      { city: "Delhi", rate: 422, index: 0.98 },
      { city: "Bangalore", rate: 426, index: 0.99 },
      { city: "Chennai", rate: 419, index: 0.97 },
      { city: "Dubai", rate: 495, index: 1.15 },
    ],
    vendor_rates: [
      { vendor_name: "Daikin", brand: "Daikin", rate: 430, date: "2026-05-14", unit: "mtr" },
      { vendor_name: "Mandev", brand: "Mandev", rate: 422, date: "2026-05-09", unit: "mtr" },
    ]
  },
  {
    id: "m-5",
    item_name: "gi pipe 50mm heavy duty",
    category: "Plumbing",
    base_unit: "mtr",
    historical_prices: [
      { month: "Dec", rate: 580 },
      { month: "Jan", rate: 585 },
      { month: "Feb", rate: 590 },
      { month: "Mar", rate: 595 },
      { month: "Apr", rate: 605 },
      { month: "May", rate: 610 },
    ],
    project_usage: [
      { project_name: "Alpha IT Towers Phase 2", city: "Mumbai", qty: 350, rate: 605, date: "2026-04-15" },
      { project_name: "Signature Residential Suites", city: "Bangalore", qty: 220, rate: 590, date: "2026-02-10" },
    ],
    city_pricing: [
      { city: "Mumbai", rate: 610, index: 1.00 },
      { city: "Delhi", rate: 598, index: 0.98 },
      { city: "Bangalore", rate: 602, index: 0.99 },
      { city: "Chennai", rate: 592, index: 0.97 },
      { city: "Dubai", rate: 715, index: 1.17 },
    ],
    vendor_rates: [
      { vendor_name: "Tata Steel", brand: "Tata Steel", rate: 610, date: "2026-05-11", unit: "mtr" },
      { vendor_name: "Jindal Hissar", brand: "Jindal", rate: 595, date: "2026-05-05", unit: "mtr" },
    ]
  }
];

export default function RatesLibraryPage() {
  const [quotations, setQuotations] = useState<LocalVendorQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [cityFilter, setCityFilter] = useState("All");
  const [vendorFilter, setVendorFilter] = useState("All");
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>("m-1");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchVendorQuotations();
      setQuotations(res.quotations);
    } catch (err) {
      console.error("Failed to fetch rates timeline quotations", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Upload and parsing states for new price lists
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processingStep, setProcessingStep] = useState<
    "" | "extracting" | "structuring" | "normalizing" | "storing" | "completed"
  >("");
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Manual price list creation states
  const [showActionDropdown, setShowActionDropdown] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualVendor, setManualVendor] = useState("");
  const [manualCatalogName, setManualCatalogName] = useState("");
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().split("T")[0]);

  type ManualItemEntry = {
    tempId: string;
    itemName: string;
    brand: string;
    unit: string;
    quotedRate: number;
    normalizedItemName: string;
  };

  const [manualItems, setManualItems] = useState<ManualItemEntry[]>([
    { tempId: "init-1", itemName: "", brand: "", unit: "mtr", quotedRate: 0, normalizedItemName: "" }
  ]);

  const handleAddManualItemRow = () => {
    setManualItems((prev) => [
      ...prev,
      {
        tempId: `row-${Date.now()}-${Math.random()}`,
        itemName: "",
        brand: "",
        unit: "mtr",
        quotedRate: 0,
        normalizedItemName: ""
      }
    ]);
  };

  const handleRemoveManualItemRow = (tempId: string) => {
    setManualItems((prev) => {
      if (prev.length <= 1) {
        toast.error("At least one item row is required.");
        return prev;
      }
      return prev.filter((item) => item.tempId !== tempId);
    });
  };

  const handleUpdateManualItem = (tempId: string, field: keyof ManualItemEntry, value: any) => {
    setManualItems((prev) =>
      prev.map((item) => {
        if (item.tempId !== tempId) return item;
        const updated = { ...item, [field]: value };

        // Auto-suggest normalization based on common keywords
        if (field === "itemName") {
          const lowerName = String(value).toLowerCase().trim();
          const matchingMaster = MASTER_RATES_DATABASE.find(
            (m) =>
              lowerName.includes(m.item_name.toLowerCase().trim()) ||
              m.item_name.toLowerCase().trim().includes(lowerName)
          );

          if (matchingMaster) {
            updated.normalizedItemName = matchingMaster.item_name;
            updated.unit = matchingMaster.base_unit;
          } else {
            if (lowerName.includes("cable") || lowerName.includes("wire") || lowerName.includes("conduit")) {
              if (lowerName.includes("armoured") || lowerName.includes("armored")) {
                updated.normalizedItemName = "copper armoured cable 4 core 16mm";
              } else {
                updated.normalizedItemName = "copper cable 3 core 2.5mm";
              }
            } else if (lowerName.includes("pipe") && (lowerName.includes("copper") || lowerName.includes("vrf"))) {
              updated.normalizedItemName = "copper pipe 25mm";
            } else if (lowerName.includes("pipe") && (lowerName.includes("conduit") || lowerName.includes("pvc"))) {
              updated.normalizedItemName = "pvc conduit pipe 25mm";
            } else if (lowerName.includes("gi pipe") || lowerName.includes("galvanized")) {
              updated.normalizedItemName = "gi pipe 50mm heavy duty";
            }
          }
        }
        return updated;
      })
    );
  };

  const handleSaveManualPriceList = async () => {
    if (!manualVendor.trim()) {
      toast.error("Please enter a supplier/vendor name.");
      return;
    }
    if (!manualCatalogName.trim()) {
      toast.error("Please enter a price list or catalog name.");
      return;
    }

    const validItems = manualItems.filter(
      (it) => it.itemName.trim() !== "" && it.quotedRate > 0
    );

    if (validItems.length === 0) {
      toast.error("Please add at least one item with description and rate.");
      return;
    }

    setLoading(true);
    try {
      const itemsToSave = validItems.map((it) => {
        let normName = it.normalizedItemName.trim();
        if (!normName) {
          normName = it.itemName.toLowerCase().trim();
        }
        return {
          item_name: it.itemName.trim(),
          brand: it.brand.trim() || manualVendor.trim(),
          unit: it.unit.trim() || "mtr",
          quoted_rate: Number(it.quotedRate),
          normalized_item_name: normName
        };
      });

      await saveVendorQuotation(
        manualCatalogName.trim(),
        manualVendor.trim(),
        manualDate,
        itemsToSave
      );

      toast.success("Price List Registered Successfully!", {
        description: `Indexed ${itemsToSave.length} catalog items for ${manualVendor.trim()}.`
      });

      // Reset Form State
      setManualVendor("");
      setManualCatalogName("");
      setManualDate(new Date().toISOString().split("T")[0]);
      setManualItems([
        { tempId: "init-1", itemName: "", brand: "", unit: "mtr", quotedRate: 0, normalizedItemName: "" }
      ]);
      setShowManualModal(false);

      await loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save price list.");
    } finally {
      setLoading(false);
    }
  };

  const handlePriceListUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    setUploading(true);
    setUploadError(null);
    setProcessingStep("extracting");

    try {
      // Step 1: Extract tables from the document (automatically bypasses Vercel limits via getApiBaseUrl)
      const extractRes = await extractFromFile(file, file.name);

      // Step 2: Use Gemini AI to structure the price list / quotation
      setProcessingStep("structuring");
      const structureRes = await structureExtractedQuotation(extractRes);

      // Step 3: Run Gemini Normalization prompts
      setProcessingStep("normalizing");
      const dbItems = structureRes.items.map((it) => ({
        item_name: it.item_name,
        brand: it.brand ?? structureRes.vendor_name ?? null,
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
      toast.success("Price List Indexed Successfully!", {
        description: `Successfully extracted ${dbItems.length} items from ${structureRes.vendor_name || "supplier"} catalog.`,
      });
      await loadData();

      setTimeout(() => {
        setUploading(false);
        setProcessingStep("");
        setShowUploadModal(false);
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || "An error occurred during price list parsing.");
      setUploading(false);
      setProcessingStep("");
    }
  };

  // Merge uploaded quotations into the master rates database dynamically
  const mergedMaterials = useMemo(() => {
    // Clone our master database to prevent side effects
    const database: MaterialRateIntel[] = JSON.parse(JSON.stringify(MASTER_RATES_DATABASE));

    // Iterate through all uploaded quotation items
    for (const q of quotations) {
      for (const item of q.items) {
        const normName = item.normalized_item_name.toLowerCase().trim();
        
        // Find if this item already exists in the master database
        const existing = database.find(
          (m) => m.item_name.toLowerCase().trim() === normName
        );

        const newVendorRate: VendorRate = {
          vendor_name: q.vendor_name,
          brand: item.brand || q.vendor_name,
          rate: item.quoted_rate,
          date: q.quotation_date,
          unit: item.unit || "mtr"
        };

        if (existing) {
          // Append to vendor rates if not already added from this quotation
          const alreadyAdded = existing.vendor_rates.some(
            (vr) => vr.vendor_name.toLowerCase() === q.vendor_name.toLowerCase() && vr.date === q.quotation_date
          );
          if (!alreadyAdded) {
            existing.vendor_rates.push(newVendorRate);
            
            // Adjust current city price or add historical entry if it is latest
            const latestDate = q.quotation_date;
            const avgRate = existing.vendor_rates.reduce((a, b) => a + b.rate, 0) / existing.vendor_rates.length;
            
            // Add a new historical point for May or update it
            const mayIndex = existing.historical_prices.findIndex((h) => h.month === "May");
            if (mayIndex !== -1) {
              existing.historical_prices[mayIndex].rate = Math.round(avgRate);
            }
          }
        } else {
          // Construct a completely new material rate profile
          const category =
            normName.includes("cable") || normName.includes("wire") || normName.includes("conduit")
              ? "Electrical"
              : normName.includes("pipe") && (normName.includes("copper") || normName.includes("vrf"))
              ? "HVAC"
              : "Plumbing";

          const newMaterial: MaterialRateIntel = {
            id: `dynamic-${item.id}`,
            item_name: item.normalized_item_name,
            category,
            base_unit: item.unit || "mtr",
            historical_prices: [
              { month: "Mar", rate: Math.round(item.quoted_rate * 0.95) },
              { month: "Apr", rate: Math.round(item.quoted_rate * 0.98) },
              { month: "May", rate: item.quoted_rate },
            ],
            project_usage: [
              {
                project_name: "Current Estimation Spec",
                city: "Mumbai",
                qty: 500,
                rate: item.quoted_rate,
                date: q.quotation_date
              }
            ],
            city_pricing: [
              { city: "Mumbai", rate: item.quoted_rate, index: 1.00 },
              { city: "Delhi", rate: Math.round(item.quoted_rate * 0.97), index: 0.97 },
              { city: "Bangalore", rate: Math.round(item.quoted_rate * 0.98), index: 0.98 },
            ],
            vendor_rates: [newVendorRate]
          };

          database.push(newMaterial);
        }
      }
    }

    return database;
  }, [quotations]);

  // Aggregate statistics for the metrics header
  const stats = useMemo(() => {
    const totalMaterials = mergedMaterials.length;
    
    // Find all unique vendors
    const vendorSet = new Set<string>();
    mergedMaterials.forEach((m) => m.vendor_rates.forEach((v) => vendorSet.add(v.vendor_name.toLowerCase())));
    const totalVendors = vendorSet.size;

    // Count usage logs
    let usageCount = 0;
    mergedMaterials.forEach((m) => {
      usageCount += m.project_usage.length;
    });

    return { totalMaterials, totalVendors, usageCount };
  }, [mergedMaterials]);

  // Filter materials based on search terms, category, city, and vendor selections
  const filteredMaterials = useMemo(() => {
    return mergedMaterials.filter((m) => {
      // 1. Search Query
      const matchSearch =
        m.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.category.toLowerCase().includes(searchQuery.toLowerCase());

      // 2. Category Filter
      const matchCategory = categoryFilter === "All" || m.category === categoryFilter;

      // 3. City Filter
      const matchCity =
        cityFilter === "All" || m.city_pricing.some((cp) => cp.city === cityFilter);

      // 4. Vendor Filter
      const matchVendor =
        vendorFilter === "All" ||
        m.vendor_rates.some((vr) => vr.vendor_name.toLowerCase() === vendorFilter.toLowerCase());

      return matchSearch && matchCategory && matchCity && matchVendor;
    });
  }, [mergedMaterials, searchQuery, categoryFilter, cityFilter, vendorFilter]);

  // Selected Material Rate detail
  const selectedMaterial = useMemo(() => {
    return mergedMaterials.find((m) => m.id === selectedMaterialId) || null;
  }, [mergedMaterials, selectedMaterialId]);

  // Category list for filters
  const categories = ["All", "Electrical", "HVAC", "Plumbing"];

  // City list for filters
  const cities = ["All", "Mumbai", "Delhi", "Bangalore", "Chennai", "Dubai"];

  // Vendor list for filters
  const vendorsList = useMemo(() => {
    const list = new Set<string>();
    mergedMaterials.forEach((m) => m.vendor_rates.forEach((vr) => list.add(vr.vendor_name)));
    return ["All", ...Array.from(list)];
  }, [mergedMaterials]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-8 sm:px-10">
      {/* Page Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 border-b border-gray-100 pb-5 dark:border-neutral-800 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Material Rate Library
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
            Market rate indicators, historical trend visualizers, and cross-supplier comparison logs
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 dark:bg-emerald-950/20 border border-emerald-200/20">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              Live Rate Index Active
            </span>
          </div>

          <div className="relative flex items-center">
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-1.5 rounded-l-lg bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-md hover:shadow transition cursor-pointer"
            >
              ➕ Upload Catalog (AI)
            </button>
            <button
              onClick={() => setShowActionDropdown(!showActionDropdown)}
              className="inline-flex items-center justify-center rounded-r-lg bg-indigo-700 hover:bg-indigo-600 border-l border-indigo-500/30 px-2.5 py-1.5 text-xs font-bold text-white transition cursor-pointer"
            >
              ▾
            </button>

            {showActionDropdown && (
              <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-xl border border-gray-200 bg-white p-1 shadow-lg dark:border-neutral-800 dark:bg-neutral-900 animate-in fade-in slide-in-from-top-1 duration-150">
                <button
                  onClick={() => {
                    setShowUploadModal(true);
                    setShowActionDropdown(false);
                  }}
                  className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:text-neutral-300 dark:hover:bg-neutral-850 transition cursor-pointer"
                >
                  <span>📋</span>
                  Upload Catalog (AI)
                </button>
                <button
                  onClick={() => {
                    setShowManualModal(true);
                    setShowActionDropdown(false);
                  }}
                  className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:text-neutral-300 dark:hover:bg-neutral-850 transition cursor-pointer"
                >
                  <span>📝</span>
                  Add Price List Manually
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Procurement Metrics Summary */}
      <div className="mb-8 grid gap-4 grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Tracked Materials
          </div>
          <div className="mt-1 text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
            {stats.totalMaterials} Items
          </div>
          <p className="mt-1 text-xs text-gray-400">Linked to historical MEP specifications</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Active Suppliers
          </div>
          <div className="mt-1 text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {stats.totalVendors} Vendors
          </div>
          <p className="mt-1 text-xs text-gray-400">Extracted from quotation uploads</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Historical References
          </div>
          <div className="mt-1 text-3xl font-extrabold text-amber-500">
            {stats.usageCount} Projects
          </div>
          <p className="mt-1 text-xs text-gray-400">Usage log mappings from site estimates</p>
        </div>
      </div>

      {/* Dashboard Toolbar Filters */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 flex flex-wrap gap-4 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search material items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 pl-9 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-850 dark:text-white"
          />
          <svg
            className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-gray-400"
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

        {/* Category Filter */}
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold uppercase text-gray-400">Category</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-indigo-500 dark:border-neutral-700 dark:bg-neutral-850 dark:text-white"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* City Filter */}
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold uppercase text-gray-400">City Region</label>
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-indigo-500 dark:border-neutral-700 dark:bg-neutral-850 dark:text-white"
          >
            {cities.map((ct) => (
              <option key={ct} value={ct}>
                {ct}
              </option>
            ))}
          </select>
        </div>

        {/* Vendor Filter */}
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold uppercase text-gray-400">Supplier Vendor</label>
          <select
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-indigo-500 dark:border-neutral-700 dark:bg-neutral-850 dark:text-white"
          >
            {vendorsList.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Workspace Layout */}
      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center">
          <svg className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="mt-2 text-xs text-gray-500 dark:text-neutral-400">Structuring rate index...</span>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Rate Index Table */}
          <div className="lg:col-span-2 space-y-4">
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:border-neutral-800 dark:bg-neutral-850 dark:text-neutral-400">
                      <th className="px-5 py-3">Material Item</th>
                      <th className="px-5 py-3">Category</th>
                      <th className="px-5 py-3 text-right">Avg Rate</th>
                      <th className="px-5 py-3">Cheapest Supplier</th>
                      <th className="px-5 py-3 text-center">Trend Indicator</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-neutral-800/50">
                    {filteredMaterials.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                          No rates matched the current filter conditions.
                        </td>
                      </tr>
                    ) : (
                      filteredMaterials.map((m) => {
                        const isSelected = selectedMaterialId === m.id;
                        
                        // Calculate Avg, Low supplier
                        const rates = m.vendor_rates.map((vr) => vr.rate);
                        const avgRate = Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
                        
                        const lowRate = Math.min(...rates);
                        const lowVendorObj = m.vendor_rates.find((vr) => vr.rate === lowRate);
                        const lowVendor = lowVendorObj ? `${lowVendorObj.vendor_name} (₹${lowRate})` : "—";

                        return (
                          <tr
                            key={m.id}
                            onClick={() => setSelectedMaterialId(m.id)}
                            className={`cursor-pointer transition ${
                              isSelected
                                ? "bg-indigo-50/30 dark:bg-indigo-950/20 font-medium border-l-4 border-l-indigo-500"
                                : "hover:bg-gray-50/50 dark:hover:bg-neutral-800/40"
                            }`}
                          >
                            <td className="px-5 py-4">
                              <div className="font-semibold text-gray-900 dark:text-white capitalize truncate max-w-[180px]">
                                {m.item_name}
                              </div>
                              <div className="text-[10px] text-gray-400 uppercase mt-0.5">
                                Unit: {m.base_unit}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                  m.category === "Electrical"
                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                                    : m.category === "HVAC"
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                    : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                                }`}
                              >
                                {m.category}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right font-bold text-gray-900 dark:text-white">
                              ₹{avgRate.toLocaleString("en-IN")}
                            </td>
                            <td className="px-5 py-4 text-emerald-600 dark:text-emerald-400 font-semibold">
                              {lowVendor}
                            </td>
                            <td className="px-5 py-4 text-center">
                              {/* Sparkline mini custom SVG */}
                              <svg className="mx-auto h-5 w-16" viewBox="0 0 100 30">
                                <path
                                  d={`M 0,25 Q 25,12 50,18 T 100,5`}
                                  fill="none"
                                  stroke="#10b981"
                                  strokeWidth="2.5"
                                />
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 absolute animate-ping ml-12 -mt-4"></span>
                              </svg>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <button className="rounded-lg bg-gray-50 border border-gray-200 px-2 py-1 text-[10px] font-semibold text-indigo-600 dark:bg-neutral-800 dark:border-neutral-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition">
                                View Intel
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Procurement Intelligence Side Panel */}
          <div className="lg:col-span-1">
            {selectedMaterial ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 space-y-6">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Procurement Intelligence Profile
                  </span>
                  <h3 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white capitalize mt-0.5">
                    {selectedMaterial.item_name}
                  </h3>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 uppercase">
                      Category: {selectedMaterial.category}
                    </span>
                    <span className="text-xs text-gray-300">•</span>
                    <span className="text-[10px] text-gray-400 uppercase">
                      Base: {selectedMaterial.base_unit}
                    </span>
                  </div>
                </div>

                {/* Historical Rate Trend Visualization Chart */}
                <div className="border-t border-gray-100 pt-4 dark:border-neutral-800">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">
                    6-Month Historical pricing Trend
                  </h4>
                  <div className="relative rounded-xl bg-gray-50 p-3 dark:bg-neutral-850">
                    {/* SVG Line chart representing pricing progression */}
                    <div className="h-32 w-full flex items-end">
                      <svg className="h-full w-full" viewBox="0 0 240 100" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        {/* Area Fill */}
                        <path
                          d={`M 10,${100 - (selectedMaterial.historical_prices[0].rate / 500) * 80}
                             L 50,${100 - (selectedMaterial.historical_prices[1].rate / 500) * 80}
                             L 90,${100 - (selectedMaterial.historical_prices[2].rate / 500) * 80}
                             L 130,${100 - (selectedMaterial.historical_prices[3].rate / 500) * 80}
                             L 170,${100 - (selectedMaterial.historical_prices[4].rate / 500) * 80}
                             L 210,${100 - (selectedMaterial.historical_prices[5].rate / 500) * 80}
                             L 210,100 L 10,100 Z`}
                          fill="url(#chart-grad)"
                        />
                        {/* Line path */}
                        <path
                          d={`M 10,${100 - (selectedMaterial.historical_prices[0].rate / 500) * 80}
                             L 50,${100 - (selectedMaterial.historical_prices[1].rate / 500) * 80}
                             L 90,${100 - (selectedMaterial.historical_prices[2].rate / 500) * 80}
                             L 130,${100 - (selectedMaterial.historical_prices[3].rate / 500) * 80}
                             L 170,${100 - (selectedMaterial.historical_prices[4].rate / 500) * 80}
                             L 210,${100 - (selectedMaterial.historical_prices[5].rate / 500) * 80}`}
                          fill="none"
                          stroke="#6366f1"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                        />
                        {/* Node Dots */}
                        {selectedMaterial.historical_prices.map((p, idx) => (
                          <circle
                            key={idx}
                            cx={10 + idx * 40}
                            cy={100 - (p.rate / 500) * 80}
                            r="4"
                            fill="#6366f1"
                            stroke="#ffffff"
                            strokeWidth="1.5"
                          />
                        ))}
                      </svg>
                    </div>
                    {/* X-Axis Month Markers */}
                    <div className="mt-2 flex justify-between px-1 text-[9px] font-bold text-gray-400 uppercase">
                      {selectedMaterial.historical_prices.map((p, idx) => (
                        <span key={idx} className="w-8 text-center">
                          {p.month} (₹{p.rate})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Vendor Side-by-Side comparison bids */}
                <div className="border-t border-gray-100 pt-4 dark:border-neutral-800">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">
                    Active Supplier Quotations Comparison
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedMaterial.vendor_rates.map((vr, idx) => {
                      const cheapest =
                        vr.rate === Math.min(...selectedMaterial.vendor_rates.map((o) => o.rate));
                      return (
                        <div
                          key={idx}
                          className={`flex items-center justify-between rounded-xl p-3 border transition ${
                            cheapest
                              ? "bg-emerald-50/20 border-emerald-500/30 dark:bg-emerald-950/10"
                              : "bg-gray-50 dark:bg-neutral-850 border-transparent"
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-900 dark:text-white">
                              {vr.vendor_name}
                              {cheapest && (
                                <span className="rounded bg-emerald-100 px-1 py-0.2 text-[8px] font-bold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                                  Low Bid
                                </span>
                              )}
                            </div>
                            <div className="text-[9px] text-gray-400">
                              Brand: {vr.brand} • Updated {vr.date}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                              ₹{vr.rate}
                            </span>
                            <span className="block text-[9px] text-gray-400">per {vr.unit}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Regional City-based variance mapping */}
                <div className="border-t border-gray-100 pt-4 dark:border-neutral-800">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2.5">
                    Regional City variance index
                  </h4>
                  <div className="rounded-xl border border-gray-100 dark:border-neutral-800 overflow-hidden">
                    <table className="w-full text-left text-[10px]">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50 text-gray-400 dark:border-neutral-800 dark:bg-neutral-850 font-semibold">
                          <th className="px-3 py-2">City region</th>
                          <th className="px-3 py-2 text-right">Quoted Rate</th>
                          <th className="px-3 py-2 text-right">Price Index</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-neutral-800/50">
                        {selectedMaterial.city_pricing.map((cp, idx) => (
                          <tr key={idx} className="text-gray-700 dark:text-neutral-300">
                            <td className="px-3 py-2 font-medium">{cp.city}</td>
                            <td className="px-3 py-2 text-right font-semibold">
                              ₹{cp.rate.toLocaleString("en-IN")}
                            </td>
                            <td className="px-3 py-2 text-right text-indigo-500 font-semibold">
                              {cp.index === 1.00 ? "Base (1.00)" : `${cp.index.toFixed(2)}x`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Project Usage Timeline */}
                <div className="border-t border-gray-100 pt-4 dark:border-neutral-800">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">
                    Project Deployment Logs
                  </h4>
                  <div className="relative border-l border-indigo-100 pl-4 space-y-3 dark:border-indigo-900/30">
                    {selectedMaterial.project_usage.map((usage, idx) => (
                      <div key={idx} className="relative text-xs">
                        {/* timeline check indicator */}
                        <span className="absolute -left-[21px] top-1 flex h-2.5 w-2.5 rounded-full bg-indigo-500 border border-white"></span>
                        <div className="font-semibold text-gray-800 dark:text-neutral-200">
                          {usage.project_name}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {usage.qty} {selectedMaterial.base_unit} used • ₹{usage.rate}/{selectedMaterial.base_unit}
                        </div>
                        <div className="text-[9px] text-gray-500 mt-0.5">
                          Deployed on {usage.date} • {usage.city} region
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-20 text-center dark:border-neutral-800 dark:bg-neutral-900">
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
                    d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z"
                  />
                </svg>
                <p className="mt-4 text-sm font-medium text-gray-900 dark:text-white">
                  No material profile selected
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-neutral-400">
                  Select a material row from the comparison index grid to explore supplier and usage intelligence metrics.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PRICE LIST UPLOAD MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-6 backdrop-blur-md animate-in fade-in duration-200">
          <div className="flex w-full max-w-md flex-col rounded-3xl border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden select-none">
            <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6 py-4.5">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded bg-indigo-500/10 text-indigo-400 font-bold text-xs border border-indigo-500/20">📋</div>
                <div>
                  <h3 className="font-bold text-zinc-100 text-sm">Upload Price List / Catalog</h3>
                  <p className="text-[10px] text-zinc-500">Extract supplier rates via Gemini AI</p>
                </div>
              </div>
              <button
                onClick={() => { if (!uploading) setShowUploadModal(false); }}
                disabled={uploading}
                className="h-7 w-7 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center justify-center hover:bg-zinc-850 cursor-pointer disabled:cursor-not-allowed transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {!uploading ? (
                <label className="group flex h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 hover:bg-zinc-950/80 transition duration-200">
                  <div className="flex flex-col items-center justify-center pb-6 pt-5">
                    <svg
                      className="mb-3 h-10 w-10 text-zinc-600 group-hover:scale-110 group-hover:text-indigo-400 transition duration-200"
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
                    <p className="mb-1 text-xs font-semibold text-zinc-300">
                      Drag & drop price list
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      PDF, XLS, XLSX up to 50MB
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.xls,.xlsx"
                    onChange={handlePriceListUpload}
                  />
                </label>
              ) : (
                <div className="flex flex-col items-center justify-center py-6">
                  {/* Shimmering orb */}
                  <div className="relative mb-6 flex h-14 w-14 items-center justify-center">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-500/20 opacity-75"></span>
                    <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white shadow">
                      <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </span>
                  </div>

                  {/* Checklist loader */}
                  <div className="w-full space-y-3 px-2">
                    <ChecklistItem
                      label="Extracting PDF/Excel tables..."
                      active={processingStep === "extracting"}
                      done={
                        processingStep !== "extracting" &&
                        processingStep !== ""
                      }
                    />
                    <ChecklistItem
                      label="Structuring catalog items..."
                      active={processingStep === "structuring"}
                      done={
                        processingStep !== "extracting" &&
                        processingStep !== "structuring" &&
                        processingStep !== ""
                      }
                    />
                    <ChecklistItem
                      label="Normalizing codes via Gemini..."
                      active={processingStep === "normalizing"}
                      done={
                        processingStep === "storing" ||
                        processingStep === "completed"
                      }
                    />
                    <ChecklistItem
                      label="Indexing pricing into Rate Library..."
                      active={processingStep === "storing"}
                      done={processingStep === "completed"}
                    />
                  </div>
                </div>
              )}

              {uploadError && (
                <div className="rounded-xl bg-red-950/20 border border-red-900/40 p-3 text-[10px] text-red-400">
                  <p className="font-bold">Error parsing price list:</p>
                  <p className="mt-0.5">{uploadError}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MANUAL PRICE LIST ENTRY MODAL */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-6 backdrop-blur-md animate-in fade-in duration-200">
          <div className="flex w-full max-w-4xl h-[85vh] flex-col rounded-3xl border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6 py-4.5">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded bg-indigo-500/10 text-indigo-400 font-bold text-xs border border-indigo-500/20">📝</div>
                <div>
                  <h3 className="font-bold text-zinc-100 text-sm">Add Price List Manually</h3>
                  <p className="text-[10px] text-zinc-500">Register new catalog rates for library comparisons</p>
                </div>
              </div>
              <button
                onClick={() => setShowManualModal(false)}
                className="h-7 w-7 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center justify-center hover:bg-zinc-850 cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Content Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Supplier Header Info Form */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Supplier/Vendor Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Havells, Polycab, Tata Steel"
                    value={manualVendor}
                    onChange={(e) => setManualVendor(e.target.value)}
                    className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Price List / Catalog Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Electrical Cables Price Sheet June 26"
                    value={manualCatalogName}
                    onChange={(e) => setManualCatalogName(e.target.value)}
                    className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Price List Date</label>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>

              {/* Items Entry Table Header */}
              <div className="border-t border-zinc-800 pt-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Catalog Line Items</h4>
                  <button
                    onClick={handleAddManualItemRow}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 px-3 py-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition cursor-pointer"
                  >
                    ➕ Add Item Row
                  </button>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 overflow-hidden">
                  <table className="w-full text-left text-xs text-zinc-300">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-zinc-950/80 text-[9px] font-semibold uppercase tracking-wider text-zinc-500">
                        <th className="px-4 py-2.5">Item Description</th>
                        <th className="px-4 py-2.5 w-32">Brand</th>
                        <th className="px-4 py-2.5 w-24">Unit</th>
                        <th className="px-4 py-2.5 w-28">Rate (₹)</th>
                        <th className="px-4 py-2.5">Matching Standard Item</th>
                        <th className="px-4 py-2.5 text-center w-12">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {manualItems.map((item, idx) => (
                        <tr key={item.tempId} className="hover:bg-zinc-900/20">
                          {/* Item Description */}
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              placeholder="e.g. Polycab 3 Core 2.5mm Cable"
                              value={item.itemName}
                              onChange={(e) => handleUpdateManualItem(item.tempId, "itemName", e.target.value)}
                              className="w-full rounded-lg border border-zinc-850 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                            />
                          </td>

                          {/* Brand */}
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              placeholder="e.g. Polycab"
                              value={item.brand}
                              onChange={(e) => handleUpdateManualItem(item.tempId, "brand", e.target.value)}
                              className="w-full rounded-lg border border-zinc-850 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100 outline-none focus:border-indigo-500 transition"
                            />
                          </td>

                          {/* Unit */}
                          <td className="px-4 py-2">
                            <select
                              value={item.unit}
                              onChange={(e) => handleUpdateManualItem(item.tempId, "unit", e.target.value)}
                              className="w-full rounded-lg border border-zinc-850 bg-zinc-950 px-1.5 py-1.5 text-xs text-zinc-100 outline-none focus:border-indigo-500 transition"
                            >
                              <option value="mtr">mtr</option>
                              <option value="kg">kg</option>
                              <option value="nos">nos</option>
                              <option value="sq.m">sq.m</option>
                              <option value="r.ft">r.ft</option>
                              <option value="lot">lot</option>
                            </select>
                          </td>

                          {/* Quoted Rate */}
                          <td className="px-4 py-2">
                            <div className="relative">
                              <span className="absolute left-2.5 top-1.5 text-zinc-500">₹</span>
                              <input
                                type="number"
                                placeholder="0"
                                value={item.quotedRate || ""}
                                onChange={(e) => handleUpdateManualItem(item.tempId, "quotedRate", e.target.value ? Number(e.target.value) : 0)}
                                className="w-full rounded-lg border border-zinc-850 bg-zinc-950 pl-6 pr-2 py-1.5 text-xs text-zinc-100 outline-none focus:border-indigo-500 transition"
                              />
                            </div>
                          </td>

                          {/* Normalized Name suggest */}
                          <td className="px-4 py-2">
                            <select
                              value={item.normalizedItemName}
                              onChange={(e) => handleUpdateManualItem(item.tempId, "normalizedItemName", e.target.value)}
                              className="w-full rounded-lg border border-zinc-850 bg-zinc-950 px-1.5 py-1.5 text-xs text-zinc-100 outline-none focus:border-indigo-500 transition"
                            >
                              <option value="">-- Choose Matching standard --</option>
                              {MASTER_RATES_DATABASE.map((m) => (
                                <option key={m.id} value={m.item_name}>
                                  {m.item_name} ({m.category})
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Delete */}
                          <td className="px-4 py-2 text-center">
                            <button
                              onClick={() => handleRemoveManualItemRow(item.tempId)}
                              className="h-7 w-7 rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/20 text-zinc-500 hover:text-red-400 flex items-center justify-center transition cursor-pointer"
                              title="Delete Row"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-950 px-6 py-4">
              <span className="text-[10px] text-zinc-500">
                {manualItems.length} row(s) in catalog
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowManualModal(false)}
                  className="rounded-xl border border-zinc-850 hover:border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveManualPriceList}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-bold text-white shadow-lg transition cursor-pointer"
                >
                  💾 Save Price List
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function ChecklistItem({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <div
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold ${
          done
            ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
            : active
            ? "border-indigo-500 bg-indigo-500/20 text-indigo-400 animate-pulse"
            : "border-zinc-700 bg-zinc-950 text-zinc-650"
        }`}
      >
        {done ? "✓" : active ? "●" : "○"}
      </div>
      <span
        className={
          done
            ? "text-zinc-500 line-through"
            : active
            ? "text-zinc-200 font-semibold"
            : "text-zinc-500"
        }
      >
        {label}
      </span>
    </div>
  );
}
