"use client";

import { useEffect, useState, useRef } from "react";
import type { ExtractResponse, StructureResponse, BoqLineItem } from "@/lib/api";
import { exportBoqToExcel, structureExtractedBoq } from "@/lib/api";

type ModalState = 
  | "raw_preview"
  | "structuring"
  | "structure_error"
  | "structured_preview";

interface HistoricalRateRecord {
  keywords: string[];
  suggestedRate: number;
  unit: string;
  basedOnProject: string;
  basedOnVendor: string;
  updatedDaysAgo: number;
  city: string;
  vendorComparison: { vendor: string; rate: number; date: string }[];
  projectHistory: { project: string; city: string; rate: number; date: string }[];
  timeline: { date: string; rate: number }[];
}

const HISTORICAL_RATES_DB: HistoricalRateRecord[] = [
  {
    keywords: ["copper", "pipe", "25", "tub", "hvac"],
    suggestedRate: 425,
    unit: "mtr",
    basedOnProject: "Project SkyRise Tower",
    basedOnVendor: "ABC Metals & Tubes",
    updatedDaysAgo: 10,
    city: "Mumbai",
    vendorComparison: [
      { vendor: "ABC Metals & Tubes", rate: 425, date: "10 days ago" },
      { vendor: "Supreme Piping Corp", rate: 440, date: "5 days ago" },
      { vendor: "Global Trades", rate: 450, date: "15 days ago" }
    ],
    projectHistory: [
      { project: "Project SkyRise Tower", city: "Mumbai", rate: 425, date: "10 days ago" },
      { project: "TechPark Phase 2", city: "Bangalore", rate: 435, date: "1 month ago" },
      { project: "Metro Station Block A", city: "Delhi", rate: 420, date: "2 months ago" }
    ],
    timeline: [
      { date: "6m ago", rate: 390 },
      { date: "4m ago", rate: 410 },
      { date: "2m ago", rate: 420 },
      { date: "Current", rate: 425 }
    ]
  },
  {
    keywords: ["lighting", "fixture", "led", "wire", "conduit", "elec"],
    suggestedRate: 180,
    unit: "nos",
    basedOnProject: "HDFC Office Fitout",
    basedOnVendor: "Anchor Electricals",
    updatedDaysAgo: 4,
    city: "Bangalore",
    vendorComparison: [
      { vendor: "Anchor Electricals", rate: 180, date: "4 days ago" },
      { vendor: "Havells India", rate: 195, date: "12 days ago" },
      { vendor: "Schneider Electric", rate: 210, date: "20 days ago" }
    ],
    projectHistory: [
      { project: "HDFC Office Fitout", city: "Bangalore", rate: 180, date: "4 days ago" },
      { project: "Prestige Heights", city: "Mumbai", rate: 185, date: "1 month ago" },
      { project: "Cyber Gateway", city: "Hyderabad", rate: 175, date: "3 months ago" }
    ],
    timeline: [
      { date: "6m ago", rate: 165 },
      { date: "4m ago", rate: 170 },
      { date: "2m ago", rate: 175 },
      { date: "Current", rate: 180 }
    ]
  },
  {
    keywords: ["gi", "pipe", "water", "plumb", "swr", "pvc"],
    suggestedRate: 650,
    unit: "mtr",
    basedOnProject: "Apex Hospital",
    basedOnVendor: "Tata Steel Piping",
    updatedDaysAgo: 14,
    city: "Delhi",
    vendorComparison: [
      { vendor: "Tata Steel Piping", rate: 650, date: "14 days ago" },
      { vendor: "Jindal Industries", rate: 665, date: "3 days ago" },
      { vendor: "Astral Pipes Ltd", rate: 680, date: "8 days ago" }
    ],
    projectHistory: [
      { project: "Apex Hospital", city: "Delhi", rate: 650, date: "14 days ago" },
      { project: "L&T Hub", city: "Mumbai", rate: 660, date: "1 month ago" },
      { project: "IIT Campus Hostel", city: "Chennai", rate: 640, date: "2 months ago" }
    ],
    timeline: [
      { date: "6m ago", rate: 620 },
      { date: "4m ago", rate: 630 },
      { date: "2m ago", rate: 645 },
      { date: "Current", rate: 650 }
    ]
  },
  {
    keywords: ["sprinkler", "fire", "riser", "alarm", "hydrant"],
    suggestedRate: 850,
    unit: "nos",
    basedOnProject: "Mall of India",
    basedOnVendor: "Tyco Fire Protection",
    updatedDaysAgo: 7,
    city: "Noida",
    vendorComparison: [
      { vendor: "Tyco Fire Protection", rate: 850, date: "7 days ago" },
      { vendor: "HD Fire Protect", rate: 875, date: "11 days ago" },
      { vendor: "Safeguard Systems", rate: 890, date: "18 days ago" }
    ],
    projectHistory: [
      { project: "Mall of India", city: "Noida", rate: 850, date: "7 days ago" },
      { project: "Taj Hotel Renovation", city: "Mumbai", rate: 860, date: "2 months ago" },
      { project: "Terminal 2 Airport", city: "Bangalore", rate: 840, date: "4 months ago" }
    ],
    timeline: [
      { date: "6m ago", rate: 800 },
      { date: "4m ago", rate: 820 },
      { date: "2m ago", rate: 840 },
      { date: "Current", rate: 850 }
    ]
  },
  {
    keywords: ["cable", "xlpe", "armoured", "4c", "sq.mm", "core", "polycab", "finolex", "havells"],
    suggestedRate: 425,
    unit: "mtr",
    basedOnProject: "Phoenix Asia Tower",
    basedOnVendor: "Polycab India",
    updatedDaysAgo: 3,
    city: "Mumbai",
    vendorComparison: [
      { vendor: "Polycab India", rate: 425, date: "3 days ago" },
      { vendor: "Finolex Cables", rate: 440, date: "6 days ago" },
      { vendor: "Havells India", rate: 465, date: "10 days ago" }
    ],
    projectHistory: [
      { project: "Phoenix Asia Tower", city: "Mumbai", rate: 425, date: "3 days ago" },
      { project: "Amazon Tech Park", city: "Bangalore", rate: 435, date: "1 month ago" },
      { project: "Delhi Metro Extension", city: "Delhi", rate: 415, date: "2 months ago" }
    ],
    timeline: [
      { date: "6m ago", rate: 390 },
      { date: "4m ago", rate: 410 },
      { date: "2m ago", rate: 420 },
      { date: "Current", rate: 425 }
    ]
  },
  {
    keywords: ["cctv", "camera", "pa", "elv", "speaker", "network", "cat6", "rj45", "coaxial", "signal cable"],
    suggestedRate: 4800,
    unit: "nos",
    basedOnProject: "Corporate HQ Tower",
    basedOnVendor: "Hikvision Direct",
    updatedDaysAgo: 5,
    city: "Mumbai",
    vendorComparison: [
      { vendor: "Hikvision Direct", rate: 4800, date: "5 days ago" },
      { vendor: "CP Plus Supply", rate: 4600, date: "2 days ago" },
      { vendor: "Bosch Security Systems", rate: 5500, date: "10 days ago" }
    ],
    projectHistory: [
      { project: "Corporate HQ Tower", city: "Mumbai", rate: 4800, date: "5 days ago" },
      { project: "Amazon Warehouse", city: "Hyderabad", rate: 4700, date: "1 month ago" },
      { project: "DLF CyberCity", city: "Gurgaon", rate: 4900, date: "3 months ago" }
    ],
    timeline: [
      { date: "6m ago", rate: 4500 },
      { date: "4m ago", rate: 4600 },
      { date: "2m ago", rate: 4750 },
      { date: "Current", rate: 4800 }
    ]
  },
  {
    keywords: ["gypsum", "paint", "ceiling", "interior", "door", "partition", "carpet", "wood"],
    suggestedRate: 950,
    unit: "sq.m",
    basedOnProject: "JW Marriott Lobby",
    basedOnVendor: "Saint Gobain Gyproc",
    updatedDaysAgo: 12,
    city: "Mumbai",
    vendorComparison: [
      { vendor: "Saint Gobain Gyproc", rate: 950, date: "12 days ago" },
      { vendor: "Armstrong Ceilings", rate: 980, date: "6 days ago" },
      { vendor: "USG Boral", rate: 1020, date: "15 days ago" }
    ],
    projectHistory: [
      { project: "JW Marriott Lobby", city: "Mumbai", rate: 950, date: "12 days ago" },
      { project: "IT Park Office Block", city: "Pune", rate: 920, date: "1 month ago" },
      { project: "Luxury Villa Project", city: "Goa", rate: 990, date: "2 months ago" }
    ],
    timeline: [
      { date: "6m ago", rate: 880 },
      { date: "4m ago", rate: 910 },
      { date: "2m ago", rate: 935 },
      { date: "Current", rate: 950 }
    ]
  },
  {
    keywords: ["excavation", "concrete", "rcc", "pcc", "brick", "civil", "soil", "cement"],
    suggestedRate: 480,
    unit: "cu.m",
    basedOnProject: "Residential Township B",
    basedOnVendor: "UltraTech Concrete",
    updatedDaysAgo: 8,
    city: "Pune",
    vendorComparison: [
      { vendor: "UltraTech Concrete", rate: 480, date: "8 days ago" },
      { vendor: "L&T ReadyMix", rate: 495, date: "2 days ago" },
      { vendor: "Ambuja Cement Supply", rate: 470, date: "10 days ago" }
    ],
    projectHistory: [
      { project: "Residential Township B", city: "Pune", rate: 480, date: "8 days ago" },
      { project: "National Highway Stch", city: "Nagpur", rate: 460, date: "1 month ago" },
      { project: "Flyover Section 3", city: "Mumbai", rate: 510, date: "3 months ago" }
    ],
    timeline: [
      { date: "6m ago", rate: 440 },
      { date: "4m ago", rate: 455 },
      { date: "2m ago", rate: 470 },
      { date: "Current", rate: 480 }
    ]
  },
  {
    keywords: ["pump", "fan", "damper", "exhaust", "motor", "mech", "chiller", "ahu", "fcu"],
    suggestedRate: 15500,
    unit: "nos",
    basedOnProject: "Industrial Cold Storage",
    basedOnVendor: "Kirloskar Pumps",
    updatedDaysAgo: 15,
    city: "Ahmedabad",
    vendorComparison: [
      { vendor: "Kirloskar Pumps", rate: 15500, date: "15 days ago" },
      { vendor: "Grundfos India", rate: 17200, date: "5 days ago" },
      { vendor: "KSB Pumps", rate: 16100, date: "22 days ago" }
    ],
    projectHistory: [
      { project: "Industrial Cold Storage", city: "Ahmedabad", rate: 15500, date: "15 days ago" },
      { project: "Sewage Treatment Plant", city: "Mumbai", rate: 15800, date: "1 month ago" },
      { project: "Water Supply Grid C", city: "Jaipur", rate: 15200, date: "3 months ago" }
    ],
    timeline: [
      { date: "6m ago", rate: 14200 },
      { date: "4m ago", rate: 14700 },
      { date: "2m ago", rate: 15100 },
      { date: "Current", rate: 15500 }
    ]
  }
];

function getHistoricalRates(description: string, category: string | null): HistoricalRateRecord {
  const descLower = (description || "").toLowerCase();
  const catLower = (category || "").toLowerCase();
  
  let bestRecord: HistoricalRateRecord | null = null;
  let maxMatches = 0;
  
  for (const record of HISTORICAL_RATES_DB) {
    let matchCount = 0;
    for (const kw of record.keywords) {
      if (descLower.includes(kw)) matchCount++;
    }
    if (matchCount > maxMatches) {
      maxMatches = matchCount;
      bestRecord = record;
    }
  }
  
  if (bestRecord && maxMatches > 0) {
    return bestRecord;
  }
  
  const catMatch = HISTORICAL_RATES_DB.find(r => 
    catLower.includes(r.keywords[r.keywords.length - 1]) || 
    r.keywords.some(kw => catLower.includes(kw))
  );
  
  if (catMatch) {
    return catMatch;
  }
  
  return HISTORICAL_RATES_DB[0];
}

const CONTEXT_CATEGORIES = [
  "HVAC",
  "Electrical",
  "Plumbing",
  "Fire Fighting",
  "ELV",
  "Interior",
  "Civil",
  "Mechanical",
  "Miscellaneous"
];

function formatPrice(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "₹0.00";
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
  const [modalState, setModalState] = useState<ModalState>("raw_preview");
  const [exporting, setExporting] = useState(false);
  const [structureError, setStructureError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [structured, setStructured] = useState<StructureResponse | null>(null);
  
  // Local state for inline editing
  const [editableItems, setEditableItems] = useState<(BoqLineItem & { id: string; approved: boolean })[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  
  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Checklist states for Structuring Loader
  const [structuringProgress, setStructuringProgress] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

  // Autosave indicators
  const [autosaveStatus, setAutosaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Start Checklist Timer Simulation when structuring
  useEffect(() => {
    if (modalState === "structuring") {
      setStructuringProgress(10);
      setCompletedSteps({});
      
      const t1 = setTimeout(() => {
        setCompletedSteps(prev => ({ ...prev, 1: true }));
        setStructuringProgress(35);
      }, 700);

      const t2 = setTimeout(() => {
        setCompletedSteps(prev => ({ ...prev, 2: true }));
        setStructuringProgress(60);
      }, 1600);

      const t3 = setTimeout(() => {
        setCompletedSteps(prev => ({ ...prev, 3: true }));
        setStructuringProgress(85);
      }, 2500);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [modalState]);

  async function handleStructure() {
    if (tables.length === 0) return;
    setStructureError(null);
    setModalState("structuring");
    
    try {
      const result = await structureExtractedBoq(data);
      
      // Inject unique ID, default approval states, and clean raw OCR copies
      const formattedItems = result.items.map((item, idx) => ({
        ...item,
        id: `boq-item-${idx}-${Date.now()}`,
        approved: false,
        confidence: item.confidence ?? 0.85,
        original_text: item.original_text || item.description || "",
      }));

      setStructured(result);
      setEditableItems(formattedItems);
      if (formattedItems.length > 0) {
        setSelectedItemId(formattedItems[0].id);
      }
      setModalState("structured_preview");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Structuring failed.";
      setStructureError(
        message.includes("fetch")
          ? "Cannot reach API. Start backend on port 8000 and set GEMINI_API_KEY."
          : message
      );
      setModalState("structure_error");
    }
  }

  // Trigger Local Autosave status
  const triggerAutosave = () => {
    setAutosaveStatus("saving");
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      setAutosaveStatus("saved");
    }, 500);
  };

  async function handleExport() {
    if (!structured || editableItems.length === 0) return;
    setExportError(null);
    setExporting(true);
    try {
      const payload: StructureResponse = {
        ...structured,
        items: editableItems.map(({ id, approved, ...rest }) => rest),
      };
      await exportBoqToExcel(payload, { projectName });
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  // Helpers for editing fields
  const updateItemField = (id: string, field: keyof BoqLineItem | "approved", value: any) => {
    setEditableItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        // Compute amount = qty * rate automatically
        if (field === "quantity" || field === "rate") {
          const qty = field === "quantity" ? value : item.quantity;
          const rate = field === "rate" ? value : item.rate;
          if (qty != null && rate != null && !isNaN(qty) && !isNaN(rate)) {
            updated.amount = parseFloat((qty * rate).toFixed(2));
          }
        }
        return updated;
      }
      return item;
    }));
    triggerAutosave();
  };

  const handleApplySuggestedRate = (id: string, rate: number) => {
    updateItemField(id, "rate", rate);
  };

  const handleRestoreOriginal = (id: string) => {
    setEditableItems(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          description: item.original_text || "",
          quantity: item.quantity,
          rate: 0,
          amount: 0,
          approved: false
        };
      }
      return item;
    }));
    triggerAutosave();
  };

  const handleDeleteRow = (id: string) => {
    setEditableItems(prev => prev.filter(item => item.id !== id));
    if (selectedItemId === id) {
      const remaining = editableItems.filter(item => item.id !== id);
      setSelectedItemId(remaining.length > 0 ? remaining[0].id : null);
    }
    triggerAutosave();
  };

  const handleAddRow = () => {
    const newId = `boq-item-manual-${Date.now()}`;
    const newItem = {
      id: newId,
      item_no: `${editableItems.length + 1}`,
      category: categoryFilter !== "All" ? categoryFilter : "HVAC",
      description: "New standard item description",
      unit: "nos",
      quantity: 1,
      rate: 0,
      amount: 0,
      remarks: "",
      confidence: 1.0,
      approved: false,
      original_text: "New standard item description",
    };
    setEditableItems(prev => [...prev, newItem]);
    setSelectedItemId(newId);
    triggerAutosave();
  };

  // Bulk Approval actions
  const handleBulkApprove = (ids: string[], approve: boolean) => {
    setEditableItems(prev => prev.map(item => {
      if (ids.includes(item.id)) {
        return { ...item, approved: approve };
      }
      return item;
    }));
    triggerAutosave();
  };

  const toggleCategoryCollapse = (cat: string) => {
    setCollapsedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Filtered & Grouped lists
  const filteredItems = editableItems.filter(item => {
    const descMatches = item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const itemNoMatches = (item.item_no || "").toLowerCase().includes(searchQuery.toLowerCase());
    const catMatches = categoryFilter === "All" || item.category === categoryFilter;
    return (descMatches || itemNoMatches) && catMatches;
  });

  // Dynamic cost totals & item counters
  const sumTotal = filteredItems.reduce((acc, item) => acc + (item.amount || 0), 0);
  const totalItemsCount = filteredItems.length;
  const approvedCount = filteredItems.filter(item => item.approved).length;

  const groupedItems = filteredItems.reduce<Record<string, typeof filteredItems>>((acc, item) => {
    const cat = item.category || "Miscellaneous";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const selectedItem = editableItems.find(item => item.id === selectedItemId);
  const matchedRates = selectedItem ? getHistoricalRates(selectedItem.description, selectedItem.category) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-3 md:p-6 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex h-[94vh] w-full max-w-7xl flex-col rounded-3xl border border-zinc-800 bg-zinc-900 text-zinc-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* UPPER BRAND BARS & FILE META */}
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6 py-4.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/20">
              <span className="font-extrabold text-white text-base">V</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold tracking-widest text-violet-400 uppercase">Vertex Estimator Suite</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <h2 className="text-lg font-bold text-zinc-50 flex items-center gap-2">
                {modalState === "structured_preview"
                  ? "BOQ Estimation Cockpit"
                  : "Raw Tender Table Extraction"}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden md:inline text-xs text-zinc-400 max-w-[200px] truncate" title={data.filename}>
              {data.filename}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 px-4 py-2 text-xs font-bold text-zinc-200 transition cursor-pointer"
            >
              Close Workspace
            </button>
          </div>
        </div>

        {/* MAIN BODY AREA DEPENDING ON STATE */}

        {/* 1. STATE: RAW PREVIEW */}
        {modalState === "raw_preview" && (
          <div className="flex flex-1 flex-col overflow-hidden">
            {tables.length > 1 && (
              <div className="flex flex-wrap gap-2 border-b border-zinc-800 bg-zinc-900/50 px-6 py-2.5">
                {tables.map((t, i) => {
                  const tabLabel = t.sheet != null ? t.sheet : t.page != null ? `Page ${t.page}` : `Table ${i + 1}`;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveIndex(i)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                        i === activeIndex
                          ? "bg-violet-600 text-white shadow-md shadow-violet-600/10"
                          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                      }`}
                    >
                      {tabLabel}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex-1 overflow-auto p-6">
              {tables.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center p-8">
                  <svg className="mx-auto h-12 w-12 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h3 className="mt-4 text-sm font-bold text-zinc-200">No raw tables extracted</h3>
                  <p className="mt-2 text-xs text-zinc-500 max-w-sm">No tabular details could be discovered in this file. Try uploading another tender specification sheet.</p>
                </div>
              ) : active ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold tracking-wider uppercase text-zinc-500">{label} · {active.rows.length} Raw Rows</span>
                    <span className="rounded bg-yellow-500/10 px-2 py-0.5 text-[10px] font-bold text-yellow-400 border border-yellow-500/20">OCR Raw Data</span>
                  </div>
                  
                  <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-inner">
                    <div className="max-h-[50vh] overflow-auto">
                      <table className="w-full text-left text-xs divide-y divide-zinc-800">
                        <tbody className="divide-y divide-zinc-900">
                          {active.rows.slice(0, 200).map((row, ri) => (
                            <tr
                              key={ri}
                              className={
                                ri === 0
                                  ? "bg-zinc-900 font-extrabold text-zinc-50 sticky top-0"
                                  : "hover:bg-zinc-900/30 text-zinc-300"
                              }
                            >
                              {row.map((cell, ci) => (
                                <td key={ci} className="max-w-[280px] truncate px-4 py-3 border-r border-zinc-900 last:border-0" title={cell ?? ""}>
                                  {cell ?? ""}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {active.rows.length > 200 && (
                    <p className="text-[11px] text-zinc-500 italic">Showing the first 200 rows of data. Use the AI Structuring tool below to automatically clean and classify the entire scope.</p>
                  )}
                </div>
              ) : null}
            </div>

            {/* RAW FOOTER BUTTON */}
            <div className="border-t border-zinc-800 bg-zinc-950 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-zinc-400 max-w-lg">
                Raw extracted layout. Standardize structures, fix OCR errors, group items, and launch estimation rates automatically by running the AI engine.
              </span>
              <button
                type="button"
                onClick={handleStructure}
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-violet-600 hover:bg-violet-700 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-violet-600/20 transition cursor-pointer"
              >
                Structure & Normalize with AI
              </button>
            </div>
          </div>
        )}

        {/* 2. STATE: STRUCTURING LOADER */}
        {modalState === "structuring" && (
          <div className="flex flex-1 flex-col items-center justify-center bg-zinc-900/50 p-6">
            <div className="relative flex flex-col items-center max-w-md w-full p-8 rounded-3xl border border-zinc-800 bg-zinc-950/70 backdrop-blur-xl shadow-2xl">
              
              {/* ORB ANIMATION */}
              <div className="relative flex h-24 w-24 items-center justify-center mb-6">
                <div className="absolute inset-0 animate-ping rounded-full bg-violet-500/20 opacity-75" />
                <div className="absolute h-18 w-18 animate-pulse rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 blur-xs shadow-xl shadow-violet-500/40" />
                <svg className="relative h-9 w-9 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>

              <h3 className="text-base font-extrabold text-zinc-100 mb-2">Analyzing BOQ with Gemini AI</h3>
              <p className="text-xs text-zinc-500 text-center mb-6">Unlocking MEP classifications, standardizing shorthand descriptions, and tracing original row segments...</p>

              {/* PROGRESS BAR */}
              <div className="w-full h-1.5 bg-zinc-800 rounded-full mb-6 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500 rounded-full"
                  style={{ width: `${structuringProgress}%` }}
                />
              </div>

              {/* CHECKLIST STEPS */}
              <div className="w-full space-y-3.5 text-xs text-left">
                <div className="flex items-center gap-3">
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                    completedSteps[1] ? "bg-violet-500/10 border-violet-500 text-violet-400" : "border-zinc-800 text-zinc-600"
                  }`}>
                    {completedSteps[1] ? "✓" : "●"}
                  </div>
                  <span className={completedSteps[1] ? "text-zinc-300 font-medium" : "text-zinc-600"}>
                    Initializing Gemini LLM Engine
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                    completedSteps[2] ? "bg-violet-500/10 border-violet-500 text-violet-400" : "border-zinc-800 text-zinc-600"
                  }`}>
                    {completedSteps[2] ? "✓" : "●"}
                  </div>
                  <span className={completedSteps[2] ? "text-zinc-300 font-medium" : "text-zinc-600"}>
                    Normalizing units & stripping noise flags
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                    completedSteps[3] ? "bg-violet-500/10 border-violet-500 text-violet-400" : "border-zinc-800 text-zinc-600"
                  }`}>
                    {completedSteps[3] ? "✓" : "●"}
                  </div>
                  <span className={completedSteps[3] ? "text-zinc-300 font-medium" : "text-zinc-600"}>
                    Mapping trade categories to strict MEP scope
                  </span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 3. STATE: STRUCTURE ERROR */}
        {modalState === "structure_error" && (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <div className="max-w-md p-8 rounded-3xl border border-red-500/20 bg-red-500/5 shadow-2xl">
              <svg className="mx-auto h-12 w-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="mt-4 text-base font-bold text-zinc-200">AI Structuring Failed</h3>
              <p className="mt-2 text-xs text-red-400">{structureError}</p>
              
              <div className="mt-6 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setModalState("raw_preview")}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-semibold hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStructure}
                  className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700 transition"
                >
                  Retry AI Structuring
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. STATE: STRUCTURED PREVIEW (SPLIT PANE COCKPIT) */}
        {modalState === "structured_preview" && (
          <div className="flex flex-1 overflow-hidden">
            
            {/* LEFT MASTER WORKSPACE (60% WIDTH) */}
            <div className="w-[60%] flex flex-col border-r border-zinc-800 bg-zinc-900/50">
              
              {/* FILTERS & SEARCH ROW */}
              <div className="p-4 border-b border-zinc-800 bg-zinc-950 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      placeholder="Search description or item code..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:border-violet-600 focus:ring-1 focus:ring-violet-600 outline-none transition"
                    />
                  </div>

                  <div className="w-44">
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 outline-none focus:border-violet-600 transition"
                    >
                      <option value="All">All Categories</option>
                      {CONTEXT_CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* METRICS HEADER BARS */}
                <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={filteredItems.length > 0 && filteredItems.every(i => i.approved)}
                        ref={el => {
                          if (el) {
                            el.indeterminate = filteredItems.some(i => i.approved) && !filteredItems.every(i => i.approved);
                          }
                        }}
                        onChange={(e) => {
                          const ids = filteredItems.map(i => i.id);
                          handleBulkApprove(ids, e.target.checked);
                        }}
                        className="rounded border-zinc-700 bg-zinc-900 text-violet-600 focus:ring-0 cursor-pointer h-3.5 w-3.5"
                      />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Approve All</span>
                    </div>

                    <span className="text-zinc-600">|</span>

                    <span>Grouped: <strong className="text-zinc-200">{Object.keys(groupedItems).length} Trades</strong></span>
                    <span>Items: <strong className="text-zinc-200">{approvedCount}/{totalItemsCount} Approved</strong></span>
                  </div>

                  {/* Pulsing Autosave badge */}
                  <div className="flex items-center gap-1.5">
                    {autosaveStatus === "saving" && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-yellow-400 font-bold uppercase tracking-widest">
                        <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-ping" />
                        Saving...
                      </span>
                    )}
                    {autosaveStatus === "saved" && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
                        ✓ Saved
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* DYNAMIC MASTER GRID - COLLAPSIBLE GROUPS */}
              <div className="flex-1 overflow-auto p-4 space-y-4">
                {Object.keys(groupedItems).length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-xs text-zinc-500">No structured items found matching the current search parameters.</p>
                  </div>
                ) : (
                  Object.entries(groupedItems).map(([cat, items]) => {
                    const isCollapsed = collapsedCategories[cat];
                    const catSum = items.reduce((acc, item) => acc + (item.amount || 0), 0);
                    
                    return (
                      <div key={cat} className="rounded-2xl border border-zinc-850 bg-zinc-900 shadow-sm overflow-hidden">
                        
                        {/* CATEGORY HEADER */}
                        <div 
                          onClick={() => toggleCategoryCollapse(cat)}
                          className="flex items-center justify-between px-4 py-3 bg-zinc-950/40 border-b border-zinc-800/60 cursor-pointer hover:bg-zinc-950/70 transition"
                        >
                          <div className="flex items-center gap-2">
                            <svg className={`h-4 w-4 text-zinc-500 transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                            </svg>
                            <span className="text-xs font-extrabold text-zinc-200 uppercase tracking-wider">{cat}</span>
                            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400 font-bold">{items.length} items</span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-violet-400">{formatPrice(catSum)}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const ids = items.map(i => i.id);
                                const allApproved = items.every(i => i.approved);
                                handleBulkApprove(ids, !allApproved);
                              }}
                              className="rounded border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 px-2 py-1 text-[10px] font-bold text-zinc-300 transition"
                            >
                              {items.every(i => i.approved) ? "Reset" : "Approve Trade"}
                            </button>
                          </div>
                        </div>

                        {/* CATEGORY BODY (ITEMS ROWS) */}
                        {!isCollapsed && (
                          <div className="divide-y divide-zinc-850">
                            {items.map(item => {
                              const isSelected = item.id === selectedItemId;
                              const isApproved = item.approved;
                              
                              // Input check flags
                              const qtyInvalid = item.quantity != null && (isNaN(item.quantity) || item.quantity <= 0);
                              const rateInvalid = item.rate != null && (isNaN(item.rate) || item.rate < 0);
                              const isInvalid = qtyInvalid || rateInvalid;

                              return (
                                <div
                                  key={item.id}
                                  onClick={() => setSelectedItemId(item.id)}
                                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition ${
                                    isSelected 
                                      ? "bg-violet-950/20 border-l-3 border-violet-500" 
                                      : isApproved 
                                        ? "bg-emerald-950/5 hover:bg-emerald-950/10 border-l-3 border-emerald-600/40"
                                        : isInvalid
                                          ? "bg-red-950/5 hover:bg-red-950/10 border-l-3 border-red-500"
                                          : "hover:bg-zinc-805/30 border-l-3 border-transparent"
                                  }`}
                                >
                                  {/* Select checkbox */}
                                  <input
                                    type="checkbox"
                                    checked={item.approved}
                                    onChange={(e) => updateItemField(item.id, "approved", e.target.checked)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="rounded border-zinc-700 bg-zinc-900 text-violet-600 focus:ring-0 cursor-pointer h-3.5 w-3.5 shrink-0"
                                  />

                                  {/* Item Code */}
                                  <span className="w-12 text-[11px] font-bold text-zinc-500 truncate" title={item.item_no || ""}>
                                    {item.item_no || "—"}
                                  </span>

                                  {/* Standardized Description */}
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-xs truncate ${isApproved ? "text-zinc-400 font-medium" : "text-zinc-100"}`}>
                                      {item.description}
                                    </p>
                                    {isInvalid && (
                                      <span className="text-[10px] font-bold text-red-400">Invalid pricing parameters!</span>
                                    )}
                                  </div>

                                  {/* Qty & Unit */}
                                  <div className="text-right w-20 shrink-0">
                                    <span className="text-xs font-semibold tabular-nums text-zinc-300">
                                      {item.quantity ?? "0"}
                                    </span>
                                    <span className="text-[10px] text-zinc-500 block">
                                      {item.unit || "nos"}
                                    </span>
                                  </div>

                                  {/* Rate suggested */}
                                  <div className="text-right w-24 shrink-0">
                                    <span className={`text-xs font-semibold tabular-nums ${rateInvalid ? "text-red-400 border border-red-500/20 px-1 rounded bg-red-950/20" : "text-zinc-200"}`}>
                                      {formatPrice(item.rate)}
                                    </span>
                                    
                                    {/* Confidence badge */}
                                    <div className="mt-0.5 flex justify-end">
                                      {item.confidence != null && (
                                        <span className={`rounded-full px-1.5 py-0.2 text-[8px] font-extrabold tracking-wider uppercase ${
                                          item.confidence >= 0.85 
                                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                            : item.confidence >= 0.60 
                                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                              : "bg-red-500/10 text-red-400 border border-red-500/20"
                                        }`}>
                                          {Math.round(item.confidence * 100)}% Match
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                </div>
                              );
                            })}
                          </div>
                        )}

                      </div>
                    );
                  })
                )}
              </div>

              {/* LEFT MASTER GRID SUBFOOTER SUMMARY */}
              <div className="px-6 py-4.5 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-bold tracking-wider">Finalized Estimation Total</span>
                  <span className="text-lg font-extrabold text-violet-400 tabular-nums">{formatPrice(sumTotal)}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 px-4 py-2.5 text-xs font-bold text-zinc-300 transition"
                  >
                    + Add Custom Row
                  </button>

                  <button
                    type="button"
                    onClick={handleStructure}
                    className="inline-flex items-center rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 px-4 py-2.5 text-xs font-bold text-zinc-300 transition"
                  >
                    Re-run AI Structuring
                  </button>
                </div>
              </div>

            </div>

            {/* RIGHT DRAWER PANEL COCKPIT (40% WIDTH) */}
            <div className="w-[40%] flex flex-col bg-zinc-950 overflow-auto">
              {!selectedItem ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <svg className="h-10 w-10 text-zinc-700 animate-pulse mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                  <h4 className="text-xs font-bold text-zinc-400">No Item Selected</h4>
                  <p className="text-[11px] text-zinc-600 max-w-[240px] mt-1">Select a BOQ item from the estimator cockpit to load raw comparisons and historical rates.</p>
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  
                  {/* COCKPIT COMPOSITE CARD HEADER */}
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-zinc-400">
                          Code: {selectedItem.item_no || "Manual"}
                        </span>
                        <span className="rounded bg-violet-500/10 px-2 py-0.5 text-[10px] font-extrabold text-violet-400 uppercase">
                          {selectedItem.category}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-zinc-100">AI Quality Review</h3>
                    </div>

                    {/* Circular confidence gauge indicator */}
                    {selectedItem.confidence != null && (
                      <div className="flex items-center gap-2">
                        <div className="relative h-10 w-10 shrink-0">
                          <svg className="h-full w-full" viewBox="0 0 36 36">
                            <path className="text-zinc-800" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            <path 
                              className={selectedItem.confidence >= 0.85 ? "text-emerald-500" : selectedItem.confidence >= 0.60 ? "text-amber-500" : "text-red-500"} 
                              strokeWidth="3.2" 
                              strokeDasharray={`${Math.round(selectedItem.confidence * 100)}, 100`} 
                              strokeLinecap="round" 
                              stroke="currentColor" 
                              fill="none" 
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold tabular-nums">
                            {Math.round(selectedItem.confidence * 100)}%
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* COMPARATIVE SIDE-BY-SIDE CARDS */}
                  <div className="grid grid-cols-1 gap-3">
                    
                    {/* RAW ORIGINAL SECTION */}
                    <div className="p-3.5 rounded-2xl border border-zinc-850 bg-zinc-900/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-extrabold tracking-widest text-zinc-500 uppercase">Raw OCR Input</span>
                        <span className="text-[10px] font-semibold text-zinc-500 tabular-nums">Original</span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed font-mono select-all bg-zinc-950/30 p-2 rounded-lg break-all">
                        {selectedItem.original_text || "—"}
                      </p>
                    </div>

                    {/* AI SUGGESTED STANDARD CARD */}
                    <div className="p-3.5 rounded-2xl border border-zinc-850 bg-zinc-900/60 shadow-inner">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-extrabold tracking-widest text-violet-400 uppercase">AI Normalized Standard</span>
                        <span className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-widest block mb-0.5">Cleaned Description</label>
                          <textarea
                            rows={2}
                            value={selectedItem.description}
                            onChange={(e) => updateItemField(selectedItem.id, "description", e.target.value)}
                            className="w-full px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-600 focus:border-violet-600 outline-none resize-none transition"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-widest block mb-0.5">Quantity</label>
                            <input
                              type="number"
                              value={selectedItem.quantity ?? ""}
                              onChange={(e) => updateItemField(selectedItem.id, "quantity", e.target.value === "" ? null : parseFloat(e.target.value))}
                              className={`w-full px-2 py-1 bg-zinc-900 border rounded-lg text-xs font-semibold tabular-nums outline-none transition ${
                                selectedItem.quantity != null && (isNaN(selectedItem.quantity) || selectedItem.quantity <= 0)
                                  ? "border-red-500 text-red-400 bg-red-950/10 focus:border-red-500 focus:ring-0"
                                  : "border-zinc-800 text-zinc-200 focus:border-violet-600"
                              }`}
                            />
                          </div>

                          <div>
                            <label className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-widest block mb-0.5">Unit</label>
                            <input
                              type="text"
                              value={selectedItem.unit ?? ""}
                              onChange={(e) => updateItemField(selectedItem.id, "unit", e.target.value)}
                              className="w-full px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-semibold outline-none focus:border-violet-600 transition"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-widest block mb-0.5">Rate (₹)</label>
                            <input
                              type="number"
                              value={selectedItem.rate ?? ""}
                              onChange={(e) => updateItemField(selectedItem.id, "rate", e.target.value === "" ? null : parseFloat(e.target.value))}
                              className={`w-full px-2 py-1 bg-zinc-900 border rounded-lg text-xs font-semibold tabular-nums outline-none transition ${
                                selectedItem.rate != null && (isNaN(selectedItem.rate) || selectedItem.rate < 0)
                                  ? "border-red-500 text-red-400 bg-red-950/10 focus:border-red-500 focus:ring-0"
                                  : "border-zinc-800 text-zinc-200 focus:border-violet-600"
                              }`}
                            />
                          </div>

                          <div>
                            <label className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-widest block mb-0.5">Trade category</label>
                            <select
                              value={selectedItem.category ?? "Miscellaneous"}
                              onChange={(e) => updateItemField(selectedItem.id, "category", e.target.value)}
                              className="w-full px-2 py-1.2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-300 outline-none focus:border-violet-600 transition"
                            >
                              {CONTEXT_CATEGORIES.map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* COCKPIT DRAW-ACTION BUTTONS */}
                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleRestoreOriginal(selectedItem.id)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 px-3.5 py-2.5 text-xs font-bold text-zinc-300 transition cursor-pointer"
                      title="Roll back description, rates and units to raw OCR extracts."
                    >
                      ⟲ Restore Original
                    </button>

                    <button
                      type="button"
                      onClick={() => updateItemField(selectedItem.id, "approved", !selectedItem.approved)}
                      className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-extrabold shadow-md cursor-pointer transition ${
                        selectedItem.approved
                          ? "bg-zinc-800 border border-zinc-700 text-zinc-400"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/10"
                      }`}
                    >
                      {selectedItem.approved ? "✓ Approved" : "Approve Row"}
                    </button>
                  </div>

                  {/* 5. HISTORICAL RATE INTELLIGENCE PANEL */}
                  {matchedRates && (
                    <div className="border-t border-zinc-800/80 pt-5 space-y-4">
                      <div className="flex items-center gap-2">
                        <svg className="h-4.5 w-4.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <h4 className="text-xs font-extrabold tracking-wider uppercase text-zinc-400">Historical Rate Intelligence</h4>
                      </div>

                      {/* PROBABLE RATE CARD PROJECTION */}
                      <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-950 to-zinc-900 p-4.5 space-y-3.5 shadow-xl relative overflow-hidden">
                        
                        <div className="absolute right-0 top-0 h-16 w-16 bg-amber-500/5 blur-md rounded-full pointer-events-none" />

                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Suggested Estimate Rate</span>
                            <span className="text-xl font-black text-amber-400 tabular-nums tracking-tight">
                              {formatPrice(matchedRates.suggestedRate)}
                              <span className="text-xs font-semibold text-zinc-500 font-sans">/{selectedItem.unit || matchedRates.unit}</span>
                            </span>
                          </div>

                          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-amber-400 border border-amber-500/25">
                            AI Suggested
                          </span>
                        </div>

                        <div className="text-xs space-y-1 text-zinc-400 border-t border-zinc-850 pt-2.5">
                          <p className="flex items-center gap-1.5">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase w-14 shrink-0">Basis:</span>
                            <span className="text-zinc-300 font-medium truncate">{matchedRates.basedOnProject}</span>
                          </p>
                          <p className="flex items-center gap-1.5">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase w-14 shrink-0">Vendor:</span>
                            <span className="text-zinc-300 font-medium truncate">{matchedRates.basedOnVendor}</span>
                          </p>
                          <p className="flex items-center gap-1.5">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase w-14 shrink-0">Updated:</span>
                            <span className="text-amber-400 font-semibold">{matchedRates.updatedDaysAgo} days ago</span>
                          </p>
                        </div>

                        {/* Interactive Suggestion Apply Rate Button */}
                        <div className="border-t border-zinc-850 pt-3">
                          <button
                            type="button"
                            onClick={() => handleApplySuggestedRate(selectedItem.id, matchedRates.suggestedRate)}
                            className="w-full inline-flex items-center justify-center rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-xs font-extrabold text-zinc-950 transition-all cursor-pointer shadow-lg shadow-amber-500/10 active:scale-98"
                          >
                            Apply Suggested Rate
                          </button>
                          <span className="block text-center text-[9px] text-zinc-500 mt-1.5 italic">Est. boundaries: Users must validate and manually click to apply rate changes.</span>
                        </div>
                      </div>

                      {/* VENDOR COMPARISON MODULE */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest block">Vendor Comparisons</label>
                        <div className="rounded-xl border border-zinc-850 bg-zinc-900/30 overflow-hidden divide-y divide-zinc-850">
                          {matchedRates.vendorComparison.map((v, index) => (
                            <div key={index} className="flex items-center justify-between px-3.5 py-2.5 text-xs">
                              <div className="flex items-center gap-2">
                                <span className={`h-1.5 w-1.5 rounded-full ${index === 0 ? "bg-emerald-500 animate-pulse" : "bg-zinc-600"}`} />
                                <span className="font-medium text-zinc-300">{v.vendor}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="tabular-nums font-bold text-zinc-200">{formatPrice(v.rate)}</span>
                                <span className="text-[10px] text-zinc-500 shrink-0">{v.date}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* PROJECT HISTORICAL RECORDS (CITY BASED PRICING) */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest block">City-Based Project History</label>
                        <div className="rounded-xl border border-zinc-850 bg-zinc-900/30 overflow-hidden divide-y divide-zinc-850">
                          {matchedRates.projectHistory.map((p, index) => (
                            <div key={index} className="flex items-center justify-between px-3.5 py-2.5 text-xs">
                              <div>
                                <span className="font-semibold text-zinc-300 block">{p.project}</span>
                                <span className="text-[9px] font-extrabold uppercase text-violet-400 tracking-wider flex items-center gap-1">
                                  <svg className="h-3 w-3 text-violet-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  {p.city}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="tabular-nums font-bold text-zinc-200 block">{formatPrice(p.rate)}</span>
                                <span className="text-[10px] text-zinc-500">{p.date}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* HISTORICAL TRENDS TIMELINE */}
                      <div className="space-y-3">
                        <label className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest block">6-Month Rate History Trends</label>
                        
                        <div className="p-3.5 rounded-xl border border-zinc-850 bg-zinc-900/20 space-y-3">
                          
                          {/* Mini dynamic graph visualization */}
                          <div className="h-16 w-full relative flex items-end justify-between px-4 pb-2 pt-2 bg-zinc-950/60 rounded-xl overflow-hidden">
                            
                            {/* Grid Lines */}
                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-5">
                              <div className="border-b border-white w-full h-0" />
                              <div className="border-b border-white w-full h-0" />
                              <div className="border-b border-white w-full h-0" />
                            </div>

                            {/* Dynamically drew trend path via SVG */}
                            <svg className="absolute inset-0 h-full w-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
                              <path 
                                d={`M 10 70 Q 40 45 70 30 T 90 20`} 
                                fill="none" 
                                stroke="url(#trendGrad)" 
                                strokeWidth="3" 
                                strokeLinecap="round"
                              />
                              <defs>
                                <linearGradient id="trendGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                                  <stop offset="0%" stopColor="#818cf8" stopOpacity="0.4" />
                                  <stop offset="100%" stopColor="#f59e0b" />
                                </linearGradient>
                              </defs>
                            </svg>

                            {matchedRates.timeline.map((t, idx) => (
                              <div key={idx} className="flex flex-col items-center z-10">
                                <span className="text-[9px] font-bold text-amber-400 tabular-nums">₹{t.rate}</span>
                                <div className="h-1.5 w-1.5 rounded-full bg-zinc-400 border border-zinc-900 my-0.5" />
                                <span className="text-[8px] text-zinc-500 font-semibold">{t.date}</span>
                              </div>
                            ))}
                          </div>

                        </div>
                      </div>

                    </div>
                  )}

                </div>
              )}
            </div>

          </div>
        )}

        {/* WORKSPACE MAIN FOOTER FOR MULTI-STAGE CONTROLS */}
        {modalState === "structured_preview" && (
          <div className="border-t border-zinc-800 bg-zinc-950 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-zinc-400 max-w-xl text-center sm:text-left">
              Verify the categories, apply matched historical rate recommendations, and double-check inputs. Edits automatically sync to Vertex contracting branded Excel sheets.
            </p>

            <div className="flex flex-wrap justify-end gap-3 w-full sm:w-auto">
              {exportError && (
                <span className="text-xs text-red-400 font-bold shrink-0 self-center">{exportError}</span>
              )}

              <button
                type="button"
                onClick={handleExport}
                disabled={exporting || editableItems.length === 0}
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? (
                  <>
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                    Generating Excel...
                  </>
                ) : (
                  "Export Cleaned Excel"
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
