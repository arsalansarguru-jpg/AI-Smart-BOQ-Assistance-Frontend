"use client";

import { useEffect, useState, useRef, useMemo, Fragment } from "react";
import PageBreadcrumb from "@/app/(app)/_components/page-breadcrumb";
import { fetchVendorQuotations, type LocalVendorQuotation } from "@/lib/tenders/quotations";
import { createClient } from "@/lib/supabase/client";
import { autoLinkProjectFiles, matchPriceListCatalog } from "@/lib/api";
import type { TenderFile } from "@/lib/types";
import { toast } from "sonner";

// Workspace BOQ Item Model
export type WorkspaceBoqItem = {
  id: string;
  item_no: string;
  category: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  suggestedRate: number;
  selectedVendor: string;
  amount: number;
  confidence: number;
  approved: boolean;
  // Approval states
  status: "Draft" | "Pending Senior Review" | "Pending Procurement" | "Approved" | "Revision Requested";
  changeRequestComment?: string;
  // Cost Buildup Suit
  listPrice?: number;
  discountPercentage?: number;
  overheadPercentage?: number;
  laborCost?: number;
  rateType?: 'unit' | 'composite';
  // Relationship links
  references: {
    drawings: { id: string; sheetNumber: string; title: string; fileUrl: string }[];
    makes: { brand: string; status: "Approved" | "Preferred" | "Alternative" }[];
    clauses?: { id: string; clauseNumber: string; title: string; summary: string; originalText?: string }[];
    vendorQuotes?: { id: string; vendorName: string; quoteNumber: string; rate: number; fileUrl: string }[];
    risks?: { id: string; riskId: string; riskDescription: string; severity: "high" | "medium" | "low"; status: string }[];
    notes: string;
  };
};

function recalculateItemRates(item: WorkspaceBoqItem): WorkspaceBoqItem {
  if (item.rateType === "composite") {
    const listPrice = item.listPrice !== undefined ? item.listPrice : item.rate;
    const discount = item.discountPercentage ?? 0;
    const overhead = item.overheadPercentage ?? 0;
    const labor = item.laborCost ?? 0;

    const netMaterial = listPrice * (1 - discount / 100);
    const landedMaterial = netMaterial * (1 + overhead / 100);
    const compositeRate = parseFloat((landedMaterial + labor).toFixed(2));

    return {
      ...item,
      listPrice,
      rate: compositeRate,
      amount: parseFloat((compositeRate * item.quantity).toFixed(2)),
    };
  } else {
    return {
      ...item,
      amount: parseFloat((item.rate * item.quantity).toFixed(2)),
    };
  }
}

export type EstimateProject = {
  id: string;
  name: string;
  region: string;
  client: string;
};

export type SourcingVendor = {
  name: string;
  type: string;
  presence: string;
  contact_info: string;
  sourcing_rating: string;
  description: string;
};

// Git-style Revision Model
export type BoqRevision = {
  id: string;
  projectId: string;
  versionNumber: string; // v1, v2, v3
  createdAt: string;
  author: string;
  comment: string;
  notes?: string;
  items: WorkspaceBoqItem[];
};

// Historical rates database
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

const SUPPORTED_CATEGORIES = [
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

// Region cost variances
const REGIONAL_FACTORS: Record<string, { label: string; factor: number }> = {
  Mumbai: { label: "Mumbai (Base)", factor: 1.0 },
  Delhi: { label: "Delhi NCR", factor: 0.95 },
  Bangalore: { label: "Bangalore IT", factor: 1.05 },
  Chennai: { label: "Chennai", factor: 0.98 },
  Dubai: { label: "Dubai UAE", factor: 1.45 },
};

function formatPrice(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "₹0.00";
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function cleanString(str: string): string {
  return (str || "").toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}

function getSimilarityScore(str1: string, str2: string): number {
  const s1 = cleanString(str1);
  const s2 = cleanString(str2);
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1.0;

  const w1 = s1.split(" ");
  const w2 = s2.split(" ");

  const set1 = new Set(w1);
  const set2 = new Set(w2);

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  const tokenScore = intersection.size / union.size;

  const getBigrams = (s: string) => {
    const bigrams = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) {
      bigrams.add(s.slice(i, i + 2));
    }
    return bigrams;
  };
  const b1 = getBigrams(s1);
  const b2 = getBigrams(s2);
  const bInter = new Set([...b1].filter(x => b2.has(x)));
  const bUnion = new Set([...b1, ...b2]);
  const charScore = bUnion.size > 0 ? bInter.size / bUnion.size : 0;

  let hybrid = tokenScore * 0.6 + charScore * 0.4;

  const getNumbers = (s: string) => {
    return s.match(/\b\d+\b|\b\d+c\b|\b\d+sqm\b/g) || [];
  };
  const n1 = getNumbers(s1);
  const n2 = getNumbers(s2);
  if (n1.length > 0 && n2.length > 0) {
    const setN1 = new Set(n1);
    const setN2 = new Set(n2);
    const nInter = [...setN1].filter(x => setN2.has(x));
    if (nInter.length === 0) {
      hybrid *= 0.5;
    } else {
      hybrid = Math.min(1.0, hybrid + 0.15);
    }
  }

  return Math.round(hybrid * 100) / 100;
}

export default function MasterBoqWorkspace() {
  const [projects, setProjects] = useState<EstimateProject[]>([
    { id: "default-mep-project", name: "Grand Plaza MEP Complex", region: "Mumbai", client: "Grand Plaza Developers Ltd" },
    { id: "second-mep-project", name: "Metro Station Block A", region: "Delhi", client: "Delhi Metro Rail Corp" },
    { id: "empty-mep-project", name: "Horizon Business Park", region: "Bangalore", client: "Horizon Properties Inc" },
  ]);

  const [selectedProjectId, setSelectedProjectId] = useState<string>("default-mep-project");
  const [projectFiles, setProjectFiles] = useState<TenderFile[]>([]);
  const [autoLinkingLoading, setAutoLinkingLoading] = useState(false);
  const [activeRegion, setActiveRegion] = useState<string>("Mumbai");
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  
  // Workflow variables
  const [currentUserRole, setCurrentUserRole] = useState<"junior" | "senior" | "procurement" | "admin">("junior");
  const [boqLocked, setBoqLocked] = useState<boolean>(false);
  
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"grid" | "timeline" | "comparison" | "relationship-map">("grid");
  
  const [items, setItems] = useState<WorkspaceBoqItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  
  // Search, Grouping, Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [queueFilter, setQueueFilter] = useState<"all" | "my-queue" | "pending-senior" | "pending-procurement" | "approved" | "change-requests">("all");
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  
  // Git Revisions State
  const [revisions, setRevisions] = useState<BoqRevision[]>([]);
  const [comparingRevisionId, setComparingRevisionId] = useState<string | null>(null);
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [commitComment, setCommitComment] = useState("");
  const [commitNotes, setCommitNotes] = useState("");
  
  // Change Request Feedback Modal State
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackComment, setFeedbackComment] = useState("");
  
  // Blueprint CAD Viewer State
  const [activeDrawingSheet, setActiveDrawingSheet] = useState<{ sheetNumber: string; title: string } | null>(null);

  // Autosave indicators
  const [autosaveStatus, setAutosaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [vendorQuotations, setVendorQuotations] = useState<LocalVendorQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [reconciledIds, setReconciledIds] = useState<Set<string>>(new Set());

  // AI Sourcing State
  const [sourcingLoading, setSourcingLoading] = useState(false);
  const [sourcingResults, setSourcingResults] = useState<SourcingVendor[] | null>(null);
  const [sourcingError, setSourcingError] = useState<string | null>(null);
  
  // Clear sourcing when item selection changes
  useEffect(() => {
    setSourcingResults(null);
    setSourcingError(null);
    setSourcingLoading(false);
  }, [selectedItemId]);

  const savingsAnalysis = useMemo(() => {
    if (items.length === 0 || vendorQuotations.length === 0) return null;

    let totalSavings = 0;
    const itemsToReconcile = [];

    for (const boqItem of items) {
      if (boqItem.status === "Approved") continue;
      
      let bestMatch: { rate: number; vendor: string; score: number } | null = null;

      for (const q of vendorQuotations) {
        for (const qItem of q.items) {
          const score = getSimilarityScore(boqItem.description, qItem.item_name);
          
          if (score >= 0.65) {
            if (!bestMatch || qItem.quoted_rate < bestMatch.rate) {
              bestMatch = { rate: qItem.quoted_rate, vendor: q.vendor_name, score };
            }
          }
        }
      }

      if (bestMatch && bestMatch.rate < boqItem.rate) {
        const delta = boqItem.rate - bestMatch.rate;
        const savings = delta * boqItem.quantity;
        totalSavings += savings;
        itemsToReconcile.push({
          itemId: boqItem.id,
          originalRate: boqItem.rate,
          suggestedRate: bestMatch.rate,
          vendorName: bestMatch.vendor,
          savings
        });
      }
    }

    return {
      totalSavings,
      opportunitiesCount: itemsToReconcile.length,
      itemsToReconcile
    };
  }, [items, vendorQuotations]);

  const applyAiOptimizations = () => {
    if (!savingsAnalysis || savingsAnalysis.itemsToReconcile.length === 0) return;
    
    const newItems = items.map(boqItem => {
      const opportunity = savingsAnalysis.itemsToReconcile.find(opt => opt.itemId === boqItem.id);
      if (opportunity) {
        const matchingQuote = vendorQuotations.flatMap(q => 
          q.items.map(it => ({ q, it }))
        ).find(x => x.q.vendor_name === opportunity.vendorName && x.it.quoted_rate === opportunity.suggestedRate);
        
        const newVendorQuoteReference = matchingQuote ? {
          id: matchingQuote.it.id || `vq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          vendorName: opportunity.vendorName,
          quoteNumber: matchingQuote.q.id.substr(0, 8).toUpperCase(),
          rate: opportunity.suggestedRate,
          fileUrl: "#"
        } : {
          id: `vq-${Date.now()}`,
          vendorName: opportunity.vendorName,
          quoteNumber: "AI-OPT",
          rate: opportunity.suggestedRate,
          fileUrl: "#"
        };

        const currentQuotes = boqItem.references.vendorQuotes || [];
        const quoteExists = currentQuotes.some(q => q.vendorName === opportunity.vendorName && q.rate === opportunity.suggestedRate);
        const updatedQuotes = quoteExists ? currentQuotes : [...currentQuotes, newVendorQuoteReference];

        return {
          ...boqItem,
          rate: opportunity.suggestedRate,
          amount: opportunity.suggestedRate * boqItem.quantity,
          selectedVendor: opportunity.vendorName,
          references: {
            ...boqItem.references,
            vendorQuotes: updatedQuotes
          }
        };
      }
      return boqItem;
    });

    const optimizedIds = new Set(savingsAnalysis.itemsToReconcile.map(o => o.itemId));
    setReconciledIds(optimizedIds);
    setItems(newItems);
    saveWorkspaceState(newItems);
    
    setTimeout(() => {
      setReconciledIds(new Set());
    }, 4000);
  };

  // Relationship Map local states & toggle mappings
  const [sidebarTab, setSidebarTab] = useState<"specs" | "buildup" | "map">("specs");
  const [catalogMatchingLoading, setCatalogMatchingLoading] = useState(false);
  const [focusedGraphNode, setFocusedGraphNode] = useState<"drawing" | "clause" | "make" | "quote" | "risk">("drawing");
  const [graphSearchQuery, setGraphSearchQuery] = useState("");
  const [gapFilter, setGapFilter] = useState<"all" | "missing-dwg" | "missing-bid" | "high-risk" | "unlinked">("all");

  const toggleDrawingLink = (itemId: string, dwgId: string) => {
    const MASTER_DRAWINGS = {
      "dwg-1": { id: "dwg-1", sheetNumber: "H-102", title: "HVAC Piping Plan Layout", fileUrl: "#" },
      "dwg-2": { id: "dwg-2", sheetNumber: "H-104", title: "AHU Plan Schematic", fileUrl: "#" },
      "dwg-3": { id: "dwg-3", sheetNumber: "E-204", title: "Distribution Block Details", fileUrl: "#" },
      "dwg-4": { id: "dwg-4", sheetNumber: "P-101", title: "Plumbing Riser Plan", fileUrl: "#" },
      "dwg-5": { id: "dwg-5", sheetNumber: "F-102", title: "Sprinkler Layout Ceiling Plan", fileUrl: "#" }
    };
    const target = MASTER_DRAWINGS[dwgId as keyof typeof MASTER_DRAWINGS];
    if (!target) return;

    const updated = items.map(item => {
      if (item.id === itemId) {
        const drawings = item.references.drawings || [];
        const exists = drawings.some(d => d.id === dwgId);
        const newDrawings = exists 
          ? drawings.filter(d => d.id !== dwgId)
          : [...drawings, target];
        return {
          ...item,
          references: {
            ...item.references,
            drawings: newDrawings
          }
        };
      }
      return item;
    });
    setItems(updated);
    saveWorkspaceState(updated);
  };

  const toggleClauseLink = (itemId: string, clauseId: string) => {
    const MASTER_CLAUSES = {
      "cl-1": { id: "cl-1", clauseNumber: "Section 14.2 (a)", title: "Delay Damages", summary: "Penalty of 0.5% per week of delay up to a max cap of 10% of total bid value.", originalText: "Contractor shall pay Liquidated Damages to the Employer at the rate of 0.5% of the Contract Price per week of delay, up to a maximum cap of 10% of the final Contract Price." },
      "cl-2": { id: "cl-2", clauseNumber: "Section 17.3", title: "Equipment Warranty", summary: "Heavy mechanical items must hold a minimum 60-month onsite replacement warranty.", originalText: "All critical heavy mechanical equipment including AHUs, chillers, and pumps shall be supplied with a minimum manufacturer warranty of 60 months from the date of commissioning." },
      "cl-3": { id: "cl-3", clauseNumber: "Section 8.4 (b)", title: "Payment Terms", summary: "90 days credit terms post-delivery. Retainage of 10% held until final site handover.", originalText: "Employer shall release progress payments within 90 days of certified invoice clearance. 10% of each invoice will be withheld as retainage until final handover." },
      "cl-4": { id: "cl-4", clauseNumber: "Section 3.1 (d)", title: "Design & Routing Verification", summary: "Contractor is solely liable for any clash or routing design discrepancy identified post-award.", originalText: "The Contractor warrants they have verified the site layouts. Any clashes, coordinate overlaps, or rerouting required during execution shall be completed at the Contractor's sole expense." },
      "cl-5": { id: "cl-5", clauseNumber: "Section 5.2", title: "Project Timeline", summary: "Accelerated double shift work required with no additional compensation for Sunday work.", originalText: "To meet the aggressive handover deadline, double shift or round-the-clock working is deemed included in the bid price. No premium rate or Sunday overtime is payable." },
      "cl-6": { id: "cl-6", clauseNumber: "Section 9.1", title: "Force Majeure exclusions", summary: "Imported components customs delay or shipping container shortage is not an excusable delay.", originalText: "Force Majeure shall strictly exclude any supply chain delays, port congestion, customs clearance issues, or shipping container shortages." }
    };
    const target = MASTER_CLAUSES[clauseId as keyof typeof MASTER_CLAUSES];
    if (!target) return;

    const updated = items.map(item => {
      if (item.id === itemId) {
        const clauses = item.references.clauses || [];
        const exists = clauses.some(c => c.id === clauseId);
        const newClauses = exists
          ? clauses.filter(c => c.id !== clauseId)
          : [...clauses, target];
        return {
          ...item,
          references: {
            ...item.references,
            clauses: newClauses
          }
        };
      }
      return item;
    });
    setItems(updated);
    saveWorkspaceState(updated);
  };

  const toggleVendorQuoteLink = (itemId: string, quoteId: string) => {
    const MASTER_QUOTES = {
      "vq-1": { id: "vq-1", vendorName: "Havells", quoteNumber: "HV-9082", rate: 145, fileUrl: "#" },
      "vq-2": { id: "vq-2", vendorName: "ABC Metals & Tubes", quoteNumber: "ABC-MET-22", rate: 425, fileUrl: "#" },
      "vq-3": { id: "vq-3", vendorName: "Supreme Piping Corp", quoteNumber: "SUP-902", rate: 440, fileUrl: "#" },
      "vq-4": { id: "vq-4", vendorName: "Polycab", quoteNumber: "POL-209", rate: 38, fileUrl: "#" },
      "vq-5": { id: "vq-5", vendorName: "Tata Steel Piping", quoteNumber: "TATA-PIP-04", rate: 650, fileUrl: "#" },
      "vq-6": { id: "vq-6", vendorName: "Tyco Fire Protection", quoteNumber: "TYCO-FF-11", rate: 850, fileUrl: "#" },
      "vq-7": { id: "vq-7", vendorName: "Grundfos India", quoteNumber: "GR-9021", rate: 15500, fileUrl: "#" }
    };
    const target = MASTER_QUOTES[quoteId as keyof typeof MASTER_QUOTES];
    if (!target) return;

    const updated = items.map(item => {
      if (item.id === itemId) {
        const quotes = item.references.vendorQuotes || [];
        const exists = quotes.some(q => q.id === quoteId);
        const newQuotes = exists
          ? quotes.filter(q => q.id !== quoteId)
          : [...quotes, target];
        return {
          ...item,
          references: {
            ...item.references,
            vendorQuotes: newQuotes
          }
        };
      }
      return item;
    });
    setItems(updated);
    saveWorkspaceState(updated);
  };

  const toggleRiskLink = (itemId: string, riskId: string) => {
    const MASTER_RISKS = {
      "rk-1": { id: "rk-1", riskId: "rk-1", riskDescription: "Uncapped Liquidated Damages Liability", severity: "high" as const, status: "Unmitigated" },
      "rk-2": { id: "rk-2", riskId: "rk-2", riskDescription: "Extended Equipment Warranty Requirement", severity: "medium" as const, status: "Reviewed" },
      "rk-3": { id: "rk-3", riskId: "rk-3", riskDescription: "Negative Cash Flow Due to 90-day Credit Terms", severity: "high" as const, status: "Unmitigated" },
      "rk-4": { id: "rk-4", riskId: "rk-4", riskDescription: "Design & Routing Discrepancy Liability Shift", severity: "medium" as const, status: "Reviewed" },
      "rk-5": { id: "rk-5", riskId: "rk-5", riskDescription: "Short Schedule Acceleration Penalty", severity: "high" as const, status: "Reviewed" },
      "rk-6": { id: "rk-6", riskId: "rk-6", riskDescription: "Customs Delay / Global Supply Chain Disruptions", severity: "low" as const, status: "Mitigated" }
    };
    const target = MASTER_RISKS[riskId as keyof typeof MASTER_RISKS];
    if (!target) return;

    const updated = items.map(item => {
      if (item.id === itemId) {
        const risks = item.references.risks || [];
        const exists = risks.some(r => r.id === riskId);
        const newRisks = exists
          ? risks.filter(r => r.id !== riskId)
          : [...risks, target];
        return {
          ...item,
          references: {
            ...item.references,
            risks: newRisks
          }
        };
      }
      return item;
    });
    setItems(updated);
    saveWorkspaceState(updated);
  };

  const handleNegotiateEmail = (vendorName: string, currentRate: number, quoteNumber: string) => {
    if (!selectedItemId) return;
    const boqItem = items.find(it => it.id === selectedItemId);
    if (!boqItem) return;

    // Find if there is a cheaper competitor rate in vendor quotes
    const competitorQuotes = boqItem.references.vendorQuotes || [];
    const cheaperCompetitor = competitorQuotes
      .filter(q => q.vendorName !== vendorName && q.rate < currentRate)
      .sort((a, b) => a.rate - b.rate)[0];

    // Find suggested/historical rate
    const historicalRec = getHistoricalRates(boqItem.description, boqItem.category);
    const historicalRate = historicalRec ? historicalRec.suggestedRate : null;

    // Determine target rate to negotiate towards
    let targetRate = currentRate;
    let rateSource = "";

    if (cheaperCompetitor) {
      targetRate = cheaperCompetitor.rate;
      rateSource = `competitor bid (from ${cheaperCompetitor.vendorName})`;
    } else if (historicalRate && historicalRate < currentRate) {
      targetRate = historicalRate;
      rateSource = `our historical project database average`;
    } else {
      // Fallback: request a standard 10% volume discount
      targetRate = Math.round(currentRate * 0.9);
      rateSource = `volume-discount benchmarks`;
    }

    const projectName = activeProject ? activeProject.name : "our current construction development";
    const clientName = activeProject ? activeProject.client : "our client";

    const mailSubject = `Price Match Request - ${boqItem.description} (Ref: ${quoteNumber})`;
    const mailBody = `Dear ${vendorName} Sales Team,

We are currently reviewing vendor bids for the ${boqItem.category} package on our project "${projectName}" for ${clientName}.

We received your quotation (Ref: ${quoteNumber}) for the following line item:
- Item: ${boqItem.description}
- Quantity: ${boqItem.quantity} ${boqItem.unit}
- Quoted Rate: ₹${currentRate.toLocaleString("en-IN")}/${boqItem.unit}

We highly value your brand reputation and quality of service, and would prefer to award this contract to you. However, we have received a competitive rate of ₹${targetRate.toLocaleString("en-IN")}/${boqItem.unit} based on ${rateSource}.

Would you be open to matching this target rate of ₹${targetRate.toLocaleString("en-IN")}/${boqItem.unit} for this order? Matching this rate would allow us to proceed with issuing the purchase order to you immediately.

We look forward to your positive response by the end of this week so we can finalize the contract.

Best regards,

Procurement & Estimating Team
${projectName}
Office of Procurement`;

    const mailtoUrl = `mailto:sales@${vendorName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`;
    window.open(mailtoUrl);
  };

  const handleMitigateRisk = (itemId: string, riskId: string, action: "apply" | "restore") => {
    const updated = items.map(item => {
      if (item.id === itemId) {
        const risks = item.references.risks || [];
        const targetRisk = risks.find(r => r.id === riskId);
        if (!targetRisk) return item;

        // Determine multiplier based on risk ID
        let multiplier = 1.03; // Default 3%
        let noteToken = "";
        
        if (riskId === "rk-1" || riskId === "rk-1-alt") {
          multiplier = 1.035;
          noteToken = "[🛡 Mitigated: Delay Liquidated Damages capped at 5% of Contract Value; 3.5% financing buffer added to rate]";
        } else if (riskId === "rk-2") {
          multiplier = 1.05;
          noteToken = "[🛡 Mitigated: Equipment warranty extended to 60-month; 5% warranty reserve buffer added to rate]";
        } else if (riskId === "rk-3") {
          multiplier = 1.04;
          noteToken = "[🛡 Mitigated: 90-day credit term risk offset; 4% working capital interest buffer added to rate]";
        } else if (riskId === "rk-4") {
          multiplier = 1.03;
          noteToken = "[🛡 Mitigated: Routing clash liability buffer; 3% design-risk contingency added to rate]";
        } else if (riskId === "rk-5") {
          multiplier = 1.06;
          noteToken = "[🛡 Mitigated: Fast-track double shift schedule offset; 6% acceleration labor reserve added to rate]";
        } else {
          noteToken = `[🛡 Mitigated: Risk ${riskId} resolved; 3% rate contingency buffer added]`;
        }

        let newRate = item.rate;
        let newRisks = risks;
        let newNotes = item.references.notes || "";

        if (action === "apply") {
          if (targetRisk.status === "Mitigated") return item; // Already mitigated

          newRate = Math.round(item.rate * multiplier * 100) / 100;
          newRisks = risks.map(r => r.id === riskId ? { ...r, status: "Mitigated" } : r);
          
          // Append note token if not already present
          if (!newNotes.includes(noteToken)) {
            newNotes = newNotes ? `${newNotes} ${noteToken}` : noteToken;
          }
        } else {
          if (targetRisk.status !== "Mitigated") return item; // Not mitigated, can't restore

          newRate = Math.round((item.rate / multiplier) * 100) / 100;
          newRisks = risks.map(r => r.id === riskId ? { ...r, status: "Unmitigated" } : r);
          
          // Remove note token
          newNotes = newNotes.replace(noteToken, "").trim();
        }

        return {
          ...item,
          rate: newRate,
          amount: Math.round(newRate * item.quantity * 100) / 100,
          references: {
            ...item.references,
            risks: newRisks,
            notes: newNotes
          }
        };
      }
      return item;
    });

    setItems(updated);
    saveWorkspaceState(updated);
  };

  const handleDiscoverVendors = async () => {
    if (!selectedItemId) return;
    const boqItem = items.find(it => it.id === selectedItemId);
    if (!boqItem) return;

    setSourcingLoading(true);
    setSourcingError(null);
    setSourcingResults(null);

    try {
      const res = await fetch("/api/backend/sourcing/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: boqItem.description,
          region: activeRegion,
          category: boqItem.category
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to query sourcing directory.");
      }

      const data = await res.json();
      setSourcingResults(data.vendors || []);
    } catch (err) {
      console.error("AI Sourcing search failed", err);
      setSourcingError(err instanceof Error ? err.message : "Sourcing failed.");
    } finally {
      setSourcingLoading(false);
    }
  };

  const handleQueryAiCatalog = async () => {
    if (!selectedItemId) return;
    const boqItem = items.find(it => it.id === selectedItemId);
    if (!boqItem) return;

    if (subscribed === false) {
      toast.error("Upgrade Plan Required", {
        description: "AI Price List Catalog Lookup is a Professional Plan feature. Upgrade your workspace now!",
        action: {
          label: "Upgrade Plan",
          onClick: () => window.location.href = "/pricing"
        }
      });
      return;
    }

    // Filter project files for catalogs or price lists
    const catalogFiles = projectFiles
      .filter(f => f.category === "make_list" || f.file_name.toLowerCase().includes("pricelist") || f.file_name.toLowerCase().includes("catalog"))
      .map(f => f.file_name);

    if (catalogFiles.length === 0) {
      toast.warning("No Catalog Files Uploaded", {
        description: "Please upload a manufacturer catalog or price list PDF in the project repository first (under 'make_list').",
      });
      return;
    }

    setCatalogMatchingLoading(true);
    const toastId = toast.loading("AI Catalog matching is running...", {
      description: `Searching for '${boqItem.description}' across ${catalogFiles.length} uploaded catalogs...`,
    });

    try {
      const res = await matchPriceListCatalog({
        description: boqItem.description,
        category: boqItem.category,
        price_lists: catalogFiles
      });

      if (res && res.matched) {
        const listPriceVal = res.list_price || boqItem.rate;
        const discountVal = res.discount || 0;
        
        const updated = items.map(item => {
          if (item.id === boqItem.id) {
            let copy: WorkspaceBoqItem = {
              ...item,
              rateType: "composite" as const,
              listPrice: listPriceVal,
              discountPercentage: discountVal,
              overheadPercentage: item.overheadPercentage ?? 5,
              laborCost: item.laborCost ?? 0,
            };
            
            if (res.brand) {
              const currentMakes = item.references.makes || [];
              if (!currentMakes.some(m => m.brand.toLowerCase() === res.brand!.toLowerCase())) {
                copy.references = {
                  ...item.references,
                  makes: [...currentMakes, { brand: res.brand, status: "Approved" }]
                };
              }
            }

            if (res.notes) {
              copy.references = {
                ...copy.references,
                notes: copy.references.notes ? `${copy.references.notes} [AI Catalog: ${res.notes}]` : `[AI Catalog: ${res.notes}]`
              };
            }

            copy = recalculateItemRates(copy);
            return copy;
          }
          return item;
        });

        setItems(updated);
        localStorage.setItem(`boq_workspace_${selectedProjectId}`, JSON.stringify(updated));

        toast.success("AI Price List Match Found!", {
          id: toastId,
          description: `Matched with ${res.brand || "Catalog"} (MSRP: ₹${listPriceVal.toLocaleString("en-IN")}, Discount: ${discountVal}%). Updated rate to ₹${recalculateItemRates(updated.find(it => it.id === boqItem.id)!).rate.toLocaleString("en-IN")}.`,
        });
      } else {
        toast.warning("No Catalog Match Found", {
          id: toastId,
          description: `AI could not find a clear match for this item in the uploaded catalogs. Standard unit rate is preserved.`,
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("AI Catalog Matching Failed", {
        id: toastId,
        description: err instanceof Error ? err.message : "Lookup failed.",
      });
    } finally {
      setCatalogMatchingLoading(false);
    }
  };

  const handleLinkDiscoveredVendor = (vendor: SourcingVendor) => {
    if (!selectedItemId) return;
    const boqItem = items.find(it => it.id === selectedItemId);
    if (!boqItem) return;

    const defaultRate = boqItem.rate;
    const vqId = `vq-ai-${Date.now()}`;
    const newQuote = {
      id: vqId,
      vendorName: vendor.name,
      quoteNumber: `AI-DIR-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      rate: defaultRate,
      fileUrl: "#"
    };

    const updated = items.map(item => {
      if (item.id === selectedItemId) {
        const quotes = item.references.vendorQuotes || [];
        if (quotes.some(q => q.vendorName === vendor.name)) return item; // Already linked
        return {
          ...item,
          references: {
            ...item.references,
            vendorQuotes: [...quotes, newQuote]
          }
        };
      }
      return item;
    });

    setItems(updated);
    saveWorkspaceState(updated);
    
    // Force update local results state to show linked indicator
    setSourcingResults(prev => prev ? prev.filter(v => v.name !== vendor.name) : null);
  };

  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeProject = useMemo(() => projects.find(p => p.id === selectedProjectId), [projects, selectedProjectId]);

  // Load Vendor quotations
  useEffect(() => {
    async function loadQuotations() {
      try {
        const { quotations } = await fetchVendorQuotations();
        setVendorQuotations(quotations);
      } catch (err) {
        console.error("Failed to load vendor quotations", err);
      }
    }
    loadQuotations();
  }, []);

  // Load real tender projects from Supabase on mount
  useEffect(() => {
    async function loadRealTenders() {
      try {
        const supabase = createClient();
        const { data: userSession } = await supabase.auth.getSession();
        if (!userSession?.session) return;

        const { data: tenderProjects, error } = await supabase
          .from("tender_projects")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (tenderProjects) {
          const mapped = tenderProjects.map((tp: any) => ({
            id: tp.id,
            name: tp.tender_name,
            region: "Mumbai", // default
            client: tp.client_name
          }));
          setProjects(prev => {
            const existingIds = new Set(mapped.map(m => m.id));
            const filteredPrev = prev.filter(p => !existingIds.has(p.id));
            return [...mapped, ...filteredPrev];
          });
        }
      } catch (err) {
        console.error("Failed to fetch tender projects from Supabase:", err);
      }
    }
    loadRealTenders();
  }, []);

  // Check active SaaS subscription
  useEffect(() => {
    async function checkSubscription() {
      if (process.env.NEXT_PUBLIC_BYPASS_SUBSCRIPTION === "true") {
        setSubscribed(true);
        return;
      }

      try {
        const supabase = createClient();
        const { data: userSession } = await supabase.auth.getSession();
        if (!userSession?.session) {
          setSubscribed(false);
          return;
        }

        const { data: subs, error } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("status", "active");

        if (error) throw error;
        if (subs && subs.length > 0) {
          setSubscribed(true);
        } else {
          setSubscribed(false);
        }
      } catch (err) {
        console.error("Subscription verification failed:", err);
        setSubscribed(false);
      }
    }
    checkSubscription();
  }, [selectedProjectId]);

  // Seed default templates and revisions
  useEffect(() => {
    setLoading(true);
    if (typeof window === "undefined") return;

    const cacheKey = `boq_workspace_${selectedProjectId}`;
    const revisionKey = `boq_revisions_${selectedProjectId}`;
    
    const stored = localStorage.getItem(cacheKey);
    const storedRevs = localStorage.getItem(revisionKey);

    let activeItemsList: WorkspaceBoqItem[] = [];

    if (stored) {
      try {
        activeItemsList = JSON.parse(stored);
      } catch {
        activeItemsList = seedProjectData(selectedProjectId);
      }
    } else {
      activeItemsList = seedProjectData(selectedProjectId);
    }

    setItems(activeItemsList);
    if (activeItemsList.length > 0) {
      setSelectedItemId(activeItemsList[0].id);
    } else {
      setSelectedItemId(null);
    }

    // Set region based on project default
    const proj = projects.find(p => p.id === selectedProjectId);
    if (proj) {
      setActiveRegion(proj.region);
    }

    // Load or seed Git revisions
    if (storedRevs) {
      try {
        setRevisions(JSON.parse(storedRevs));
      } catch {
        seedRevisionsData(selectedProjectId, activeItemsList);
      }
    } else {
      seedRevisionsData(selectedProjectId, activeItemsList);
    }

    // Fetch associated tender files if this is a custom project (UUID format)
    async function loadFiles() {
      try {
        const supabase = createClient();
        const { data: files } = await supabase
          .from("tender_files")
          .select("*")
          .eq("tender_project_id", selectedProjectId);
        if (files) {
          setProjectFiles(files);
        } else {
          setProjectFiles([]);
        }
      } catch (err) {
        console.error("Failed to load project files from Supabase:", err);
        setProjectFiles([]);
      }
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedProjectId);
    if (isUuid) {
      loadFiles();
    } else {
      setProjectFiles([]);
    }

    setLoading(false);
  }, [selectedProjectId, projects]);

  // AI Document Auto-Linker
  const handleAutoLink = async () => {
    if (subscribed === false) {
      toast.error("Upgrade Plan Required", {
        description: "AI Document Auto-linking is a Professional Plan feature. Upgrade your workspace now!",
        action: {
          label: "Upgrade Plan",
          onClick: () => window.location.href = "/pricing"
        }
      });
      return;
    }

    if (items.length === 0) {
      toast.warning("No items in workspace", {
        description: "Please extract or add BOQ items first.",
      });
      return;
    }

    const drawings = projectFiles
      .filter((f) => f.category === "drawings")
      .map((f) => ({ id: f.id, file_name: f.file_name }));

    const makeLists = projectFiles
      .filter((f) => f.category === "make_list")
      .map((f) => f.file_name);

    if (drawings.length === 0 && makeLists.length === 0) {
      toast.warning("No drawings or make lists", {
        description: "Please upload drawings or make list files in the project repository first.",
      });
      return;
    }

    setAutoLinkingLoading(true);
    const toastId = toast.loading("AI Auto-Linker is running...", {
      description: `Analyzing ${items.length} items against ${drawings.length} drawings and make lists...`,
    });

    try {
      const boqItemsReq = items.map((it) => ({
        id: it.id,
        description: it.description,
        category: it.category,
      }));

      const res = await autoLinkProjectFiles({
        items: boqItemsReq,
        drawings,
        make_list_brands: makeLists,
      });

      if (res && res.matches) {
        const updatedItems = items.map((item) => {
          const match = res.matches.find((m) => m.item_id === item.id);
          if (match) {
            return {
              ...item,
              references: {
                ...item.references,
                drawings: match.drawings || [],
                makes: (match.makes || []).map((m: any) => ({
                  brand: m.brand,
                  status: (m.status === "Preferred" || m.status === "Alternative" ? m.status : "Approved") as "Approved" | "Preferred" | "Alternative",
                })),
                notes: match.notes || item.references.notes || "",
              },
            };
          }
          return item;
        });

        setItems(updatedItems);
        // Save to cache
        localStorage.setItem(`boq_workspace_${selectedProjectId}`, JSON.stringify(updatedItems));

        toast.success("AI Document Auto-linking completed successfully!", {
          id: toastId,
          description: `Successfully linked relevant drawings and brands to your BOQ rows.`,
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("AI Auto-linking failed", {
        id: toastId,
        description: err instanceof Error ? err.message : "Please try again later.",
      });
    } finally {
      setAutoLinkingLoading(false);
    }
  };

  const seedProjectData = (projId: string): WorkspaceBoqItem[] => {
    let seeded: WorkspaceBoqItem[] = [];

    if (projId === "default-mep-project") {
      seeded = [
        {
          id: "item-1",
          item_no: "1.1",
          category: "HVAC",
          description: "SITC Copper Tubing 25 mm complete as reqd",
          unit: "mtr",
          quantity: 120,
          rate: 425,
          suggestedRate: 425,
          selectedVendor: "ABC Metals & Tubes",
          amount: 51000,
          confidence: 0.92,
          approved: true,
          status: "Approved",
          references: {
            drawings: [{ id: "dwg-1", sheetNumber: "H-102", title: "HVAC Piping Plan Layout", fileUrl: "#" }],
            makes: [{ brand: "Supreme", status: "Approved" }, { brand: "Indigo", status: "Alternative" }],
            clauses: [{ id: "cl-1", clauseNumber: "Section 14.2 (a)", title: "Delay Damages", summary: "Penalty of 0.5% per week of delay up to a max cap of 10% of total bid value.", originalText: "Contractor shall pay Liquidated Damages to the Employer at the rate of 0.5% of the Contract Price per week of delay, up to a maximum cap of 10% of the final Contract Price." }],
            vendorQuotes: [
              { id: "vq-2", vendorName: "ABC Metals & Tubes", quoteNumber: "ABC-MET-22", rate: 425, fileUrl: "#" },
              { id: "vq-3", vendorName: "Supreme Piping Corp", quoteNumber: "SUP-902", rate: 440, fileUrl: "#" }
            ],
            risks: [{ id: "rk-1", riskId: "rk-1", riskDescription: "Uncapped Liquidated Damages Liability", severity: "high", status: "Unmitigated" }],
            notes: "Connects key terminal chiller boxes on floor 2."
          }
        },
        {
          id: "item-2",
          item_no: "1.2",
          category: "HVAC",
          description: "AHU Chilled Water Fan Coil Unit 3TR",
          unit: "nos",
          quantity: 4,
          rate: 15500,
          suggestedRate: 15500,
          selectedVendor: "Grundfos India",
          amount: 62000,
          confidence: 0.88,
          approved: false,
          status: "Pending Senior Review",
          references: {
            drawings: [{ id: "dwg-2", sheetNumber: "H-104", title: "AHU Plan Schematic", fileUrl: "#" }],
            makes: [{ brand: "Grundfos", status: "Approved" }],
            clauses: [{ id: "cl-2", clauseNumber: "Section 17.3", title: "Equipment Warranty", summary: "Heavy mechanical items must hold a minimum 60-month onsite replacement warranty.", originalText: "All critical heavy mechanical equipment including AHUs, chillers, and pumps shall be supplied with a minimum manufacturer warranty of 60 months from the date of commissioning." }],
            vendorQuotes: [{ id: "vq-7", vendorName: "Grundfos India", quoteNumber: "GR-9021", rate: 15500, fileUrl: "#" }],
            risks: [{ id: "rk-2", riskId: "rk-2", riskDescription: "Extended Equipment Warranty Requirement", severity: "medium", status: "Reviewed" }],
            notes: "Confirm slab weight bearing ratios with structural engineers."
          }
        },
        {
          id: "item-3",
          item_no: "2.1",
          category: "Electrical",
          description: "Finolex 3 Core 2.5 Sq.mm Copper Flexible Cable",
          unit: "mtr",
          quantity: 450,
          rate: 145,
          suggestedRate: 145,
          selectedVendor: "Havells",
          amount: 65250,
          confidence: 0.96,
          approved: false,
          status: "Revision Requested",
          changeRequestComment: "Senior Reviewer: This cable price exceeds standard rate list of 138 INR from Anchor. Validate bids or update rate.",
          references: {
            drawings: [{ id: "dwg-3", sheetNumber: "E-204", title: "Distribution Block Details", fileUrl: "#" }],
            makes: [{ brand: "Finolex", status: "Preferred" }, { brand: "Havells", status: "Approved" }],
            clauses: [{ id: "cl-3", clauseNumber: "Section 8.4 (b)", title: "Payment Terms", summary: "90 days credit terms post-delivery. Retainage of 10% held until final site handover.", originalText: "Employer shall release progress payments within 90 days of certified invoice clearance. 10% of each invoice will be withheld as retainage until final handover." }],
            vendorQuotes: [{ id: "vq-1", vendorName: "Havells", quoteNumber: "HV-9082", rate: 145, fileUrl: "#" }],
            risks: [{ id: "rk-3", riskId: "rk-3", riskDescription: "Negative Cash Flow Due to 90-day Credit Terms", severity: "high", status: "Unmitigated" }],
            notes: "Run through PVC conduit lines in slab."
          }
        },
        {
          id: "item-4",
          item_no: "2.2",
          category: "Electrical",
          description: "Polycab PVC Conduit Pipe 25mm Medium Duty",
          unit: "mtr",
          quantity: 300,
          rate: 38,
          suggestedRate: 38,
          selectedVendor: "Polycab",
          amount: 11400,
          confidence: 0.94,
          approved: true,
          status: "Approved",
          references: {
            drawings: [{ id: "dwg-3", sheetNumber: "E-204", title: "Distribution Block Details", fileUrl: "#" }],
            makes: [{ brand: "Polycab", status: "Approved" }],
            clauses: [{ id: "cl-4", clauseNumber: "Section 3.1 (d)", title: "Design & Routing Verification", summary: "Contractor is solely liable for any clash or routing design discrepancy identified post-award.", originalText: "The Contractor warrants they have verified the site layouts. Any clashes, coordinate overlaps, or rerouting required during execution shall be completed at the Contractor's sole expense." }],
            vendorQuotes: [{ id: "vq-4", vendorName: "Polycab", quoteNumber: "POL-209", rate: 38, fileUrl: "#" }],
            risks: [{ id: "rk-4", riskId: "rk-4", riskDescription: "Design & Routing Discrepancy Liability Shift", severity: "medium", status: "Reviewed" }],
            notes: "Underground structural embeds."
          }
        },
        {
          id: "item-5",
          item_no: "3.1",
          category: "Plumbing",
          description: "GI Water Supply Pipe 50mm dia Class C",
          unit: "mtr",
          quantity: 80,
          rate: 650,
          suggestedRate: 650,
          selectedVendor: "Tata Steel Piping",
          amount: 52000,
          confidence: 0.91,
          approved: false,
          status: "Pending Procurement",
          references: {
            drawings: [{ id: "dwg-4", sheetNumber: "P-101", title: "Plumbing Riser Plan", fileUrl: "#" }],
            makes: [{ brand: "Tata Steel", status: "Approved" }, { brand: "Jindal", status: "Approved" }],
            clauses: [{ id: "cl-5", clauseNumber: "Section 5.2", title: "Project Timeline", summary: "Accelerated double shift work required with no additional compensation for Sunday work.", originalText: "To meet the aggressive handover deadline, double shift or round-the-clock working is deemed included in the bid price. No premium rate or Sunday overtime is payable." }],
            vendorQuotes: [{ id: "vq-5", vendorName: "Tata Steel Piping", quoteNumber: "TATA-PIP-04", rate: 650, fileUrl: "#" }],
            risks: [{ id: "rk-5", riskId: "rk-5", riskDescription: "Short Schedule Acceleration Penalty", severity: "high", status: "Reviewed" }],
            notes: "Hydro-tested up to 10 kg/sq.cm pressure."
          }
        },
        {
          id: "item-6",
          item_no: "4.1",
          category: "Fire Fighting",
          description: "Tyco Fire Sprinkler Head Brass Pendant 1/2 inch",
          unit: "nos",
          quantity: 240,
          rate: 850,
          suggestedRate: 850,
          selectedVendor: "Tyco Fire Protection",
          amount: 204000,
          confidence: 0.95,
          approved: true,
          status: "Approved",
          references: {
            drawings: [{ id: "dwg-5", sheetNumber: "F-102", title: "Sprinkler Layout Ceiling Plan", fileUrl: "#" }],
            makes: [{ brand: "Tyco", status: "Approved" }],
            clauses: [{ id: "cl-6", clauseNumber: "Section 9.1", title: "Force Majeure exclusions", summary: "Imported components customs delay or shipping container shortage is not an excusable delay.", originalText: "Force Majeure shall strictly exclude any supply chain delays, port congestion, customs clearance issues, or shipping container shortages." }],
            vendorQuotes: [{ id: "vq-6", vendorName: "Tyco Fire Protection", quoteNumber: "TYCO-FF-11", rate: 850, fileUrl: "#" }],
            risks: [{ id: "rk-6", riskId: "rk-6", riskDescription: "Customs Delay / Global Supply Chain Disruptions", severity: "low", status: "Mitigated" }],
            notes: "Equipped in commercial office blocks."
          }
        }
      ];
    } else if (projId === "second-mep-project") {
      seeded = [
        {
          id: "sec-1",
          item_no: "1.1",
          category: "HVAC",
          description: "Copper Pipe 25mm thick gauge insulation",
          unit: "mtr",
          quantity: 85,
          rate: 435,
          suggestedRate: 425,
          selectedVendor: "Supreme Piping Corp",
          amount: 36975,
          confidence: 0.89,
          approved: true,
          status: "Approved",
          references: { drawings: [], makes: [], notes: "" }
        },
        {
          id: "sec-2",
          item_no: "2.1",
          category: "Electrical",
          description: "Anchor 3 Core 2.5 Sqmm FR Flexible Wire 100m coil",
          unit: "mtr",
          quantity: 200,
          rate: 138,
          suggestedRate: 138,
          selectedVendor: "Anchor",
          amount: 27600,
          confidence: 0.95,
          approved: false,
          status: "Pending Senior Review",
          references: { drawings: [], makes: [], notes: "" }
        }
      ];
    } else {
      seeded = [
        {
          id: "emp-1",
          item_no: "1.1",
          category: "Miscellaneous",
          description: "Empty description row",
          unit: "nos",
          quantity: 0,
          rate: 0,
          suggestedRate: 0,
          selectedVendor: "None",
          amount: 0,
          confidence: 0.5,
          approved: false,
          status: "Draft",
          references: { drawings: [], makes: [], notes: "" }
        },
        {
          id: "emp-2",
          item_no: "1.2",
          category: "Miscellaneous",
          description: "Empty description row",
          unit: "nos",
          quantity: 0,
          rate: 0,
          suggestedRate: 0,
          selectedVendor: "None",
          amount: 0,
          confidence: 0.5,
          approved: false,
          status: "Draft",
          references: { drawings: [], makes: [], notes: "" }
        }
      ];
    }

    localStorage.setItem(`boq_workspace_${projId}`, JSON.stringify(seeded));
    return seeded;
  };

  const seedRevisionsData = (projId: string, currentItems: WorkspaceBoqItem[]) => {
    let seededRevs: BoqRevision[] = [];

    if (projId === "default-mep-project") {
      // Seed v1 (Raw Baseline)
      const v1Items = currentItems.map(item => ({
        ...item,
        rate: 0,
        amount: 0,
        selectedVendor: "None",
        approved: false,
        status: "Draft" as const
      }));

      // Seed v2 (AI Cleaned & Structured)
      const v2Items = currentItems.map(item => ({
        ...item,
        rate: item.suggestedRate,
        amount: item.suggestedRate * item.quantity,
        approved: false,
        status: "Pending Senior Review" as const
      }));

      seededRevs = [
        {
          id: "rev-3",
          projectId: projId,
          versionNumber: "v3",
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          author: "procurement.manager@vertex.com",
          comment: "Applied supplier quotations and finalized regional indexes.",
          notes: "All plumbing and HVAC items updated with Havells & Supreme quotes.",
          items: currentItems
        },
        {
          id: "rev-2",
          projectId: projId,
          versionNumber: "v2",
          createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
          author: "gemini-agent@vertex.com",
          comment: "Standardized trade categories, corrected spelling errors and units.",
          notes: "AI cleaning run successfully. Standardized to HVAC and Electrical trades.",
          items: v2Items
        },
        {
          id: "rev-1",
          projectId: projId,
          versionNumber: "v1",
          createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
          author: "junior.estimator@vertex.com",
          comment: "Baseline tender extraction compiled from PDF blueprints.",
          notes: "Raw OCR parse completed on Grand Plaza Tender sheet.",
          items: v1Items
        }
      ];
    } else {
      seededRevs = [
        {
          id: `rev-${projId}-1`,
          projectId: projId,
          versionNumber: "v1",
          createdAt: new Date().toISOString(),
          author: "junior.estimator@vertex.com",
          comment: "Initial layout commit.",
          items: currentItems
        }
      ];
    }

    setRevisions(seededRevs);
    localStorage.setItem(`boq_revisions_${projId}`, JSON.stringify(seededRevs));
  };

  // Keyboard navigation logic
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (items.length === 0 || !selectedItemId || activeTab !== "grid") return;
      
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === "input" || activeTag === "select" || activeTag === "textarea") {
        return;
      }

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const currentItems = visibleFilteredItems;
        if (currentItems.length === 0) return;

        const currentIndex = currentItems.findIndex(it => it.id === selectedItemId);
        let nextIndex = currentIndex;

        if (e.key === "ArrowDown") {
          nextIndex = (currentIndex + 1) % currentItems.length;
        } else if (e.key === "ArrowUp") {
          nextIndex = (currentIndex - 1 + currentItems.length) % currentItems.length;
        }

        const nextItem = currentItems[nextIndex];
        if (nextItem) {
          setSelectedItemId(nextItem.id);
          const el = document.getElementById(`workspace-row-${nextItem.id}`);
          el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items, selectedItemId, searchQuery, categoryFilter, queueFilter]);

  // Debounced autosaving
  const saveWorkspaceState = (newItems: WorkspaceBoqItem[]) => {
    setAutosaveStatus("saving");
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    
    autosaveTimerRef.current = setTimeout(() => {
      localStorage.setItem(`boq_workspace_${selectedProjectId}`, JSON.stringify(newItems));
      setAutosaveStatus("saved");
      
      setTimeout(() => {
        setAutosaveStatus("idle");
      }, 1500);
    }, 4500);
  };

  // Action methods
  const updateItemField = (id: string, field: keyof WorkspaceBoqItem, value: any) => {
    if (boqLocked) return;

    const updated = items.map(item => {
      if (item.id === id) {
        let copy = { ...item, [field]: value };
        
        // If switching to composite, initialize listPrice if not present
        if (field === "rateType" && value === "composite") {
          if (copy.listPrice === undefined || copy.listPrice === 0) {
            copy.listPrice = item.rate;
          }
          if (copy.discountPercentage === undefined) copy.discountPercentage = 0;
          if (copy.overheadPercentage === undefined) copy.overheadPercentage = 0;
          if (copy.laborCost === undefined) copy.laborCost = 0;
        }

        // If rate is edited, and it's a composite rate, route the edit to listPrice
        if (field === "rate") {
          if (copy.rateType === "composite") {
            copy.listPrice = Number(value);
          } else {
            copy.listPrice = Number(value);
          }
        }

        // Auto transition status if junior updates a change request
        if (currentUserRole === "junior" && item.status === "Revision Requested" && (field === "rate" || field === "quantity" || field === "description")) {
          copy.status = "Pending Senior Review";
          delete copy.changeRequestComment;
        }

        // Run cost buildup math
        copy = recalculateItemRates(copy);

        return copy;
      }
      return item;
    });

    setItems(updated);
    saveWorkspaceState(updated);
  };

  const handleDeleteRow = (id: string) => {
    if (boqLocked) return;
    const updated = items.filter(it => it.id !== id);
    setItems(updated);
    if (selectedItemId === id) {
      setSelectedItemId(updated.length > 0 ? updated[0].id : null);
    }
    saveWorkspaceState(updated);
  };

  const handleAddRow = () => {
    if (boqLocked) return;
    const newId = `manual-item-${Date.now()}`;
    const newItem: WorkspaceBoqItem = {
      id: newId,
      item_no: `${items.length + 1}`,
      category: categoryFilter !== "All" ? categoryFilter : "HVAC",
      description: "SITC Copper Tubing 25 mm complete as reqd",
      unit: "mtr",
      quantity: 100,
      rate: 425,
      suggestedRate: 425,
      selectedVendor: "None",
      amount: 42500,
      confidence: 1.0,
      approved: false,
      status: "Draft",
      references: { drawings: [], makes: [], notes: "" }
    };

    const updated = [...items, newItem];
    setItems(updated);
    setSelectedItemId(newId);
    saveWorkspaceState(updated);
  };

  // Status transitions
  const handleItemStatusChange = (id: string, newStatus: WorkspaceBoqItem["status"], comment?: string) => {
    if (boqLocked) return;
    
    const updated = items.map(item => {
      if (item.id === id) {
        const copy = { ...item, status: newStatus };
        if (newStatus === "Approved") {
          copy.approved = true;
        } else {
          copy.approved = false;
        }
        if (comment) {
          copy.changeRequestComment = comment;
        } else if (newStatus !== "Revision Requested") {
          delete copy.changeRequestComment;
        }
        return copy;
      }
      return item;
    });

    setItems(updated);
    saveWorkspaceState(updated);
  };

  const handleBulkStatusChange = (newStatus: WorkspaceBoqItem["status"]) => {
    if (boqLocked) return;
    const updated = items.map(item => {
      const isFiltered = visibleFilteredItems.some(f => f.id === item.id);
      if (isFiltered) {
        const copy = { ...item, status: newStatus };
        if (newStatus === "Approved") copy.approved = true;
        else copy.approved = false;
        return copy;
      }
      return item;
    });
    setItems(updated);
    saveWorkspaceState(updated);
  };

  // Git commit revision checkpoint
  const handleCommitRevision = () => {
    if (!commitComment.trim()) return;

    const newRevNumber = `v${revisions.length + 1}`;
    const newRev: BoqRevision = {
      id: `rev-${Date.now()}`,
      projectId: selectedProjectId,
      versionNumber: newRevNumber,
      createdAt: new Date().toISOString(),
      author: `${currentUserRole}@vertex.com`,
      comment: commitComment,
      notes: commitNotes || undefined,
      items: JSON.parse(JSON.stringify(items)) // deep copy
    };

    const updatedRevs = [newRev, ...revisions];
    setRevisions(updatedRevs);
    localStorage.setItem(`boq_revisions_${selectedProjectId}`, JSON.stringify(updatedRevs));

    setShowCommitModal(false);
    setCommitComment("");
    setCommitNotes("");
  };

  // Restore revision checkpoint
  const handleRestoreRevision = (rev: BoqRevision) => {
    if (boqLocked) return;

    if (!confirm(`Are you sure you want to restore Version ${rev.versionNumber}? Current edits will be archived under a new restoration checkpoint.`)) {
      return;
    }

    // Auto-commit active state before restoration
    const autoRevNum = `v${revisions.length + 1}`;
    const autoRev: BoqRevision = {
      id: `rev-auto-${Date.now()}`,
      projectId: selectedProjectId,
      versionNumber: autoRevNum,
      createdAt: new Date().toISOString(),
      author: `${currentUserRole}@vertex.com`,
      comment: `Auto-saved checkpoint before restoring ${rev.versionNumber}`,
      items: JSON.parse(JSON.stringify(items))
    };

    const restoredItems = JSON.parse(JSON.stringify(rev.items));
    setItems(restoredItems);
    localStorage.setItem(`boq_workspace_${selectedProjectId}`, JSON.stringify(restoredItems));

    const finalRevs = [autoRev, ...revisions];
    setRevisions(finalRevs);
    localStorage.setItem(`boq_revisions_${selectedProjectId}`, JSON.stringify(finalRevs));

    setActiveTab("grid");
    if (restoredItems.length > 0) {
      setSelectedItemId(restoredItems[0].id);
    }
  };

  // Duplicate rows detection
  const duplicateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const it of items) {
      const key = `${it.category.toLowerCase().trim()}_${it.description.toLowerCase().trim()}`;
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [items]);

  const isDuplicate = (item: WorkspaceBoqItem) => {
    const key = `${item.category.toLowerCase().trim()}_${item.description.toLowerCase().trim()}`;
    return duplicateCounts[key] > 1;
  };

  // Filter queues & descriptions
  const visibleFilteredItems = useMemo(() => {
    return items.filter(item => {
      // 1. Text Search
      const descMatches = item.description.toLowerCase().includes(searchQuery.toLowerCase());
      const itemNoMatches = (item.item_no || "").toLowerCase().includes(searchQuery.toLowerCase());
      const catMatches = categoryFilter === "All" || item.category === categoryFilter;
      if (!(descMatches || itemNoMatches) || !catMatches) return false;

      // 2. Workflow Queue selection
      if (queueFilter === "my-queue") {
        if (currentUserRole === "junior") return item.status === "Draft" || item.status === "Revision Requested";
        if (currentUserRole === "senior") return item.status === "Pending Senior Review";
        if (currentUserRole === "procurement") return item.status === "Pending Procurement";
        return true;
      }
      if (queueFilter === "pending-senior") return item.status === "Pending Senior Review";
      if (queueFilter === "pending-procurement") return item.status === "Pending Procurement";
      if (queueFilter === "approved") return item.status === "Approved";
      if (queueFilter === "change-requests") return item.status === "Revision Requested";
      
      return true;
    });
  }, [items, searchQuery, categoryFilter, queueFilter, currentUserRole]);

  // Groupings & Subtotals
  const groupedItems = useMemo(() => {
    const groups: Record<string, WorkspaceBoqItem[]> = {};
    for (const it of visibleFilteredItems) {
      const cat = it.category || "Miscellaneous";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(it);
    }
    return groups;
  }, [visibleFilteredItems]);

  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const cat of Object.keys(groupedItems)) {
      totals[cat] = groupedItems[cat].reduce((sum, item) => sum + (item.amount || 0), 0);
    }
    return totals;
  }, [groupedItems]);

  const grandTotal = useMemo(() => {
    return visibleFilteredItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [visibleFilteredItems]);

  const validationWarningsCount = useMemo(() => {
    return visibleFilteredItems.filter(it => it.quantity === 0 || it.rate === 0 || !it.category || !it.description).length;
  }, [visibleFilteredItems]);

  const duplicateAlertsCount = useMemo(() => {
    return visibleFilteredItems.filter(it => isDuplicate(it)).length;
  }, [visibleFilteredItems, duplicateCounts]);

  const approvalRate = useMemo(() => {
    if (visibleFilteredItems.length === 0) return 0;
    const approved = visibleFilteredItems.filter(it => it.status === "Approved").length;
    return Math.round((approved / visibleFilteredItems.length) * 100);
  }, [visibleFilteredItems]);

  // Selected row binds
  const selectedItem = useMemo(() => items.find(it => it.id === selectedItemId) || null, [items, selectedItemId]);
  
  const historicalRecord = useMemo(() => {
    if (!selectedItem) return null;
    return getHistoricalRates(selectedItem.description, selectedItem.category);
  }, [selectedItem]);

  // Match live supplier quotes
  const matchedSupplierQuotes = useMemo(() => {
    if (!selectedItem || !vendorQuotations.length) return [];
    const keywords = selectedItem.description.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    const matchedItems: { vendor: string; rate: number; brand: string; date: string; file: string }[] = [];
    
    for (const quote of vendorQuotations) {
      for (const qItem of quote.items) {
        const matchNormalized = qItem.normalized_item_name.toLowerCase().includes(selectedItem.description.toLowerCase()) ||
                                selectedItem.description.toLowerCase().includes(qItem.normalized_item_name.toLowerCase());
        
        let keywordOverlap = false;
        if (!matchNormalized) {
          const matchCount = keywords.filter(kw => qItem.item_name.toLowerCase().includes(kw)).length;
          if (matchCount >= 2) keywordOverlap = true;
        }

        if (matchNormalized || keywordOverlap) {
          matchedItems.push({
            vendor: quote.vendor_name,
            rate: qItem.quoted_rate,
            brand: qItem.brand || "Unspecified",
            date: quote.quotation_date,
            file: quote.file_name
          });
        }
      }
    }
    return matchedItems.sort((a, b) => a.rate - b.rate);
  }, [selectedItem, vendorQuotations]);

  // Git Revision Diff Calculator
  const selectedRevForComparison = useMemo(() => {
    return revisions.find(r => r.id === comparingRevisionId) || null;
  }, [revisions, comparingRevisionId]);

  // Visual layout helpers
  const handleTriggerRevisionRequest = () => {
    setShowFeedbackModal(true);
  };

  const submitRevisionRequest = () => {
    if (!selectedItemId || !feedbackComment.trim()) return;
    handleItemStatusChange(selectedItemId, "Revision Requested", feedbackComment);
    setShowFeedbackModal(false);
    setFeedbackComment("");
  };

  return (
    <main className="mx-auto w-full px-6 py-6 sm:px-8 max-w-[1600px] text-zinc-100 bg-zinc-900/10 min-h-screen relative select-none">
      
      {/* CAD BLUEPRINT PREVIEW MODAL */}
      {activeDrawingSheet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/85 p-6 backdrop-blur-md animate-in fade-in duration-200">
          <div className="flex h-[88vh] w-full max-w-5xl flex-col rounded-3xl border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6 py-4.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded bg-sky-500/10 text-sky-400 font-bold text-xs border border-sky-500/20">📐</div>
                <div>
                  <span className="text-[9px] font-extrabold tracking-widest text-sky-400 uppercase">Simulated Blueprint CAD Vector Visualizer</span>
                  <h3 className="text-sm font-bold text-zinc-200">{activeDrawingSheet.sheetNumber} — {activeDrawingSheet.title}</h3>
                </div>
              </div>
              <button
                onClick={() => setActiveDrawingSheet(null)}
                className="rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-xs px-3.5 py-1.5 transition text-zinc-300 cursor-pointer"
              >
                ✕ Close Blueprint
              </button>
            </div>

            {/* Simulated Vector Grid Blueprint */}
            <div className="flex-1 bg-zinc-950 relative overflow-hidden flex items-center justify-center border-b border-zinc-800">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#111827_1px,transparent_1px),linear-gradient(to_bottom,#111827_1px,transparent_1px)] bg-[size:24px_24px] opacity-40" />
              
              <svg className="w-[80%] h-[75%] stroke-zinc-700" fill="none" viewBox="0 0 400 200">
                {/* Structural Walls */}
                <rect x="20" y="20" width="360" height="160" stroke="#4b5563" strokeWidth="2" strokeDasharray="4 2" />
                <line x1="140" y1="20" x2="140" y2="180" stroke="#4b5563" strokeWidth="1.5" />
                <line x1="260" y1="20" x2="260" y2="180" stroke="#4b5563" strokeWidth="1.5" />

                {/* MEP Systems overlays (HVAC or Electrical layouts based on sheetNumber) */}
                {activeDrawingSheet.sheetNumber.startsWith("H") ? (
                  <>
                    {/* HVAC Ducting systems */}
                    <path d="M 60 40 L 320 40 L 320 120" stroke="#06b6d4" strokeWidth="6" strokeLinecap="round" opacity="0.6" />
                    <circle cx="60" cy="40" r="10" fill="#0891b2" opacity="0.4" />
                    <circle cx="320" cy="120" r="12" fill="#0891b2" opacity="0.4" />
                    <text x="75" y="35" fill="#22d3ee" className="text-[7px] font-bold">FCU Connection Block A</text>
                    <text x="240" y="55" fill="#22d3ee" className="text-[7px] font-bold">25mm Copper Tube Riser</text>
                    <path d="M 320 40 L 340 60" stroke="#f43f5e" strokeWidth="2" />
                    <circle cx="340" cy="60" r="3" fill="#f43f5e" />
                  </>
                ) : (
                  <>
                    {/* Electrical cable schematics */}
                    <path d="M 40 100 L 200 100 L 200 150 L 360 150" stroke="#eab308" strokeWidth="2" strokeDasharray="3 3" opacity="0.7" />
                    <rect x="180" y="90" width="40" height="20" stroke="#ca8a04" strokeWidth="1.5" fill="#1e1b4b" />
                    <text x="185" y="103" fill="#fde047" className="text-[6px] font-bold">PANEL DB-L1</text>
                    <text x="60" y="115" fill="#fde047" className="text-[6px]">3C 2.5 Sq.mm wire routing</text>
                  </>
                )}

                {/* Legend coordinate notes */}
                <rect x="25" y="145" width="90" height="30" fill="#090d16" stroke="#1f2937" strokeWidth="1" />
                <text x="30" y="155" fill="#9ca3af" className="text-[5px] uppercase font-bold">Vertex Block 2</text>
                <text x="30" y="163" fill="#22d3ee" className="text-[6px] font-bold">MEP Coord: Zone C-4</text>
                <text x="30" y="171" fill="#6b7280" className="text-[5px]">Scale 1:100</text>
              </svg>

              {/* Zoom overlays */}
              <div className="absolute bottom-5 right-5 flex gap-2">
                <button className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 p-2 rounded text-xs">🔍 Zoom In</button>
                <button className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 p-2 rounded text-xs">🔍 Zoom Out</button>
                <button className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 p-2 rounded text-xs">⟲ Reset</button>
              </div>
            </div>

            <div className="bg-zinc-900 px-6 py-4 flex justify-between items-center text-xs text-zinc-400">
              <span>Attach references or inspect slab details directly from CAD sheet metrics.</span>
              <span className="text-sky-400 font-bold">Vector Rendering Active</span>
            </div>
          </div>
        </div>
      )}

      {/* COMMIT REVISION MODAL */}
      {showCommitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-6 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md p-6 rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2 border-b border-zinc-800 pb-3 mb-4">
              <span className="text-violet-400">❖</span> Commit Git-style Estimation Revision
            </h3>
            
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1.5">Commit Comment (Required)</label>
                <input
                  type="text"
                  placeholder="e.g. Adjusted copper piping rates based on ABC quote..."
                  value={commitComment}
                  onChange={(e) => setCommitComment(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 outline-none focus:border-violet-600 transition"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1.5">Estimator Notes (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Provide background context or detailed analysis for this checkpoint..."
                  value={commitNotes}
                  onChange={(e) => setCommitNotes(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 outline-none focus:border-violet-600 transition"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 text-xs">
              <button
                onClick={() => setShowCommitModal(false)}
                className="bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 rounded-xl px-4 py-2 font-semibold text-zinc-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCommitRevision}
                disabled={!commitComment.trim()}
                className="bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl px-4 py-2 font-bold text-white transition cursor-pointer"
              >
                Commit revision
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FEEDBACK CHANGE REQUEST MODAL */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-6 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md p-6 rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2 border-b border-zinc-800 pb-3 mb-4">
              <span className="text-red-400">⚠</span> Request Revision / Change Feedback
            </h3>

            <div>
              <label className="block text-xs text-zinc-400 font-semibold mb-2">Reviewer Feedback Comment</label>
              <textarea
                rows={4}
                placeholder="Detail exactly why this row requires revision (e.g. quantity mismatch, pricing exceeding limits)..."
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 outline-none focus:border-red-600 transition"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3 text-xs">
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 rounded-xl px-4 py-2 font-semibold text-zinc-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={submitRevisionRequest}
                disabled={!feedbackComment.trim()}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl px-4 py-2 font-bold text-white transition cursor-pointer"
              >
                Request Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP BAR / HEADER */}
      <div className="mb-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-zinc-800 pb-5 select-none">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[10px] font-extrabold tracking-widest text-violet-400 uppercase">Vertex Estimator Suite</span>
            <div className="flex items-center gap-1.5 rounded-full bg-zinc-950 px-2.5 py-0.5 border border-zinc-800 text-[10px] font-semibold text-zinc-400">
              <span className={`h-1.5 w-1.5 rounded-full ${autosaveStatus === "saving" ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
              {autosaveStatus === "saving" ? "Autosaving..." : autosaveStatus === "saved" ? "✓ Saved" : "Cloud Synchronized"}
            </div>
            {boqLocked && (
              <div className="flex items-center gap-1 rounded-full bg-red-950/30 px-2.5 py-0.5 border border-red-900/40 text-[10px] font-bold text-red-400 animate-pulse">
                🔒 Locked by Admin
              </div>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-50 flex items-center gap-2 mt-0.5">
            Master BOQ Coordination Console
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Primary procurement console merging Git versioning, CAD blueprint previews, animated MEP relations, and multi-role audit approvals.
          </p>
        </div>

        {/* CONTROLS TOOLBAR */}
        <div className="flex flex-wrap items-center gap-4">

          {/* ACTIVE PROJECT SELECTOR */}
          <div className="flex flex-col">
            <label className="text-[9px] font-extrabold text-zinc-500 uppercase mb-1 tracking-wider">Active Project</label>
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
              }}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-extrabold text-violet-400 outline-none focus:border-violet-600 transition max-w-[200px]"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* AI AUTO-LINKER ACTION BUTTON */}
          <div className="flex flex-col">
            <label className="text-[9px] font-extrabold text-zinc-500 uppercase mb-1 tracking-wider">AI Document Automation</label>
            <button
              onClick={handleAutoLink}
              disabled={autoLinkingLoading || items.length === 0}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition flex items-center gap-1.5 h-[32px] cursor-pointer shadow-md ${
                autoLinkingLoading
                  ? "bg-violet-950 border border-zinc-800 text-zinc-400"
                  : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-violet-600/10"
              }`}
            >
              {autoLinkingLoading ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent mr-1" />
                  Linking Documents...
                </>
              ) : (
                <>🔗 Auto-Link Project Documents via AI</>
              )}
            </button>
          </div>
          
          {/* ROLE SELECTOR SWITCHER */}
          <div className="flex flex-col">
            <label className="text-[9px] font-extrabold text-zinc-500 uppercase mb-1 tracking-wider">Simulated Workspace Role</label>
            <select
              value={currentUserRole}
              onChange={(e) => {
                const role = e.target.value as any;
                setCurrentUserRole(role);
                // Auto lock boq if admin switch
                if (role !== "admin") setBoqLocked(false);
              }}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-extrabold text-violet-400 outline-none focus:border-violet-600 transition"
            >
              <option value="junior">Junior Estimator (Drafts)</option>
              <option value="senior">Senior Estimator (Reviews)</option>
              <option value="procurement">Procurement Manager (Bids)</option>
              <option value="admin">Administrator (Lock & Release)</option>
            </select>
          </div>

          {/* ADMIN CONSOLE ACTION */}
          {currentUserRole === "admin" && (
            <div className="flex flex-col">
              <label className="text-[9px] font-extrabold text-zinc-500 uppercase mb-1 tracking-wider">Admin Workspace State</label>
              <button
                onClick={() => setBoqLocked(prev => !prev)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition flex items-center gap-1.5 h-[32px] cursor-pointer ${
                  boqLocked
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                {boqLocked ? "🔓 Release BOQ Edit Lock" : "🔒 Freeze & Finalize BOQ"}
              </button>
            </div>
          )}

          {/* TAB BUTTONS */}
          <div className="flex items-end h-[38px] pt-4.5">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-1 flex gap-1 h-[38px]">
              <button
                onClick={() => setActiveTab("grid")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === "grid" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setActiveTab("timeline")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === "timeline" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Git Revisions
              </button>
              <button
                onClick={() => setActiveTab("relationship-map")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === "relationship-map" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Relationship Map
              </button>
              {activeTab === "comparison" && (
                <button className="px-3 py-1 rounded-lg text-xs font-bold bg-violet-600 text-white">
                  Diff Comparison
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* LOCK BANNER WATERMARK */}
      {boqLocked && (
        <div className="bg-red-950/20 border border-red-900/50 rounded-2xl px-6 py-4.5 mb-6 flex items-center justify-between shadow-inner animate-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">🔒</span>
            <div>
              <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider">BOQ Finalized & Locked by Administrator</h4>
              <p className="text-[11px] text-zinc-400 mt-0.5">All inline spreadsheet fields are frozen from further manual editing. Release lock in Admin view to modify cells.</p>
            </div>
          </div>
          <span className="text-[10px] font-extrabold text-red-500/50 uppercase tracking-widest bg-red-950/30 px-3 py-1.5 rounded-lg border border-red-900/20">Audit Active</span>
        </div>
      )}

      {/* CORE WORKSPACE METRICS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-br from-violet-500/10 to-transparent rounded-bl-full" />
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Grand Est. Sum</span>
          <h3 className="text-xl font-extrabold text-zinc-50 tracking-tight mt-1">{formatPrice(grandTotal)}</h3>
          <p className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            Optimistic updates active
          </p>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-bl-full" />
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Audit Approval Rate</span>
          <h3 className="text-xl font-extrabold text-emerald-400 tracking-tight mt-1">{approvalRate}%</h3>
          <div className="w-full h-1 bg-zinc-800 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${approvalRate}%` }} />
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-br from-red-500/10 to-transparent rounded-bl-full" />
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Validation Alerts</span>
          <h3 className={`text-xl font-extrabold tracking-tight mt-1 ${validationWarningsCount > 0 ? "text-red-400 animate-pulse" : "text-zinc-50"}`}>
            {validationWarningsCount}
          </h3>
          <p className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1">
            <span className={`h-1.5 w-1.5 rounded-full ${validationWarningsCount > 0 ? "bg-red-400" : "bg-zinc-600"}`} />
            Qty/Rate Zero entries
          </p>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-br from-yellow-500/10 to-transparent rounded-bl-full" />
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Duplicate Row Flags</span>
          <h3 className={`text-xl font-extrabold tracking-tight mt-1 ${duplicateAlertsCount > 0 ? "text-yellow-400" : "text-zinc-50"}`}>
            {duplicateAlertsCount}
          </h3>
          <p className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1">
            <span className={`h-1.5 w-1.5 rounded-full ${duplicateAlertsCount > 0 ? "bg-yellow-400" : "bg-zinc-600"}`} />
            Similar Trade/Desc rows
          </p>
        </div>
      </div>

      {/* SaaS TRIAL / SUBSCRIPTION UPGRADE REMINDER BANNER */}
      {subscribed === false && (
        <div className="bg-gradient-to-r from-violet-950/20 via-zinc-950 to-zinc-950 border border-violet-500/30 rounded-2xl p-5 mb-6 relative overflow-hidden shadow-lg shadow-violet-950/10 animate-in slide-in-from-top-4 duration-300">
          <div className="absolute right-0 top-0 h-24 w-24 bg-violet-500/5 blur-xl rounded-full pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/25">
                <span className="text-xl">⚠️</span>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-violet-400">Standard Trial Workspace</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
                  <span className="text-[9px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 uppercase">Upgrade Pending</span>
                </div>
                <h3 className="text-base font-bold text-zinc-150 mt-1">
                  You are currently using the Standard Trial plan.
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Upgrade to the Professional Plan to unlock the AI Document Auto-Linker, advanced scanned PDF OCR structuring, and unlimited estimations!
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4.5 shrink-0 self-end md:self-center">
              <button
                type="button"
                onClick={() => window.location.href = "/pricing"}
                className="bg-violet-600 hover:bg-violet-500 active:scale-98 text-white font-bold rounded-xl px-4 py-2.5 text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-violet-600/10"
              >
                Upgrade to Pro Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI BID SAVINGS COCKPIT BANNER */}
      {savingsAnalysis && savingsAnalysis.totalSavings > 0 && (
        <div className="bg-gradient-to-r from-emerald-950/20 via-zinc-950 to-zinc-950 border border-emerald-500/30 rounded-2xl p-5 mb-6 relative overflow-hidden shadow-lg shadow-emerald-950/10 animate-in slide-in-from-top-4 duration-300">
          <div className="absolute right-0 top-0 h-24 w-24 bg-emerald-500/5 blur-xl rounded-full pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">AI Bid Savings Engine</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 uppercase">Fuzzy-Match Optimization</span>
                </div>
                <h3 className="text-base font-bold text-zinc-150 mt-1">
                  AI has matched <span className="text-emerald-400 font-extrabold">{savingsAnalysis.opportunitiesCount} items</span> to cheaper competing vendor quotations.
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Reconciling your estimated rates with these active quotes will instantly reduce your overall tender cost.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4.5 shrink-0 self-end md:self-center">
              <div className="text-right">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block leading-none">Potential Savings</span>
                <span className="text-2xl font-black text-emerald-400 tabular-nums tracking-tight mt-1.5 block">
                  {formatPrice(savingsAnalysis.totalSavings)}
                </span>
              </div>

              <button
                type="button"
                onClick={applyAiOptimizations}
                className="bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-zinc-950 font-black rounded-xl px-4 py-2.5 text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-emerald-500/10"
              >
                Apply AI Optimizations
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE TABS CONDITIONAL LAYOUTS */}

      {/* ------------------------------------------------------------- */}
      {/* A. ACTIVE GRID VIEW */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "grid" && (
        <div className="flex flex-col lg:flex-row gap-6 items-start animate-in fade-in duration-200">
          
          <div className={`${selectedItemId ? "lg:w-[70%]" : "w-full"} w-full flex flex-col border border-zinc-800 rounded-2xl bg-zinc-950 overflow-hidden shadow-xl`}>
            
            {/* WORKFLOW REVIEW QUEUES BAR */}
            <div className="px-4 py-3 bg-zinc-900/60 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs select-none">
              
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setQueueFilter("all")}
                  className={`px-3 py-1 rounded-lg transition font-bold ${
                    queueFilter === "all" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  All Rows
                </button>
                <button
                  onClick={() => setQueueFilter("my-queue")}
                  className={`px-3 py-1 rounded-lg transition font-bold flex items-center gap-1 ${
                    queueFilter === "my-queue" ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  My Queue
                  <span className="bg-zinc-950/40 text-[9px] px-1 rounded">
                    {currentUserRole === "junior" && items.filter(it => it.status === "Draft" || it.status === "Revision Requested").length}
                    {currentUserRole === "senior" && items.filter(it => it.status === "Pending Senior Review").length}
                    {currentUserRole === "procurement" && items.filter(it => it.status === "Pending Procurement").length}
                    {currentUserRole === "admin" && items.length}
                  </span>
                </button>
                <button
                  onClick={() => setQueueFilter("pending-senior")}
                  className={`px-3 py-1 rounded-lg transition font-bold ${
                    queueFilter === "pending-senior" ? "bg-amber-600 text-white" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Pending Senior Review
                </button>
                <button
                  onClick={() => setQueueFilter("pending-procurement")}
                  className={`px-3 py-1 rounded-lg transition font-bold ${
                    queueFilter === "pending-procurement" ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Pending Procurement
                </button>
                <button
                  onClick={() => setQueueFilter("approved")}
                  className={`px-3 py-1 rounded-lg transition font-bold ${
                    queueFilter === "approved" ? "bg-emerald-600 text-white" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Approved
                </button>
                <button
                  onClick={() => setQueueFilter("change-requests")}
                  className={`px-3 py-1 rounded-lg transition font-bold ${
                    queueFilter === "change-requests" ? "bg-red-600 text-white" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Change Requests
                </button>
              </div>

              {/* PROJECT INFO */}
              <div className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider hidden xl:block">
                Client: {activeProject?.client}
              </div>
            </div>

            {/* SECONDARY FILTER SEARCH BAR */}
            <div className="p-4 border-b border-zinc-800 bg-zinc-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Search descriptions, sheet codes or trade categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:border-violet-600 transition placeholder-zinc-500 text-zinc-200"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-300 outline-none focus:border-violet-600 transition"
                >
                  <option value="All">All Categories</option>
                  {SUPPORTED_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                {!boqLocked && currentUserRole === "junior" && (
                  <button
                    onClick={handleAddRow}
                    className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition inline-flex items-center gap-1 cursor-pointer shadow-md"
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Row
                  </button>
                )}

                <div className="h-6 w-px bg-zinc-800" />

                {/* Bulk status controls */}
                {!boqLocked && currentUserRole === "junior" && (
                  <button
                    onClick={() => handleBulkStatusChange("Pending Senior Review")}
                    className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs px-3 py-2 rounded-xl transition cursor-pointer"
                  >
                    Submit for Review
                  </button>
                )}

                {!boqLocked && currentUserRole === "senior" && (
                  <button
                    onClick={() => handleBulkStatusChange("Approved")}
                    className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-emerald-400 font-bold text-xs px-3 py-2 rounded-xl transition cursor-pointer"
                  >
                    Approve Filtered
                  </button>
                )}

                <button
                  onClick={() => setShowCommitModal(true)}
                  className="bg-violet-950/40 border border-violet-800/40 hover:bg-violet-900/30 text-violet-400 font-extrabold text-xs px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1"
                >
                  <span>❖</span> Commit Rev
                </button>
              </div>
            </div>

            {/* SPREADSHEET TABLE GRID CONTAINER */}
            <div className="overflow-x-auto max-h-[500px] relative">
              {loading ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-violet-500 border-zinc-800" />
                  <p className="text-xs text-zinc-500 mt-3">Loading Estimation Grid State...</p>
                </div>
              ) : visibleFilteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center select-none">
                  <svg className="mx-auto h-12 w-12 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h4 className="text-sm font-bold text-zinc-200 mt-4">Queue Filtered Out Empty</h4>
                  <p className="text-xs text-zinc-500 max-w-sm mt-1">Adjust search parameters or status tab queues to explore items.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs divide-y divide-zinc-800 border-collapse table-fixed select-none">
                  <thead className="bg-zinc-950 text-zinc-400 sticky top-0 z-20 shadow-md">
                    <tr className="divide-x divide-zinc-900 border-b border-zinc-800 font-bold uppercase text-[9px] tracking-wider">
                      <th className="w-12 px-2.5 py-3 text-center">#</th>
                      <th className="w-24 px-2 py-3">Category</th>
                      <th className="w-64 px-3 py-3">Description</th>
                      <th className="w-16 px-2 py-3">Unit</th>
                      <th className="w-20 px-2 py-3 text-right">Qty</th>
                      <th className="w-20 px-2 py-3 text-right">Rate</th>
                      <th className="w-28 px-3 py-3">Vendor</th>
                      <th className="w-24 px-3 py-3 text-right">Amount</th>
                      <th className="w-28 px-3 py-3 text-center">Linked Drawing</th>
                      <th className="w-28 px-3 py-3 text-center">Review Status</th>
                      <th className="w-14 px-2 py-3 text-center">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-zinc-900 bg-zinc-950">
                    {Object.keys(groupedItems).map(category => {
                      const collapsed = collapsedCategories[category];
                      const catItems = groupedItems[category];
                      const subtotal = categoryTotals[category];

                      return (
                        <Fragment key={`group-${category}`}>
                          {/* COLLAPSIBLE GROUP HEADER */}
                          <tr className="bg-zinc-900/80 sticky z-10 font-bold text-zinc-300 hover:bg-zinc-900 transition">
                            <td colSpan={11} className="px-3 py-2 border-b border-zinc-800 border-t border-zinc-800">
                              <div className="flex items-center justify-between">
                                <button
                                  onClick={() => setCollapsedCategories(prev => ({ ...prev, [category]: !prev[category] }))}
                                  className="flex items-center gap-2 outline-none text-left cursor-pointer"
                                >
                                  <svg className={`h-3 w-3 text-zinc-500 transition-transform duration-200 ${collapsed ? "-rotate-90" : "rotate-0"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                                  </svg>
                                  <span className="font-extrabold text-[10px] text-zinc-200 uppercase tracking-widest">{category}</span>
                                  <span className="text-[9px] text-zinc-500 font-medium">({catItems.length} lines)</span>
                                </button>
                                
                                <div className="flex items-center gap-4 text-xs font-semibold text-zinc-400">
                                  <span>Subtotal:</span>
                                  <span className="text-violet-400 font-extrabold text-sm">{formatPrice(subtotal)}</span>
                                </div>
                              </div>
                            </td>
                          </tr>

                          {/* RENDER ITEMS */}
                          {!collapsed && catItems.map((item) => {
                            const isSel = selectedItemId === item.id;
                            const hasWarning = item.quantity === 0 || item.rate === 0;
                            const isDup = isDuplicate(item);
                            const canEditRow = !boqLocked && (
                              (currentUserRole === "junior" && (item.status === "Draft" || item.status === "Revision Requested")) ||
                              (currentUserRole === "senior" && (item.status === "Pending Senior Review")) ||
                              (currentUserRole === "procurement" && (item.status === "Pending Procurement")) ||
                              (currentUserRole === "admin")
                            );

                            return (
                              <tr
                                key={item.id}
                                id={`workspace-row-${item.id}`}
                                onClick={() => setSelectedItemId(item.id)}
                                className={`divide-x divide-zinc-900 transition cursor-pointer ${
                                  reconciledIds.has(item.id)
                                    ? "bg-emerald-950/25 text-emerald-100 shadow-inner border-y border-emerald-500/40 animate-pulse duration-1000"
                                    : isSel
                                      ? "bg-violet-950/20 hover:bg-violet-950/30 text-zinc-50 border-y border-violet-800/50 animate-in fade-in-10"
                                      : "hover:bg-zinc-900/30 text-zinc-300"
                                } ${hasWarning ? "bg-red-500/5" : ""} ${isDup ? "bg-yellow-500/5" : ""}`}
                              >
                                {/* ITEM NUMBER */}
                                <td className="px-2.5 py-2.5 text-center text-zinc-500 font-medium">
                                  {item.item_no}
                                </td>

                                {/* CATEGORY */}
                                <td className="px-1 py-1">
                                  <select
                                    value={item.category}
                                    disabled={!canEditRow}
                                    onChange={(e) => updateItemField(item.id, "category", e.target.value)}
                                    className="w-full bg-transparent border-0 rounded px-1.5 py-1 text-xs outline-none hover:bg-zinc-900 focus:bg-zinc-900 disabled:cursor-not-allowed disabled:hover:bg-transparent focus:ring-1 focus:ring-violet-600 transition"
                                  >
                                    {SUPPORTED_CATEGORIES.map(c => (
                                      <option key={c} value={c}>{c}</option>
                                    ))}
                                  </select>
                                </td>

                                {/* DESCRIPTION */}
                                <td className="px-2 py-1">
                                  <div className="flex items-center gap-1.5 w-full">
                                    {isDup && (
                                      <span className="text-yellow-500" title="Duplicate row detected! Same category and description exists.">⚠</span>
                                    )}
                                    {hasWarning && (
                                      <span className="text-red-500 animate-pulse font-bold" title="Zero value entries found!">●</span>
                                    )}
                                    {item.status === "Revision Requested" && (
                                      <span className="text-red-400 font-bold" title={item.changeRequestComment || "Change requested"}>⟲</span>
                                    )}
                                    <input
                                      type="text"
                                      value={item.description}
                                      disabled={!canEditRow}
                                      onChange={(e) => updateItemField(item.id, "description", e.target.value)}
                                      className="w-full bg-transparent border-0 rounded px-1 py-1 text-xs outline-none hover:bg-zinc-900 focus:bg-zinc-900 disabled:cursor-not-allowed disabled:hover:bg-transparent focus:ring-1 focus:ring-violet-600 transition truncate"
                                      title={item.description}
                                    />
                                  </div>
                                </td>

                                {/* UNIT */}
                                <td className="px-1 py-1">
                                  <input
                                    type="text"
                                    value={item.unit}
                                    disabled={!canEditRow}
                                    onChange={(e) => updateItemField(item.id, "unit", e.target.value)}
                                    className="w-full bg-transparent border-0 rounded px-1.5 py-1 text-xs text-center outline-none hover:bg-zinc-900 focus:bg-zinc-900 disabled:cursor-not-allowed disabled:hover:bg-transparent focus:ring-1 focus:ring-violet-600 transition"
                                  />
                                </td>

                                {/* QTY */}
                                <td className="px-1 py-1">
                                  <input
                                    type="number"
                                    value={item.quantity}
                                    disabled={!canEditRow}
                                    onChange={(e) => updateItemField(item.id, "quantity", Number(e.target.value))}
                                    className="w-full bg-transparent border-0 rounded px-1.5 py-1 text-xs text-right outline-none hover:bg-zinc-900 focus:bg-zinc-900 disabled:cursor-not-allowed disabled:hover:bg-transparent focus:ring-1 focus:ring-violet-600 transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                </td>

                                {/* RATE */}
                                <td className="px-1 py-1">
                                  <input
                                    type="number"
                                    value={item.rate}
                                    disabled={!canEditRow}
                                    onChange={(e) => updateItemField(item.id, "rate", Number(e.target.value))}
                                    className="w-full bg-transparent border-0 rounded px-1.5 py-1 text-xs text-right font-semibold text-zinc-100 outline-none hover:bg-zinc-900 focus:bg-zinc-900 disabled:cursor-not-allowed disabled:hover:bg-transparent focus:ring-1 focus:ring-violet-600 transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                </td>

                                {/* SELECTED VENDOR */}
                                <td className="px-1 py-1">
                                  <select
                                    value={item.selectedVendor}
                                    disabled={!canEditRow}
                                    onChange={(e) => {
                                      updateItemField(item.id, "selectedVendor", e.target.value);
                                      const match = matchedSupplierQuotes.find(q => q.vendor === e.target.value);
                                      if (match) {
                                        updateItemField(item.id, "rate", match.rate);
                                      }
                                    }}
                                    className="w-full bg-transparent border-0 rounded px-1 py-1 text-xs outline-none hover:bg-zinc-900 focus:bg-zinc-900 disabled:cursor-not-allowed disabled:hover:bg-transparent focus:ring-1 focus:ring-violet-600 transition"
                                  >
                                    <option value="None">None (Manual)</option>
                                    <option value="ABC Metals & Tubes">ABC Metals & Tubes</option>
                                    <option value="Supreme Piping Corp">Supreme Piping Corp</option>
                                    <option value="Global Trades">Global Trades</option>
                                    <option value="Tata Steel Piping">Tata Steel Piping</option>
                                    <option value="Tyco Fire Protection">Tyco Fire Protection</option>
                                    <option value="UltraTech Concrete">UltraTech Concrete</option>
                                    <option value="Hikvision Direct">Hikvision Direct</option>
                                    <option value="Anchor">Anchor</option>
                                    <option value="Havells">Havells</option>
                                    <option value="Polycab">Polycab</option>
                                  </select>
                                </td>

                                {/* AMOUNT */}
                                <td className="px-3 py-2.5 text-right font-extrabold text-zinc-100">
                                  {formatPrice(item.amount)}
                                </td>

                                {/* LINKED DRAWING REF */}
                                <td className="px-3 py-2 text-center">
                                  {item.references.drawings.length > 0 ? (
                                    <div className="flex flex-wrap gap-1 justify-center">
                                      {item.references.drawings.map((dwg) => (
                                        <button
                                          key={dwg.id}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveDrawingSheet({ sheetNumber: dwg.sheetNumber, title: dwg.title });
                                          }}
                                          className="rounded bg-sky-500/10 text-sky-400 hover:bg-sky-500 hover:text-zinc-950 px-2 py-0.5 text-[10px] font-bold border border-sky-500/20 transition cursor-pointer"
                                        >
                                          {dwg.sheetNumber}
                                        </button>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-zinc-600 italic">No drawing linked</span>
                                  )}
                                </td>

                                {/* REVIEW STATUS BADGE */}
                                <td className="px-3 py-2 text-center">
                                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider border select-none ${
                                    item.status === "Approved"
                                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                      : item.status === "Pending Senior Review"
                                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                        : item.status === "Pending Procurement"
                                          ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                          : item.status === "Revision Requested"
                                            ? "bg-red-500/10 text-red-400 border-red-500/20 animate-pulse"
                                            : "bg-zinc-800 text-zinc-400 border-zinc-700"
                                  }`}>
                                    {item.status}
                                  </span>
                                </td>

                                {/* DELETE ROW */}
                                <td className="px-2 py-2 text-center">
                                  {!boqLocked && currentUserRole === "junior" && (item.status === "Draft" || item.status === "Revision Requested") ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteRow(item.id);
                                      }}
                                      className="text-zinc-600 hover:text-red-400 font-bold p-1 transition cursor-pointer"
                                      title="Delete BOQ row"
                                    >
                                      ✕
                                    </button>
                                  ) : (
                                    <span className="text-zinc-700">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* STICKY GRAND SUMMARY FOOTER */}
            <div className="border-t border-zinc-800 bg-zinc-950 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 select-none">
              <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400">
                <span className="flex items-center gap-1">
                  <span className="font-semibold text-zinc-200">{visibleFilteredItems.length}</span> active rows
                </span>
                <span className="h-4 w-px bg-zinc-800" />
                <span className="flex items-center gap-1">
                  <span className="font-semibold text-emerald-400">{visibleFilteredItems.filter(it => it.status === "Approved").length}</span> approved
                </span>
                <span className="h-4 w-px bg-zinc-800" />
                <span className="flex items-center gap-1">
                  <span className="font-semibold text-zinc-200">{Object.keys(groupedItems).length}</span> trades grouped
                </span>
              </div>

              <div className="flex items-center gap-5">
                <span className="text-xs font-bold text-zinc-400">GRAND TOTAL:</span>
                <span className="text-xl font-extrabold text-violet-400 bg-violet-500/10 px-4 py-1.5 rounded-xl border border-violet-500/20 shadow-md">
                  {formatPrice(grandTotal)}
                </span>
              </div>
            </div>

          </div>

          {/* SIDE Drawer cockpit (30% WIDTH) */}
          {selectedItem && (
            <div className="w-full lg:w-[30%] bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-xl relative animate-in slide-in-from-right-5 duration-200">
              
              {/* SIDE DRAWER TABS SELECTOR */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
                <div className="flex gap-2 flex-wrap items-center">
                  <button
                    onClick={() => setSidebarTab("specs")}
                    className={`text-xs font-bold transition cursor-pointer ${
                      sidebarTab === "specs" ? "text-violet-400 font-extrabold" : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    Pricing & Specs
                  </button>
                  <span className="text-zinc-750">|</span>
                  <button
                    onClick={() => setSidebarTab("buildup")}
                    className={`text-xs font-bold transition cursor-pointer ${
                      sidebarTab === "buildup" ? "text-violet-400 font-extrabold" : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    Cost Buildup
                  </button>
                  <span className="text-zinc-750">|</span>
                  <button
                    onClick={() => setSidebarTab("map")}
                    className={`text-xs font-bold transition cursor-pointer ${
                      sidebarTab === "map" ? "text-violet-400 font-extrabold" : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    Interactive Linker
                  </button>
                </div>
                <button
                  onClick={() => setSelectedItemId(null)}
                  className="text-zinc-500 hover:text-zinc-200 text-xs font-semibold p-1 cursor-pointer shrink-0"
                >
                  ✕ Close
                </button>
              </div>

              {/* ITEM BRIEF INFO */}
              <div className="bg-zinc-900/50 rounded-xl p-3.5 border border-zinc-900 mb-4 text-xs">
                <div className="flex justify-between items-center">
                  <span className="rounded bg-violet-500/10 px-2 py-0.5 text-[9px] font-bold text-violet-400 border border-violet-500/20 uppercase">
                    {selectedItem.category}
                  </span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-extrabold border uppercase ${
                    selectedItem.status === "Approved" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-zinc-800 text-zinc-400 border-zinc-700"
                  }`}>
                    {selectedItem.status}
                  </span>
                </div>
                <h5 className="font-bold text-zinc-100 mt-2 line-clamp-3 leading-relaxed">{selectedItem.description}</h5>
                {selectedItem.changeRequestComment && (
                  <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-2.5 mt-2.5 text-[10px] text-red-300">
                    <span className="font-extrabold uppercase text-[8px] block tracking-wider text-red-400 mb-0.5">Change Request Feedback</span>
                    {selectedItem.changeRequestComment}
                  </div>
                )}
              </div>

              {sidebarTab === "specs" && (
                <>
                  {/* MULTI-ROLE REVIEW ACTIONS CONSOLE */}
                  {!boqLocked && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 mb-5 text-xs">
                      <span className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-widest block mb-2">Workflow Console Actions</span>
                      
                      <div className="flex flex-col gap-2">
                        {currentUserRole === "junior" && (selectedItem.status === "Draft" || selectedItem.status === "Revision Requested") && (
                          <button
                            onClick={() => handleItemStatusChange(selectedItem.id, "Pending Senior Review")}
                            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 rounded-lg transition uppercase tracking-wider text-[10px] cursor-pointer"
                          >
                            Submit to Senior Review
                          </button>
                        )}

                        {currentUserRole === "senior" && selectedItem.status === "Pending Senior Review" && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleItemStatusChange(selectedItem.id, "Pending Procurement")}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg transition uppercase text-[10px] cursor-pointer"
                            >
                              Approve Specs
                            </button>
                            <button
                              onClick={handleTriggerRevisionRequest}
                              className="flex-1 bg-red-900/30 border border-red-800/40 hover:bg-red-900/50 text-red-400 font-bold py-2 rounded-lg transition uppercase text-[10px] cursor-pointer"
                            >
                              Reject Bids
                            </button>
                          </div>
                        )}

                        {currentUserRole === "procurement" && selectedItem.status === "Pending Procurement" && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleItemStatusChange(selectedItem.id, "Approved")}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg transition uppercase text-[10px] cursor-pointer"
                            >
                              Approve Rates
                            </button>
                            <button
                              onClick={handleTriggerRevisionRequest}
                              className="flex-1 bg-red-900/30 border border-red-800/40 hover:bg-red-900/50 text-red-400 font-bold py-2 rounded-lg transition uppercase text-[10px] cursor-pointer"
                            >
                              Reject Rates
                            </button>
                          </div>
                        )}

                        {currentUserRole === "admin" && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleItemStatusChange(selectedItem.id, "Approved")}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 rounded-lg transition text-[9px] cursor-pointer"
                            >
                              Force Approve
                            </button>
                            <button
                              onClick={() => handleItemStatusChange(selectedItem.id, "Draft")}
                              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-1.5 rounded-lg transition text-[9px] cursor-pointer"
                            >
                              Reset Draft
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 1. DRAWING SPEC & APPROVED MAKE LINKING SECTION */}
                  <div className="mb-5 border border-zinc-900 rounded-xl p-3 bg-zinc-900/20 text-xs">
                    <span className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-widest block mb-2">Coordination Attachment Links</span>
                    
                    {/* DRAWINGS BADGES */}
                    <div className="mb-3">
                      <span className="text-[10px] text-zinc-400 block mb-1">Attached PDF Blueprints:</span>
                      {selectedItem.references.drawings && selectedItem.references.drawings.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {selectedItem.references.drawings.map((dwg) => (
                            <button
                              key={dwg.id}
                              onClick={() => setActiveDrawingSheet({ sheetNumber: dwg.sheetNumber, title: dwg.title })}
                              className="px-2.5 py-1 rounded bg-sky-500/10 text-sky-400 hover:bg-sky-500 hover:text-zinc-950 font-bold border border-sky-500/20 transition text-[10px] cursor-pointer"
                              title={`Preview CAD ${dwg.title}`}
                            >
                              📐 {dwg.sheetNumber} (Preview)
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-zinc-600 italic">No blueprints mapped to this row.</span>
                      )}
                    </div>

                    {/* APPROVED MAKES BADGES */}
                    <div>
                      <span className="text-[10px] text-zinc-400 block mb-1">Approved Manufacturers:</span>
                      {selectedItem.references.makes && selectedItem.references.makes.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {selectedItem.references.makes.map((mk, mi) => (
                            <span
                              key={mi}
                              className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-medium text-[9px] border border-zinc-700"
                            >
                              📋 {mk.brand} ({mk.status})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-zinc-600 italic">No approved manufacturers attached.</span>
                      )}
                    </div>
                  </div>

                  {/* 2. HISTORICAL RATES RECOMMENDATIONS */}
                  <div className="mb-5">
                    <h5 className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <svg className="h-3 w-3 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Historical Reference Rates
                    </h5>
                    
                    {historicalRecord ? (
                      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 hover:border-zinc-700 transition">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-bold text-violet-400">{historicalRecord.basedOnProject}</span>
                            <p className="text-[10px] text-zinc-500 mt-0.5">Supplier: {historicalRecord.basedOnVendor} · {historicalRecord.city}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-extrabold text-zinc-100 text-xs block">{formatPrice(historicalRecord.suggestedRate)}</span>
                            <span className="text-[9px] text-zinc-500">{historicalRecord.updatedDaysAgo}d ago</span>
                          </div>
                        </div>
                        
                        {!boqLocked && canEditRow(selectedItem) && (
                          <button
                            onClick={() => updateItemField(selectedItem.id, "rate", historicalRecord.suggestedRate)}
                            className="w-full mt-2 bg-violet-600/10 hover:bg-violet-600 text-violet-400 hover:text-white font-bold text-[9px] py-1.5 rounded-lg border border-violet-500/20 transition-all uppercase cursor-pointer"
                          >
                            Apply suggested rate
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-[10px] text-zinc-600 italic">No historical matches registered for this category.</p>
                    )}
                  </div>

                  {/* 3. SUPPLIER QUOTATION COMPARISONS */}
                  <div>
                    <h5 className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <svg className="h-3 w-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Active Supplier Bid Comparisons
                    </h5>

                    {matchedSupplierQuotes.length > 0 ? (
                      <div className="space-y-2">
                        {matchedSupplierQuotes.slice(0, 2).map((quote, qi) => {
                          const isLowest = qi === 0;
                          return (
                            <div
                              key={qi}
                              className={`border rounded-xl p-3 relative overflow-hidden transition ${
                                isLowest
                                  ? "bg-emerald-950/10 border-emerald-500/30 hover:border-emerald-500/50"
                                  : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                              }`}
                            >
                              {isLowest && (
                                <div className="absolute top-0 right-0 bg-emerald-500/10 px-2 py-0.5 rounded-bl text-[8px] font-extrabold text-emerald-400 border-l border-b border-emerald-500/20 uppercase tracking-wider">
                                  Lowest quote
                                </div>
                              )}
                              <div className="flex justify-between items-start text-xs">
                                <div>
                                  <span className="font-extrabold text-zinc-200">{quote.vendor}</span>
                                  <p className="text-[10px] text-zinc-500 mt-0.5">Brand: {quote.brand} · {quote.date}</p>
                                </div>
                                <div className="text-right">
                                  <span className={`font-extrabold text-xs block ${isLowest ? "text-emerald-400" : "text-zinc-100"}`}>
                                    {formatPrice(quote.rate)}
                                  </span>
                                  <span className="text-[9px] text-zinc-500">/{selectedItem.unit}</span>
                                </div>
                              </div>

                              {!boqLocked && canEditRow(selectedItem) && (
                                <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-zinc-900 pt-2 text-[9px] text-zinc-500">
                                  <span className="truncate max-w-[120px]" title={quote.file}>{quote.file}</span>
                                  <button
                                    onClick={() => {
                                      updateItemField(selectedItem.id, "selectedVendor", quote.vendor);
                                      updateItemField(selectedItem.id, "rate", quote.rate);
                                    }}
                                    className="font-bold px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
                                  >
                                    Match Bid Rate
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-3 text-center text-xs">
                        <p className="text-zinc-500 italic">No matching supplier bids found in live quotations.</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {sidebarTab === "buildup" && (
                <div className="space-y-4 animate-in fade-in duration-200 text-xs text-zinc-300">
                  {/* 1. Rate Type Mode Selector */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                    <span className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-widest block mb-2">Estimation Rate Mode</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateItemField(selectedItem.id, "rateType", "unit")}
                        className={`flex-1 py-1.5 px-3 rounded-lg font-bold text-[10px] transition uppercase tracking-wider cursor-pointer ${
                          (selectedItem.rateType || "unit") === "unit"
                            ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
                            : "bg-zinc-950 text-zinc-500 border border-zinc-900 hover:text-zinc-300"
                        }`}
                      >
                        Unit Rate (Manual)
                      </button>
                      <button
                        onClick={() => updateItemField(selectedItem.id, "rateType", "composite")}
                        className={`flex-1 py-1.5 px-3 rounded-lg font-bold text-[10px] transition uppercase tracking-wider cursor-pointer ${
                          selectedItem.rateType === "composite"
                            ? "bg-violet-950/40 text-violet-400 border border-violet-500/30"
                            : "bg-zinc-950 text-zinc-500 border border-zinc-900 hover:text-zinc-300"
                        }`}
                      >
                        Composite Buildup
                      </button>
                    </div>
                    <p className="text-[9px] text-zinc-500 mt-2 leading-relaxed">
                      {(selectedItem.rateType || "unit") === "unit"
                        ? "Supply-and-install rate is defined as a single static value. Sliders are disabled."
                        : "Supply-and-install rate is built up dynamically from list prices, trade discounts, overheads, and installation labor."}
                    </p>
                  </div>

                  {/* 2. AI Price List Catalog Lookup Callout Card */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-violet-500/10 px-2 py-0.5 rounded-bl text-[8px] font-extrabold text-violet-400 border-l border-b border-violet-500/20 uppercase tracking-wider select-none">
                      AI Engine
                    </div>
                    <span className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-widest block mb-2">Price Catalog Matching</span>
                    
                    {(() => {
                      const catalogs = projectFiles.filter(f => f.category === "make_list" || f.file_name.toLowerCase().includes("pricelist") || f.file_name.toLowerCase().includes("catalog"));
                      if (catalogs.length > 0) {
                        return (
                          <div className="space-y-2">
                            <div className="bg-zinc-950/60 rounded-lg p-2 border border-zinc-950 text-[10px]">
                              <p className="text-zinc-400 font-bold mb-1 flex items-center gap-1">
                                📂 {catalogs.length} price lists available:
                              </p>
                              <ul className="list-disc pl-3 text-zinc-500 space-y-0.5 line-clamp-2">
                                {catalogs.map(c => (
                                  <li key={c.id} className="truncate">{c.file_name}</li>
                                ))}
                              </ul>
                            </div>
                            
                            <button
                              disabled={catalogMatchingLoading || boqLocked}
                              onClick={handleQueryAiCatalog}
                              className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white font-bold py-2 rounded-lg transition uppercase tracking-wider text-[10px] cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-violet-500/10"
                            >
                              {catalogMatchingLoading ? (
                                <>
                                  <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                  Searching Price Lists...
                                </>
                              ) : (
                                <>
                                  🔍 Query AI Price List Catalog
                                </>
                              )}
                            </button>
                          </div>
                        );
                      } else {
                        return (
                          <div className="bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-900/60 text-center text-zinc-500 text-[10px] leading-relaxed">
                            <span className="block mb-1 text-amber-500/80 font-bold">⚠️ No Price Lists Uploaded</span>
                            Upload supplier catalogs or price list PDFs (under 'make_list' category) to let the AI search for the official MSRP.
                          </div>
                        );
                      }
                    })()}
                  </div>

                  {/* 3. Calculations Sliders & Numeric Inputs */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 space-y-4">
                    <span className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-widest block mb-1">QS Cost Buildup Parameters</span>
                    
                    {/* List Price (MSRP) */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-zinc-400 font-bold">List Price (MSRP):</span>
                        <span className="text-zinc-500 font-mono text-[9px]">(₹)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          disabled={boqLocked || (selectedItem.rateType || "unit") === "unit"}
                          value={selectedItem.listPrice !== undefined ? selectedItem.listPrice : selectedItem.rate}
                          onChange={(e) => updateItemField(selectedItem.id, "listPrice", Number(e.target.value))}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-1 px-2.5 font-mono text-xs text-zinc-100 focus:outline-none focus:border-violet-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
                          min="0"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    {/* Trade Discount */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-zinc-400 font-bold">Trade Discount:</span>
                        <span className="text-violet-400 font-mono font-extrabold">{selectedItem.discountPercentage ?? 0}%</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          disabled={boqLocked || (selectedItem.rateType || "unit") === "unit"}
                          min="0"
                          max="80"
                          step="1"
                          value={selectedItem.discountPercentage ?? 0}
                          onChange={(e) => updateItemField(selectedItem.id, "discountPercentage", Number(e.target.value))}
                          className="w-full accent-violet-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                        <input
                          type="number"
                          disabled={boqLocked || (selectedItem.rateType || "unit") === "unit"}
                          min="0"
                          max="100"
                          value={selectedItem.discountPercentage ?? 0}
                          onChange={(e) => updateItemField(selectedItem.id, "discountPercentage", Math.min(100, Number(e.target.value)))}
                          className="w-14 bg-zinc-950 border border-zinc-800 rounded-lg py-0.5 px-1.5 font-mono text-center text-[10px] text-zinc-200 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>

                    {/* Execution Overheads */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-zinc-400 font-bold" title="Carriage, storage, tools, safety & scaffolding">
                          Execution Overheads:
                        </span>
                        <span className="text-violet-400 font-mono font-extrabold">{selectedItem.overheadPercentage ?? 0}%</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          disabled={boqLocked || (selectedItem.rateType || "unit") === "unit"}
                          min="0"
                          max="30"
                          step="0.5"
                          value={selectedItem.overheadPercentage ?? 0}
                          onChange={(e) => updateItemField(selectedItem.id, "overheadPercentage", Number(e.target.value))}
                          className="w-full accent-violet-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                        <input
                          type="number"
                          disabled={boqLocked || (selectedItem.rateType || "unit") === "unit"}
                          min="0"
                          max="100"
                          value={selectedItem.overheadPercentage ?? 0}
                          onChange={(e) => updateItemField(selectedItem.id, "overheadPercentage", Math.min(100, Number(e.target.value)))}
                          className="w-14 bg-zinc-950 border border-zinc-800 rounded-lg py-0.5 px-1.5 font-mono text-center text-[10px] text-zinc-200 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>

                    {/* Labor Cost */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-zinc-400 font-bold" title="Installation, testing & commissioning labor">
                          Installation Labor Cost:
                        </span>
                        <span className="text-zinc-500 font-mono text-[9px]">(₹)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          disabled={boqLocked || (selectedItem.rateType || "unit") === "unit"}
                          value={selectedItem.laborCost ?? 0}
                          onChange={(e) => updateItemField(selectedItem.id, "laborCost", Number(e.target.value))}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-1 px-2.5 font-mono text-xs text-zinc-100 focus:outline-none focus:border-violet-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
                          min="0"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 4. Live Formula Blueprint Card */}
                  {(() => {
                    const listPrice = selectedItem.listPrice !== undefined ? selectedItem.listPrice : selectedItem.rate;
                    const discount = selectedItem.discountPercentage ?? 0;
                    const overhead = selectedItem.overheadPercentage ?? 0;
                    const labor = selectedItem.laborCost ?? 0;

                    const discountAmt = listPrice * (discount / 100);
                    const netMaterial = listPrice - discountAmt;
                    const overheadAmt = netMaterial * (overhead / 100);
                    const landedMaterial = netMaterial + overheadAmt;
                    const compositeRate = landedMaterial + labor;

                    return (
                      <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-3.5 font-mono space-y-2.5 text-[10px] relative overflow-hidden select-none">
                        <div className="absolute top-0 right-0 h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse m-2" />
                        <span className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-widest block mb-1">Live Formula Blueprint</span>
                        
                        <div className="space-y-1 divide-y divide-zinc-900/60 font-sans">
                          <div className="flex justify-between py-1 text-zinc-400 font-mono">
                            <span>List Price (MSRP)</span>
                            <span className="text-zinc-200">{formatPrice(listPrice)}</span>
                          </div>
                          
                          <div className="flex justify-between py-1 text-zinc-400 font-mono">
                            <span>Trade Discount ({discount}%)</span>
                            <span className="text-red-400/80">- {formatPrice(discountAmt)}</span>
                          </div>

                          <div className="flex justify-between py-1 text-zinc-300 font-bold bg-zinc-900/20 px-1 rounded font-mono">
                            <span>Net Material Cost</span>
                            <span>= {formatPrice(netMaterial)}</span>
                          </div>

                          <div className="flex justify-between py-1 text-zinc-400 font-mono">
                            <span>Overhead Markup ({overhead}%)</span>
                            <span className="text-emerald-400/80">+ {formatPrice(overheadAmt)}</span>
                          </div>

                          <div className="flex justify-between py-1 text-zinc-300 font-bold bg-zinc-900/20 px-1 rounded font-mono">
                            <span>Material Landed Cost</span>
                            <span>= {formatPrice(landedMaterial)}</span>
                          </div>

                          <div className="flex justify-between py-1 text-zinc-400 font-mono">
                            <span>Labor / Installation</span>
                            <span className="text-emerald-400/80">+ {formatPrice(labor)}</span>
                          </div>

                          <div className="flex justify-between py-1.5 text-xs text-violet-400 font-black border-t border-violet-500/20 bg-violet-500/5 px-2 rounded-lg mt-1 shadow-inner font-mono">
                            <span>Composite Rate</span>
                            <span>= {formatPrice(compositeRate)}</span>
                          </div>

                          <div className="flex justify-between py-1 text-[9px] text-zinc-500 italic mt-1.5 font-mono">
                            <span>Grand Sum ({selectedItem.quantity} {selectedItem.unit})</span>
                            <span>{formatPrice(compositeRate * selectedItem.quantity)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {sidebarTab === "map" && (
                <div className="space-y-4 animate-in fade-in duration-200 text-xs select-none">
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3">
                    <span className="text-[10px] font-extrabold text-violet-400 uppercase tracking-wider block mb-1">Interactive Linker Console</span>
                    <p className="text-[10px] text-zinc-500 leading-normal">Toggle connections to instantly rebuild the active 3D MEP document relationship tree and autosave mapping matrices.</p>
                  </div>

                  {/* 1. DRAWINGS ACCORDION */}
                  <div className="border border-zinc-900 rounded-xl p-3 bg-zinc-900/20">
                    <span className="text-[10px] font-bold text-sky-400 block mb-2 uppercase tracking-wider flex items-center gap-1">📐 Link CAD Drawings</span>
                    <div className="space-y-2">
                      {[
                        { id: "dwg-1", sheet: "H-102", title: "HVAC Piping Layout" },
                        { id: "dwg-2", sheet: "H-104", title: "AHU Plan Schematic" },
                        { id: "dwg-3", sheet: "E-204", title: "Distribution Details" },
                        { id: "dwg-4", sheet: "P-101", title: "Plumbing Riser Plan" },
                        { id: "dwg-5", sheet: "F-102", title: "Sprinkler Layout Plan" }
                      ].map((d) => {
                        const isLinked = (selectedItem.references.drawings || []).some(dwg => dwg.id === d.id);
                        return (
                          <label key={d.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-zinc-900 transition cursor-pointer text-[11px]">
                            <input
                              type="checkbox"
                              checked={isLinked}
                              disabled={boqLocked || !canEditRow(selectedItem)}
                              onChange={() => toggleDrawingLink(selectedItem.id, d.id)}
                              className="accent-sky-500 rounded border-zinc-700 bg-zinc-950 focus:ring-0 cursor-pointer disabled:opacity-40"
                            />
                            <span className={isLinked ? "text-sky-300 font-bold" : "text-zinc-400"}>
                              {d.sheet} <span className="text-[9px] text-zinc-500">({d.title})</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. TENDER CLAUSES ACCORDION */}
                  <div className="border border-zinc-900 rounded-xl p-3 bg-zinc-900/20">
                    <span className="text-[10px] font-bold text-amber-400 block mb-2 uppercase tracking-wider flex items-center gap-1">📜 Link Contract Clauses</span>
                    <div className="space-y-2">
                      {[
                        { id: "cl-1", clause: "Section 14.2 (a)", title: "Delay Damages" },
                        { id: "cl-2", clause: "Section 17.3", title: "Equipment Warranty" },
                        { id: "cl-3", clause: "Section 8.4 (b)", title: "Payment Terms" },
                        { id: "cl-4", clause: "Section 3.1 (d)", title: "Design Verification" },
                        { id: "cl-5", clause: "Section 5.2", title: "Project Timeline" },
                        { id: "cl-6", clause: "Section 9.1", title: "Force Majeure" }
                      ].map((c) => {
                        const isLinked = (selectedItem.references.clauses || []).some(cl => cl.id === c.id);
                        return (
                          <label key={c.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-zinc-900 transition cursor-pointer text-[11px]">
                            <input
                              type="checkbox"
                              checked={isLinked}
                              disabled={boqLocked || !canEditRow(selectedItem)}
                              onChange={() => toggleClauseLink(selectedItem.id, c.id)}
                              className="accent-amber-500 rounded border-zinc-700 bg-zinc-950 focus:ring-0 cursor-pointer disabled:opacity-40"
                            />
                            <span className={isLinked ? "text-amber-300 font-bold" : "text-zinc-400"}>
                              {c.clause} <span className="text-[9px] text-zinc-500">({c.title})</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. VENDOR QUOTES ACCORDION */}
                  <div className="border border-zinc-900 rounded-xl p-3 bg-zinc-900/20">
                    <span className="text-[10px] font-bold text-emerald-400 block mb-2 uppercase tracking-wider flex items-center gap-1">🤝 Link Vendor Quotations</span>
                    <div className="space-y-2">
                      {[
                        { id: "vq-1", name: "Havells", rate: 145 },
                        { id: "vq-2", name: "ABC Metals & Tubes", rate: 425 },
                        { id: "vq-3", name: "Supreme Piping Corp", rate: 440 },
                        { id: "vq-4", name: "Polycab", rate: 38 },
                        { id: "vq-5", name: "Tata Steel Piping", rate: 650 },
                        { id: "vq-6", name: "Tyco Fire Protection", rate: 850 },
                        { id: "vq-7", name: "Grundfos India", rate: 15500 }
                      ].map((v) => {
                        const isLinked = (selectedItem.references.vendorQuotes || []).some(vq => vq.id === v.id);
                        return (
                          <label key={v.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-zinc-900 transition cursor-pointer text-[11px]">
                            <input
                              type="checkbox"
                              checked={isLinked}
                              disabled={boqLocked || !canEditRow(selectedItem)}
                              onChange={() => toggleVendorQuoteLink(selectedItem.id, v.id)}
                              className="accent-emerald-500 rounded border-zinc-700 bg-zinc-950 focus:ring-0 cursor-pointer disabled:opacity-40"
                            />
                            <span className={isLinked ? "text-emerald-300 font-bold" : "text-zinc-400"}>
                              {v.name} <span className="text-[9px] text-zinc-500">(Rate: ₹{v.rate})</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* 4. AI RISK FINDINGS ACCORDION */}
                  <div className="border border-zinc-900 rounded-xl p-3 bg-zinc-900/20">
                    <span className="text-[10px] font-bold text-rose-400 block mb-2 uppercase tracking-wider flex items-center gap-1">⚠ Link AI Risk Warnings</span>
                    <div className="space-y-2">
                      {[
                        { id: "rk-1", risk: "Uncapped Delay Liability", severity: "high" },
                        { id: "rk-2", risk: "Extended Warranty Obligation", severity: "medium" },
                        { id: "rk-3", risk: "90-day Payment Cash Flow", severity: "high" },
                        { id: "rk-4", risk: "Design Routing Discrepancy", severity: "medium" },
                        { id: "rk-5", risk: "Timeline Schedule Acceleration", severity: "high" },
                        { id: "rk-6", risk: "Customs Supply Chain Delay", severity: "low" }
                      ].map((r) => {
                        const isLinked = (selectedItem.references.risks || []).some(rk => rk.id === r.id);
                        return (
                          <label key={r.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-zinc-900 transition cursor-pointer text-[11px]">
                            <input
                              type="checkbox"
                              checked={isLinked}
                              disabled={boqLocked || !canEditRow(selectedItem)}
                              onChange={() => toggleRiskLink(selectedItem.id, r.id)}
                              className="accent-rose-500 rounded border-zinc-700 bg-zinc-950 focus:ring-0 cursor-pointer disabled:opacity-40"
                            />
                            <span className={isLinked ? "text-rose-300 font-bold" : "text-zinc-400"}>
                              {r.risk} <span className={`text-[8px] font-extrabold uppercase px-1 rounded ml-1 ${
                                r.severity === "high" ? "bg-red-500/10 text-red-400" : r.severity === "medium" ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"
                              }`}>{r.severity}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* B. REVISION TIMELINE / HISTORICAL VIEWS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "timeline" && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-xl max-w-4xl mx-auto animate-in fade-in duration-200 select-none">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-zinc-50">Git-Style BOQ Revision Timeline</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Chronological catalog of locked checkpoints, authors, and estimation diffs.</p>
            </div>
            <button
              onClick={() => setShowCommitModal(true)}
              className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
            >
              Commit Current State
            </button>
          </div>

          <div className="relative border-l border-zinc-800 ml-4 pl-8 space-y-6">
            {revisions.map((rev, ri) => {
              // Calculate dynamic changes count compared to previous revision
              const prevRev = revisions[ri + 1];
              let addCount = 0;
              let delCount = 0;
              let modCount = 0;

              if (prevRev) {
                const prevMap = new Map(prevRev.items.map(it => [it.id, it]));
                const currentMap = new Map(rev.items.map(it => [it.id, it]));

                // Additions & Modifications
                for (const curItem of rev.items) {
                  const prevItem = prevMap.get(curItem.id);
                  if (!prevItem) {
                    addCount++;
                  } else if (prevItem.rate !== curItem.rate || prevItem.quantity !== curItem.quantity || prevItem.status !== curItem.status) {
                    modCount++;
                  }
                }

                // Deletions
                for (const prevItem of prevRev.items) {
                  if (!currentMap.has(prevItem.id)) {
                    delCount++;
                  }
                }
              }

              return (
                <div key={rev.id} className="relative group animate-in slide-in-from-left-2">
                  {/* Glowing Node Marker */}
                  <span className={`absolute -left-[39.5px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-950 border-2 transition ${
                    ri === 0 ? "border-violet-500 shadow-md shadow-violet-500/20" : "border-zinc-700"
                  }`} />

                  <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-5 hover:border-zinc-700 transition">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-violet-500/10 px-2.5 py-0.5 text-xs font-extrabold text-violet-400 border border-violet-500/20 uppercase select-none">
                          Version {rev.versionNumber}
                        </span>
                        {ri === 0 && (
                          <span className="rounded bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/20 uppercase select-none">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {new Date(rev.createdAt).toLocaleString()} · Author: <span className="text-zinc-400 font-semibold">{rev.author}</span>
                      </div>
                    </div>

                    <h4 className="text-sm font-bold text-zinc-100">{rev.comment}</h4>
                    {rev.notes && (
                      <p className="text-xs text-zinc-400 mt-2 bg-zinc-950/40 p-3 rounded-lg border border-zinc-900 leading-relaxed italic">
                        Notes: {rev.notes}
                      </p>
                    )}

                    {/* Diff counts indicators */}
                    {prevRev && (
                      <div className="flex gap-4.5 text-[10px] text-zinc-500 font-bold mt-4 pt-3 border-t border-zinc-800">
                        <span className="text-emerald-400 flex items-center gap-1">✚ {addCount} additions</span>
                        <span className="text-red-400 flex items-center gap-1">➖ {delCount} deletions</span>
                        <span className="text-amber-400 flex items-center gap-1">⟲ {modCount} modifications</span>
                      </div>
                    )}

                    {/* Revision Control Actions */}
                    <div className="flex gap-3 mt-4 text-xs">
                      {prevRev && (
                        <button
                          onClick={() => {
                            setComparingRevisionId(rev.id);
                            setActiveTab("comparison");
                          }}
                          className="bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 rounded-xl px-4 py-2 font-semibold text-zinc-300 transition cursor-pointer"
                        >
                          Compare Side-by-Side
                        </button>
                      )}
                      
                      {ri > 0 && !boqLocked && (
                        <button
                          onClick={() => handleRestoreRevision(rev)}
                          className="bg-violet-600 hover:bg-violet-700 rounded-xl px-4 py-2 font-bold text-white transition cursor-pointer"
                        >
                          Restore version
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* C. SPLIT-SCREEN REVISION COMPARISON VIEW */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "comparison" && selectedRevForComparison && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-xl animate-in fade-in duration-200 select-none">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-zinc-50">Revision Diff Comparison Panel</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Comparing current <span className="text-emerald-400 font-bold">Active Workspace</span> against historical checkpoint <span className="text-violet-400 font-bold">Version {selectedRevForComparison.versionNumber}</span> ({selectedRevForComparison.comment}).
              </p>
            </div>
            <button
              onClick={() => {
                setActiveTab("timeline");
                setComparingRevisionId(null);
              }}
              className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-xl px-4 py-2 text-xs font-bold text-zinc-300 transition cursor-pointer"
            >
              ← Back to Timeline
            </button>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs divide-y divide-zinc-800 border-collapse table-fixed">
              <thead className="bg-zinc-950 text-zinc-400 sticky top-0 z-20 shadow-md">
                <tr className="divide-x divide-zinc-900 border-b border-zinc-800 font-bold uppercase text-[9px] tracking-wider">
                  <th className="w-12 px-2.5 py-3 text-center">#</th>
                  <th className="w-24 px-2 py-3">Category</th>
                  <th className="w-64 px-3 py-3">Description</th>
                  <th className="w-16 px-2 py-3">Unit</th>
                  <th className="w-36 px-3 py-3 text-right">Quantity shift</th>
                  <th className="w-36 px-3 py-3 text-right">Rate shift</th>
                  <th className="w-28 px-3 py-3 text-right">Total amount</th>
                  <th className="w-28 px-3 py-3 text-center">Status Diff</th>
                  <th className="w-16 px-2 py-3 text-center">Diff</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-900 bg-zinc-950">
                {(() => {
                  // Compute dynamic diff map
                  const prevItemsMap = new Map(selectedRevForComparison.items.map(it => [it.id, it]));
                  const currentItemsMap = new Map(items.map(it => [it.id, it]));

                  const allIds = Array.from(new Set([...prevItemsMap.keys(), ...currentItemsMap.keys()]));

                  return allIds.map((id) => {
                    const prev = prevItemsMap.get(id);
                    const cur = currentItemsMap.get(id);

                    if (!prev && cur) {
                      // Row Added
                      return (
                        <tr key={id} className="divide-x divide-zinc-900 bg-emerald-500/5 hover:bg-emerald-500/10 transition">
                          <td className="px-2.5 py-3 text-center text-emerald-400 font-bold font-mono">+</td>
                          <td className="px-2 py-3 font-semibold text-emerald-400">{cur.category}</td>
                          <td className="px-3 py-3 text-emerald-300 font-medium">{cur.description}</td>
                          <td className="px-2 py-3 text-center">{cur.unit}</td>
                          <td className="px-3 py-3 text-right text-emerald-400 font-bold">{cur.quantity}</td>
                          <td className="px-3 py-3 text-right text-emerald-400 font-bold">{formatPrice(cur.rate)}</td>
                          <td className="px-3 py-3 text-right text-emerald-400 font-extrabold">{formatPrice(cur.amount)}</td>
                          <td className="px-3 py-3 text-center">
                            <span className="rounded bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/20 text-[9px] font-bold text-emerald-400 uppercase">
                              {cur.status}
                            </span>
                          </td>
                          <td className="px-2 py-3 text-center text-emerald-400 font-bold uppercase tracking-widest text-[9px]">Added</td>
                        </tr>
                      );
                    }

                    if (prev && !cur) {
                      // Row Deleted
                      return (
                        <tr key={id} className="divide-x divide-zinc-900 bg-red-500/5 hover:bg-red-500/10 transition">
                          <td className="px-2.5 py-3 text-center text-red-400 font-bold font-mono">−</td>
                          <td className="px-2 py-3 font-semibold text-red-500">{prev.category}</td>
                          <td className="px-3 py-3 text-red-400/80 line-through">{prev.description}</td>
                          <td className="px-2 py-3 text-center line-through text-zinc-600">{prev.unit}</td>
                          <td className="px-3 py-3 text-right text-red-400/80 font-bold">{prev.quantity}</td>
                          <td className="px-3 py-3 text-right text-red-400/80 font-bold">{formatPrice(prev.rate)}</td>
                          <td className="px-3 py-3 text-right text-red-400/80 font-extrabold">{formatPrice(prev.amount)}</td>
                          <td className="px-3 py-3 text-center">
                            <span className="rounded bg-zinc-800 px-2 py-0.5 border border-zinc-700 text-[9px] font-bold text-zinc-500 uppercase line-through">
                              {prev.status}
                            </span>
                          </td>
                          <td className="px-2 py-3 text-center text-red-400 font-bold uppercase tracking-widest text-[9px]">Deleted</td>
                        </tr>
                      );
                    }

                    if (prev && cur) {
                      const qtyChanged = prev.quantity !== cur.quantity;
                      const rateChanged = prev.rate !== cur.rate;
                      const statusChanged = prev.status !== cur.status;
                      const isModified = qtyChanged || rateChanged || statusChanged;

                      return (
                        <tr
                          key={id}
                          className={`divide-x divide-zinc-900 transition ${
                            isModified ? "bg-amber-500/5 hover:bg-amber-500/10 text-zinc-200" : "hover:bg-zinc-900/30 text-zinc-300"
                          }`}
                        >
                          <td className="px-2.5 py-3 text-center text-zinc-500 font-medium">{cur.item_no}</td>
                          <td className="px-2 py-3">{cur.category}</td>
                          <td className="px-3 py-3 truncate max-w-[200px]" title={cur.description}>{cur.description}</td>
                          <td className="px-2 py-3 text-center">{cur.unit}</td>
                          
                          {/* Qty Shift */}
                          <td className="px-3 py-3 text-right">
                            {qtyChanged ? (
                              <span className="text-amber-400 font-bold">
                                {prev.quantity} → {cur.quantity}
                              </span>
                            ) : (
                              <span>{cur.quantity}</span>
                            )}
                          </td>

                          {/* Rate Shift */}
                          <td className="px-3 py-3 text-right">
                            {rateChanged ? (
                              <span className="text-amber-400 font-bold">
                                {formatPrice(prev.rate)} → {formatPrice(cur.rate)}
                              </span>
                            ) : (
                              <span>{formatPrice(cur.rate)}</span>
                            )}
                          </td>

                          {/* Amount Shift */}
                          <td className="px-3 py-3 text-right font-extrabold">
                            {formatPrice(cur.amount)}
                          </td>

                          {/* Status Shift */}
                          <td className="px-3 py-3 text-center">
                            {statusChanged ? (
                              <div className="flex items-center gap-1.5 justify-center text-[10px]">
                                <span className="text-zinc-500 line-through">{prev.status}</span>
                                <span className="text-zinc-500">→</span>
                                <span className="rounded bg-violet-500/10 px-2 py-0.5 border border-violet-500/20 font-bold text-violet-400 uppercase">
                                  {cur.status}
                                </span>
                              </div>
                            ) : (
                              <span className={`rounded-full px-2 py-0.5 border text-[9px] font-extrabold uppercase ${
                                cur.status === "Approved" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-zinc-800 text-zinc-400 border-zinc-700"
                              }`}>
                                {cur.status}
                              </span>
                            )}
                          </td>

                          <td className="px-2 py-3 text-center font-bold uppercase tracking-widest text-[9px]">
                            {isModified ? (
                              <span className="text-amber-400">Mod</span>
                            ) : (
                              <span className="text-zinc-600">Same</span>
                            )}
                          </td>
                        </tr>
                      );
                    }
                    return null;
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* D. MEP RELATIONSHIP TREE GRAPH TAB */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "relationship-map" && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-xl w-full animate-in fade-in duration-200 select-none">
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes dash {
              to {
                stroke-dashoffset: -20;
              }
            }
            .animate-dash {
              animation: dash 2s linear infinite;
            }
          `}} />

          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-zinc-900 pb-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-zinc-50 flex items-center gap-2">
                <span className="text-violet-500 text-xl">🔗</span> Construction Document Relationship Engine
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Audit traceability, resolve coordination gaps, and visualize 3D MEP relationships across bid documents.
              </p>
            </div>
            <button
              onClick={() => setActiveTab("grid")}
              className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-xl px-4 py-2 text-xs font-bold text-zinc-300 transition-all cursor-pointer mt-2 sm:mt-0"
            >
              ← Back to Estimation Grid
            </button>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Column (Traceability Gap Registry - w-full lg:w-[35%]) */}
            <div className="w-full lg:w-[35%] flex flex-col gap-4 border-r border-zinc-900/60 pr-0 lg:pr-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-zinc-300 uppercase tracking-wider block">Traceability Gap Registry</span>
                <span className="text-[10px] text-zinc-500 font-bold">{items.length} Total Rows</span>
              </div>
              
              {/* Registry Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search item or drawing sheet..."
                  value={graphSearchQuery}
                  onChange={(e) => setGraphSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:ring-1 focus:ring-violet-600 transition-all"
                />
              </div>

              {/* Gap Filter Pills */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "all", label: "All Mappings" },
                  { id: "missing-dwg", label: "Missing Drawings" },
                  { id: "missing-bid", label: "Missing Bids" },
                  { id: "high-risk", label: "High Risk Links" },
                  { id: "unlinked", label: "Unlinked Items" }
                ].map((pill) => (
                  <button
                    key={pill.id}
                    onClick={() => setGapFilter(pill.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                      gapFilter === pill.id
                        ? "bg-violet-600 border-violet-500 text-white shadow-md shadow-violet-600/10"
                        : "bg-zinc-900 border-zinc-850 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 cursor-pointer"
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              {/* Scrollable list of BOQ items */}
              <div className="overflow-y-auto max-h-[520px] pr-2 space-y-2.5">
                {(() => {
                  const filtered = items.filter(item => {
                    // Match description or drawing sheet number
                    const descMatch = (item.description || "").toLowerCase().includes(graphSearchQuery.toLowerCase());
                    const dwgMatch = (item.references?.drawings || []).some(d => (d.sheetNumber || "").toLowerCase().includes(graphSearchQuery.toLowerCase()));
                    if (!descMatch && !dwgMatch) return false;

                    // Filter gaps
                    const dwgCount = (item.references?.drawings || []).length;
                    const quotesCount = (item.references?.vendorQuotes || []).length;
                    const risksCount = (item.references?.risks || []).length;
                    const clausesCount = (item.references?.clauses || []).length;
                    const totalLinks = dwgCount + quotesCount + risksCount + clausesCount;

                    if (gapFilter === "missing-dwg") return dwgCount === 0;
                    if (gapFilter === "missing-bid") return quotesCount === 0;
                    if (gapFilter === "high-risk") return risksCount > 0 && (item.references?.risks || []).some(r => r.severity === "high");
                    if (gapFilter === "unlinked") return totalLinks === 0;

                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-10 bg-zinc-900/10 border border-zinc-900 rounded-xl p-4">
                        <span className="text-zinc-600 text-xs italic block">No items match current filters.</span>
                      </div>
                    );
                  }

                  return filtered.map(item => {
                    const isFocused = selectedItemId === item.id;
                    const dwgCount = (item.references?.drawings || []).length;
                    const clausesCount = (item.references?.clauses || []).length;
                    const makesCount = (item.references?.makes || []).length;
                    const quotesCount = (item.references?.vendorQuotes || []).length;
                    const risksCount = (item.references?.risks || []).length;

                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItemId(item.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer text-left select-none ${
                          isFocused
                            ? "bg-violet-950/20 border-violet-500/40 hover:border-violet-500/60 shadow-lg shadow-violet-950/10"
                            : "bg-zinc-900/40 border-zinc-900 hover:border-zinc-800"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2 mb-1.5">
                          <span className="text-[10px] font-extrabold text-zinc-500">Row {item.item_no}</span>
                          <span className={`rounded px-1.5 py-0.2 text-[8px] font-extrabold uppercase border ${
                            item.status === "Approved" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-zinc-800 text-zinc-400 border-zinc-700"
                          }`}>
                            {item.status}
                          </span>
                        </div>
                        
                        <h4 className={`text-xs font-bold truncate ${isFocused ? "text-violet-300" : "text-zinc-200"}`} title={item.description}>
                          {item.description}
                        </h4>

                        {/* Connection indicators */}
                        <div className="flex flex-wrap gap-x-2.5 gap-y-1 mt-2 pt-2 border-t border-zinc-900/60 text-[9px] font-bold text-zinc-500">
                          <span className={dwgCount > 0 ? "text-sky-400" : "text-zinc-600"}>📐 {dwgCount} Dwg</span>
                          <span className={clausesCount > 0 ? "text-amber-400" : "text-zinc-600"}>📋 {clausesCount} Clause</span>
                          <span className={makesCount > 0 ? "text-yellow-400" : "text-zinc-600"}>🏷️ {makesCount} Make</span>
                          <span className={quotesCount > 0 ? "text-emerald-400" : "text-zinc-600"}>🤝 {quotesCount} Bid</span>
                          <span className={risksCount > 0 ? "text-rose-400 animate-pulse" : "text-zinc-600"}>⚠ {risksCount} Risk</span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Right Column (Document Relationship Canvas - w-full lg:w-[65%]) */}
            <div className="w-full lg:w-[65%] flex flex-col gap-6">
              {selectedItem ? (
                <>
                  <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-4 flex justify-between items-center text-left">
                    <div>
                      <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest block">Currently Focused Active BOQ</span>
                      <h3 className="text-sm font-extrabold text-violet-400 mt-1">{selectedItem.description}</h3>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Category: {selectedItem.category} · Volume: {selectedItem.quantity} {selectedItem.unit} · Unit Price: {formatPrice(selectedItem.rate)}</p>
                    </div>
                    <button
                      onClick={() => setSidebarTab("map")}
                      className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-[10px] font-bold text-violet-400 hover:text-violet-300 transition-all rounded-lg px-2.5 py-1.5 cursor-pointer h-fit"
                    >
                      Open Linker Panel
                    </button>
                  </div>

                  {/* SVG Tree Graph */}
                  <div className="bg-zinc-900/60 border border-zinc-850 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[380px] relative overflow-hidden">
                    <svg className="w-full max-w-lg h-[240px]" viewBox="0 0 500 220">
                      <defs>
                        {/* Define glowing node drop-shadows */}
                        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="3" result="blur" />
                          <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                      </defs>

                      {/* BRANCH LINES WITH GLOWING stroke-dasharray CSS ANIMATIONS */}
                      {/* 1. Approved Make List Node (Top: 250, 35 - yellow) */}
                      <path
                        d="M 250 110 L 250 35"
                        fill="none"
                        stroke="#eab308"
                        strokeWidth="2.5"
                        strokeDasharray="4 4"
                        className="animate-dash"
                      />
                      
                      {/* 2. Blueprint Drawing Node (Top-Left: 80, 70 - sky) */}
                      <path
                        d="M 250 110 C 200 65, 130 70, 80 70"
                        fill="none"
                        stroke="#0ea5e9"
                        strokeWidth="2.5"
                        strokeDasharray="4 4"
                        className="animate-dash"
                      />

                      {/* 3. Tender Clause Node (Top-Right: 420, 70 - amber) */}
                      <path
                        d="M 250 110 C 300 65, 370 70, 420 70"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="2.5"
                        strokeDasharray="4 4"
                        className="animate-dash"
                      />

                      {/* 4. Supplier Quotation Node (Bottom-Left: 80, 170 - emerald) */}
                      <path
                        d="M 250 110 C 200 155, 130 170, 80 170"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2.5"
                        strokeDasharray="4 4"
                        className="animate-dash"
                      />

                      {/* 5. AI Risk Warning Node (Bottom-Right: 420, 170 - rose) */}
                      <path
                        d="M 250 110 C 300 155, 370 170, 420 170"
                        fill="none"
                        stroke="#f43f5e"
                        strokeWidth="2.5"
                        strokeDasharray="4 4"
                        className="animate-dash"
                      />

                      {/* NODES */}
                      {/* Center Focus BOQ Node */}
                      <g transform="translate(250, 110)" className="cursor-default">
                        <circle r="36" fill="#1e1b4b" stroke="#818cf8" strokeWidth="2.5" className="animate-pulse" />
                        <rect x="-35" y="-12" width="70" height="24" rx="4" fill="#4f46e5" stroke="#6366f1" strokeWidth="1" />
                        <text y="3" fill="#ffffff" textAnchor="middle" className="text-[7.5px] font-extrabold select-none pointer-events-none">BOQ Row {selectedItem.item_no}</text>
                      </g>

                      {/* Leaf 1: Approved Make List (Top: 250, 35 - yellow) */}
                      <g
                        transform="translate(250, 35)"
                        className="cursor-pointer group"
                        onClick={() => setFocusedGraphNode("make")}
                      >
                        <rect
                          x="-55" y="-18" width="110" height="32" rx="8"
                          fill={focusedGraphNode === "make" ? "#2b2203" : "#171201"}
                          stroke={focusedGraphNode === "make" ? "#facc15" : "#eab308"}
                          strokeWidth="2"
                          className="transition-all hover:scale-105 duration-200"
                        />
                        <text y="-4" fill="#facc15" textAnchor="middle" className="text-[7.5px] font-extrabold uppercase">📋 Approved Make</text>
                        <text y="7" fill="#a1a1aa" textAnchor="middle" className="text-[6.5px] font-semibold truncate max-w-[90px]">
                          {selectedItem.references?.makes?.[0]?.brand || "Standard Specs"}
                        </text>
                      </g>

                      {/* Leaf 2: Blueprint Drawing (Top-Left: 80, 70 - sky) */}
                      <g
                        transform="translate(80, 70)"
                        className="cursor-pointer group"
                        onClick={() => {
                          setFocusedGraphNode("drawing");
                          const dwg = selectedItem.references?.drawings?.[0];
                          if (dwg) {
                            setActiveDrawingSheet({ sheetNumber: dwg.sheetNumber, title: dwg.title });
                          }
                        }}
                      >
                        <rect
                          x="-55" y="-18" width="110" height="32" rx="8"
                          fill={focusedGraphNode === "drawing" ? "#062235" : "#02121e"}
                          stroke={focusedGraphNode === "drawing" ? "#38bdf8" : "#0ea5e9"}
                          strokeWidth="2"
                          className="transition-all hover:scale-105 duration-200"
                        />
                        <text y="-4" fill="#38bdf8" textAnchor="middle" className="text-[7.5px] font-extrabold uppercase">📐 CAD Blueprint</text>
                        <text y="7" fill="#a1a1aa" textAnchor="middle" className="text-[6.5px] font-semibold">
                          {selectedItem.references?.drawings?.[0]?.sheetNumber || "Unattached"}
                        </text>
                      </g>

                      {/* Leaf 3: Tender Clause (Top-Right: 420, 70 - amber) */}
                      <g
                        transform="translate(420, 70)"
                        className="cursor-pointer group"
                        onClick={() => setFocusedGraphNode("clause")}
                      >
                        <rect
                          x="-55" y="-18" width="110" height="32" rx="8"
                          fill={focusedGraphNode === "clause" ? "#2c1a04" : "#170e01"}
                          stroke={focusedGraphNode === "clause" ? "#fbbf24" : "#f59e0b"}
                          strokeWidth="2"
                          className="transition-all hover:scale-105 duration-200"
                        />
                        <text y="-4" fill="#fbbf24" textAnchor="middle" className="text-[7.5px] font-extrabold uppercase">📜 Contract Clause</text>
                        <text y="7" fill="#a1a1aa" textAnchor="middle" className="text-[6.5px] font-semibold">
                          {selectedItem.references?.clauses?.[0]?.clauseNumber || "Unlinked"}
                        </text>
                      </g>

                      {/* Leaf 4: Supplier Quotation (Bottom-Left: 80, 170 - emerald) */}
                      <g
                        transform="translate(80, 170)"
                        className="cursor-pointer group"
                        onClick={() => setFocusedGraphNode("quote")}
                      >
                        <rect
                          x="-55" y="-18" width="110" height="32" rx="8"
                          fill={focusedGraphNode === "quote" ? "#022c22" : "#011711"}
                          stroke={focusedGraphNode === "quote" ? "#34d399" : "#10b981"}
                          strokeWidth="2"
                          className="transition-all hover:scale-105 duration-200"
                        />
                        <text y="-4" fill="#34d399" textAnchor="middle" className="text-[7.5px] font-extrabold uppercase">🤝 Vendor Quote</text>
                        <text y="7" fill="#a1a1aa" textAnchor="middle" className="text-[6.5px] font-semibold">
                          {selectedItem.references?.vendorQuotes?.[0]?.vendorName || "No active bids"}
                        </text>
                      </g>

                      {/* Leaf 5: AI Risk Warning (Bottom-Right: 420, 170 - rose) */}
                      <g
                        transform="translate(420, 170)"
                        className="cursor-pointer group"
                        onClick={() => setFocusedGraphNode("risk")}
                      >
                        <rect
                          x="-55" y="-18" width="110" height="32" rx="8"
                          fill={focusedGraphNode === "risk" ? "#3c111a" : "#1f050b"}
                          stroke={focusedGraphNode === "risk" ? "#fb7185" : "#f43f5e"}
                          strokeWidth="2"
                          className="transition-all hover:scale-105 duration-200"
                        />
                        <text y="-4" fill="#fb7185" textAnchor="middle" className="text-[7.5px] font-extrabold uppercase">⚠ AI Risk Warning</text>
                        <text y="7" fill="#a1a1aa" textAnchor="middle" className="text-[6.5px] font-semibold">
                          {selectedItem.references?.risks?.[0]?.riskDescription 
                            ? (selectedItem.references.risks[0].riskDescription.substring(0, 18) + "...")
                            : "No risks flagged"}
                        </text>
                      </g>
                    </svg>

                    <div className="absolute bottom-3 left-4 right-4 flex justify-between items-center text-[10px] text-zinc-500 font-bold select-none bg-zinc-950/40 px-3 py-1.5 rounded-xl border border-zinc-900/60">
                      <span>Click leaves to audit database connections live</span>
                      <div className="flex gap-2">
                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span> CAD</span>
                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Clause</span>
                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span> Make</span>
                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Bid</span>
                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span> Risk</span>
                      </div>
                    </div>
                  </div>

                  {/* Glassmorphic Details Deck */}
                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-5 shadow-xl min-h-[160px] animate-in fade-in duration-200">
                    {focusedGraphNode === "clause" && (
                      <div className="text-left">
                        <div className="flex justify-between items-center border-b border-zinc-900 pb-2 mb-3">
                          <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest flex items-center gap-1">📜 Attached Tender Contract Clause</span>
                          <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold text-amber-400 border border-amber-500/20 uppercase">
                            {selectedItem.references?.clauses?.[0]?.clauseNumber || "No clause attached"}
                          </span>
                        </div>
                        {selectedItem.references?.clauses?.[0] ? (
                          <div className="space-y-3">
                            <div>
                              <h4 className="text-xs font-extrabold text-zinc-200">{selectedItem.references.clauses[0].title}</h4>
                              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{selectedItem.references.clauses[0].summary}</p>
                            </div>
                            {selectedItem.references.clauses[0].originalText && (
                              <div className="bg-zinc-950/60 p-3 rounded-lg border border-zinc-900">
                                <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">Verbatim Contract Clause Text:</span>
                                <p className="text-[10px] text-zinc-400 italic leading-relaxed">"{selectedItem.references.clauses[0].originalText}"</p>
                              </div>
                            )}
                            <div className="bg-amber-950/10 p-2.5 rounded-lg border border-amber-500/10 text-[10px] text-amber-300">
                              <span className="font-extrabold uppercase text-[8px] block tracking-wider text-amber-400 mb-0.5">AI Recommended Amendment Proposal:</span>
                              "The Contractor shall be granted equivalent extensions of time and reimbursement of reasonable direct escalation costs for force majeure events including international customs delay."
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-6 text-zinc-500 italic text-xs">No active contract clause linked. Open the side-drawer Linker tab to attach contract references.</div>
                        )}
                      </div>
                    )}

                    {focusedGraphNode === "risk" && (() => {
                      const activeRisk = selectedItem.references?.risks?.[0];
                      return (
                        <div className="text-left">
                          <div className="flex justify-between items-center border-b border-zinc-900 pb-2 mb-3">
                            <span className="text-[10px] font-extrabold text-rose-400 uppercase tracking-widest flex items-center gap-1">⚠ AI-Generated Tender Risk Summary</span>
                            <span className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase border ${
                              activeRisk?.severity === "high"
                                ? "bg-red-500/10 text-red-400 border-red-500/20"
                                : activeRisk?.severity === "medium"
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            }`}>
                              Severity: {activeRisk?.severity || "Low"}
                            </span>
                          </div>
                          {activeRisk ? (
                            <div className="space-y-3">
                              <div>
                                <h4 className="text-xs font-extrabold text-zinc-200">{activeRisk.riskDescription}</h4>
                                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed flex items-center gap-1.5">
                                  Identified contractual risk exposure. Status:{" "}
                                  <span className={`font-extrabold px-1.5 py-0.5 rounded text-[9px] uppercase ${
                                    activeRisk.status === "Mitigated"
                                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                      : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                  }`}>
                                    {activeRisk.status}
                                  </span>
                                </p>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1 text-[10px]">
                                <div className="bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-900">
                                  <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-500 block mb-0.5">Mitigation Action Plan:</span>
                                  <p className="text-zinc-400 leading-normal">
                                    {activeRisk.id === "rk-1"
                                      ? "Add a delay penalty cap of 5% in contract and apply a 3.5% financing contingency rate buffer."
                                      : activeRisk.id === "rk-2"
                                        ? "Map an extended 60-month warranty and apply a 5% manufacturer warranty risk reserve buffer."
                                        : activeRisk.id === "rk-3"
                                          ? "Offset the 90-day progress payment credit terms by applying a 4% financing cost markup."
                                          : activeRisk.id === "rk-4"
                                            ? "Cushion routing coordinates clash liability by applying a 3% design-risk buffer."
                                            : activeRisk.id === "rk-5"
                                              ? "Offset fast-track double shift timeline schedule by applying a 6% overtime labor reserve buffer."
                                              : "Negotiate liability caps in standard contract terms and apply a 3% contingency rate buffer."
                                    }
                                  </p>
                                </div>
                                
                                {activeRisk.status === "Mitigated" ? (
                                  <div className="bg-emerald-950/15 p-2.5 rounded-lg border border-emerald-500/20 flex flex-col justify-center items-center text-center">
                                    <span className="text-[14px] mb-0.5">🛡️</span>
                                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-400">Risk Defended</span>
                                    <button
                                      onClick={() => handleMitigateRisk(selectedItem.id, activeRisk.id, "restore")}
                                      className="mt-2 text-[8px] font-extrabold text-zinc-400 hover:text-zinc-300 bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded transition-all cursor-pointer"
                                    >
                                      Restore Original Rate
                                    </button>
                                  </div>
                                ) : (
                                  <div className="bg-rose-950/10 p-2.5 rounded-lg border border-rose-500/10 flex flex-col justify-center items-center text-center">
                                    <span className="text-[8px] font-bold uppercase tracking-wider text-rose-400 block mb-0.5">Contingency Buffer:</span>
                                    <span className="text-xs font-extrabold text-rose-300">
                                      {activeRisk.id === "rk-1"
                                        ? "+3.5% Rate Markup"
                                        : activeRisk.id === "rk-2"
                                          ? "+5.0% Rate Markup"
                                          : activeRisk.id === "rk-3"
                                            ? "+4.0% Rate Markup"
                                            : activeRisk.id === "rk-4"
                                              ? "+3.0% Rate Markup"
                                              : activeRisk.id === "rk-5"
                                                ? "+6.0% Rate Markup"
                                                : "+3.0% Rate Markup"
                                      }
                                    </span>
                                    <button
                                      onClick={() => handleMitigateRisk(selectedItem.id, activeRisk.id, "apply")}
                                      className="mt-2 w-full text-[9px] font-extrabold text-white bg-rose-650 hover:bg-rose-700 active:scale-95 px-2 py-1.5 rounded-md border border-rose-500/20 transition-all flex items-center justify-center gap-1 cursor-pointer hover:shadow-md"
                                    >
                                      🛡️ Mitigate Risk
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-6 text-zinc-500 italic text-xs">No active risk findings attached to this row. Use the sidebar Linker tab to run audits and assign findings.</div>
                          )}
                        </div>
                      );
                    })()}

                    {focusedGraphNode === "make" && (
                      <div className="text-left">
                        <div className="flex justify-between items-center border-b border-zinc-900 pb-2 mb-3">
                          <span className="text-[10px] font-extrabold text-yellow-400 uppercase tracking-widest flex items-center gap-1">📋 Approved Manufacturer Make List Specifications</span>
                          <span className="text-[9px] text-zinc-500 font-bold">Approved Materials Specs</span>
                        </div>
                        {selectedItem.references?.makes && selectedItem.references.makes.length > 0 ? (
                          <div className="space-y-3">
                            <p className="text-[11px] text-zinc-400 leading-relaxed">
                              This item must strictly match standard tender specifications from the client's approved manufacturer make list:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {selectedItem.references.makes.map((mk, mi) => (
                                <div key={mi} className="bg-zinc-950/80 border border-zinc-800 rounded-lg p-2.5 flex items-center gap-3">
                                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
                                  <div>
                                    <span className="text-xs font-bold text-zinc-200">{mk.brand}</span>
                                    <span className={`text-[8px] font-extrabold uppercase px-1 rounded ml-2 ${
                                      mk.status === "Approved" ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-400"
                                    }`}>{mk.status}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-6 text-zinc-500 italic text-xs">No manufacturer brand specifications mapped. Link custom makes inside the side-drawer Linker tab.</div>
                        )}
                      </div>
                    )}

                    {focusedGraphNode === "quote" && (
                      <div className="text-left space-y-4">
                        <div>
                          <div className="flex justify-between items-center border-b border-zinc-900 pb-2 mb-3">
                            <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest flex items-center gap-1">🤝 Competitive Supplier Bids & Vendor Quotations</span>
                            <span className="text-[9px] text-zinc-500 font-bold">Procurement Comparison</span>
                          </div>
                          {selectedItem.references?.vendorQuotes && selectedItem.references.vendorQuotes.length > 0 ? (
                            <div className="space-y-3">
                              <p className="text-[11px] text-zinc-400 leading-normal">
                                Active vendor quotations parsed and linked to this BOQ item for cost comparison:
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px]">
                                {selectedItem.references.vendorQuotes.map((q) => (
                                  <div key={q.id} className="bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-900 flex justify-between items-start gap-2">
                                    <div className="flex-1">
                                      <span className="font-bold text-zinc-200">{q.vendorName}</span>
                                      <p className="text-[9px] text-zinc-500 mt-0.5 font-mono">Quote Ref: {q.quoteNumber}</p>
                                      <button
                                        onClick={() => handleNegotiateEmail(q.vendorName, q.rate, q.quoteNumber)}
                                        className="mt-2 text-[9px] font-extrabold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 rounded transition-all flex items-center gap-1 cursor-pointer"
                                        title="Generate and open a professional price matching negotiation email in your local client."
                                      >
                                        <span>✉</span> Negotiate Rate
                                      </button>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <span className="font-extrabold text-emerald-400 text-xs block">{formatPrice(q.rate)}</span>
                                      <span className="text-[8px] text-zinc-500">/{selectedItem.unit}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-6 text-zinc-500 italic text-xs">No active competitive vendor quotes linked to this BOQ row. Mapped quote prices appear here.</div>
                          )}
                        </div>

                        {/* AI Vendor Discovery Directory */}
                        <div className="border-t border-zinc-900 pt-4">
                          <div className="flex justify-between items-center border-b border-zinc-900 pb-2 mb-3">
                            <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest flex items-center gap-1">🔮 AI Regional Vendor Sourcing Directory</span>
                            <span className="text-[9px] text-zinc-500 font-bold">Region: {activeRegion}</span>
                          </div>

                          {sourcingResults && sourcingResults.length > 0 ? (
                            <div className="space-y-3">
                              <p className="text-[11px] text-zinc-400 leading-normal">
                                Top-tier regional MEP suppliers discovered for this item description in <span className="text-indigo-400 font-bold">{activeRegion}</span>:
                              </p>
                              <div className="space-y-2 text-[10px]">
                                {sourcingResults.map((v, idx) => (
                                  <div key={idx} className="bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-900 flex justify-between items-start gap-3 animate-fade-in">
                                    <div className="flex-1 space-y-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-bold text-zinc-200 text-xs">{v.name}</span>
                                        <span className="text-[8px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1 rounded font-bold uppercase">{v.type}</span>
                                      </div>
                                      <p className="text-[10px] text-zinc-400">{v.description}</p>
                                      <div className="text-[9px] text-zinc-500 italic font-medium leading-relaxed bg-zinc-900/40 p-1.5 rounded border border-zinc-900">
                                        <span className="text-zinc-400 font-bold uppercase text-[7px] tracking-wider block mb-0.5">Regional Logistics Support:</span> {v.presence}
                                      </div>
                                    </div>
                                    <div className="text-right shrink-0 flex flex-col items-end gap-2">
                                      <div className="bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-center shrink-0">
                                        <span className="text-[7px] text-zinc-500 block uppercase font-bold tracking-wider">Rating</span>
                                        <span className="font-extrabold text-indigo-400 text-xs">{v.sourcing_rating}</span>
                                      </div>
                                      <button
                                        onClick={() => handleLinkDiscoveredVendor(v)}
                                        className="text-[9px] font-extrabold text-white bg-indigo-600 hover:bg-indigo-750 px-2 py-1 rounded transition-all flex items-center gap-1 cursor-pointer shadow active:scale-95 hover:shadow-indigo-500/10"
                                      >
                                        ➕ Link Bidder
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <button
                                onClick={handleDiscoverVendors}
                                className="w-full text-center py-2 text-[10px] font-bold text-zinc-500 hover:text-zinc-400 transition-all cursor-pointer border border-dashed border-zinc-800 rounded-lg bg-zinc-900/20 hover:bg-zinc-900/40"
                              >
                                Re-run AI Sourcing Directory Scan
                              </button>
                            </div>
                          ) : sourcingLoading ? (
                            <div className="space-y-3 py-4">
                              <div className="flex items-center gap-2 text-zinc-400 text-[10px] justify-center animate-pulse">
                                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping"></span>
                                Generating regional procurement profile via Gemini...
                              </div>
                              <div className="space-y-2">
                                <div className="h-20 bg-zinc-950/40 rounded-lg animate-pulse border border-zinc-900"></div>
                                <div className="h-20 bg-zinc-950/40 rounded-lg animate-pulse border border-zinc-900"></div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <p className="text-[11px] text-zinc-400 leading-relaxed">
                                No active vendor bids? Instantly query your Gemini AI directory to locate reputable local MEP/construction suppliers and distributors active in the <span className="font-bold text-indigo-400">{activeRegion}</span> region.
                              </p>
                              {sourcingError && (
                                <p className="text-[10px] text-rose-400 bg-rose-500/5 p-2 rounded border border-rose-500/10 leading-normal">
                                  {sourcingError}
                                </p>
                              )}
                              <button
                                onClick={handleDiscoverVendors}
                                className="w-full bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold text-[10px] py-2 rounded-xl transition-all shadow-md flex items-center justify-center gap-1 cursor-pointer hover:shadow-indigo-500/10 active:scale-95"
                              >
                                🔍 Find Regional Suppliers (Gemini AI)
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {focusedGraphNode === "drawing" && (
                      <div className="text-left">
                        <div className="flex justify-between items-center border-b border-zinc-900 pb-2 mb-3">
                          <span className="text-[10px] font-extrabold text-sky-400 uppercase tracking-widest flex items-center gap-1">📐 CAD Blueprint drawing details</span>
                          <span className="text-[9px] text-zinc-500 font-bold">Visual Spatial Context</span>
                        </div>
                        {selectedItem.references?.drawings?.[0] ? (
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                              <h4 className="text-xs font-extrabold text-zinc-200">{selectedItem.references.drawings[0].sheetNumber}: {selectedItem.references.drawings[0].title}</h4>
                              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                                Link established directly from physical CAD design layouts to verify installation quantities and routing elevations.
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                const dwg = selectedItem.references.drawings[0];
                                if (dwg) {
                                  setActiveDrawingSheet({ sheetNumber: dwg.sheetNumber, title: dwg.title });
                                }
                              }}
                              className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-4.5 py-2.5 rounded-xl border border-sky-500/20 transition-all shadow-md shrink-0 cursor-pointer"
                            >
                              Launch Vector CAD Viewer
                            </button>
                          </div>
                        ) : (
                          <div className="text-center py-6 text-zinc-500 italic text-xs">No drawings currently linked. Enable blueprint connections in the side drawer linker tab.</div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Overview Dashboard showing project metrics */
                <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 shadow-xl text-left flex flex-col justify-between min-h-[480px] animate-in fade-in duration-200">
                  <div>
                    <div className="flex justify-between items-center border-b border-zinc-900 pb-3 mb-4">
                      <span className="text-[10px] font-extrabold text-violet-400 uppercase tracking-widest">Project-Wide Mappings Dashboard</span>
                      <span className="text-[10px] text-zinc-500 font-bold">MEP Complex Mappings</span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Select any BOQ row from the **Traceability Gap Registry** on the left to examine individual cross-document relationships. The grid displays current aggregated data verification metrics for all estimated lines:
                    </p>

                    <div className="grid grid-cols-2 gap-3.5 mt-5">
                      <div className="bg-zinc-950/60 p-4 rounded-xl border border-zinc-900/80">
                        <span className="text-[9px] font-extrabold text-sky-400 uppercase tracking-wider block">📐 Linked CAD Sheets</span>
                        <span className="text-2xl font-black text-zinc-100 block mt-1">
                          {items.filter(item => (item.references?.drawings || []).length > 0).length} / {items.length}
                        </span>
                        <p className="text-[9px] text-zinc-500 mt-1">Rows backed by physical blueprint layout plans</p>
                      </div>

                      <div className="bg-zinc-950/60 p-4 rounded-xl border border-zinc-900/80">
                        <span className="text-[9px] font-extrabold text-amber-400 uppercase tracking-wider block">📜 Mapped contract Clauses</span>
                        <span className="text-2xl font-black text-zinc-100 block mt-1">
                          {items.filter(item => (item.references?.clauses || []).length > 0).length} / {items.length}
                        </span>
                        <p className="text-[9px] text-zinc-500 mt-1">Tender sections audit coverage</p>
                      </div>

                      <div className="bg-zinc-950/60 p-4 rounded-xl border border-zinc-900/80">
                        <span className="text-[9px] font-extrabold text-emerald-400 uppercase tracking-wider block">🤝 Active Supplier Bids</span>
                        <span className="text-2xl font-black text-zinc-100 block mt-1">
                          {items.filter(item => (item.references?.vendorQuotes || []).length > 0).length} / {items.length}
                        </span>
                        <p className="text-[9px] text-zinc-500 mt-1">Rates backed by competitor quotes</p>
                      </div>

                      <div className="bg-zinc-950/60 p-4 rounded-xl border border-zinc-900/80">
                        <span className="text-[9px] font-extrabold text-rose-400 uppercase tracking-wider block">⚠ Tracked AI Risks</span>
                        <span className="text-2xl font-black text-zinc-100 block mt-1">
                          {items.filter(item => (item.references?.risks || []).length > 0).length} / {items.length}
                        </span>
                        <p className="text-[9px] text-zinc-500 mt-1">Assigned liabilities & pricing contingencies</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-violet-950/10 border border-violet-900/20 rounded-xl p-4 mt-6">
                    <span className="text-[10px] font-bold text-violet-400 uppercase block mb-1">🔍 Immediate Action Recommended: Coordination Gap Found</span>
                    <p className="text-[10.5px] text-zinc-400 leading-relaxed">
                      There are <span className="font-extrabold text-rose-400">{items.filter(item => (item.references?.drawings || []).length === 0).length} rows</span> with missing blueprint CAD drawings and <span className="font-extrabold text-amber-400">{items.filter(item => (item.references?.vendorQuotes || []).length === 0).length} rows</span> lacking competitor vendor bids. Click on a gap pill in the Gap Registry to triage them.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </main>
  );

  // Simple permissions guard helper
  function canEditRow(item: WorkspaceBoqItem) {
    if (boqLocked) return false;
    if (currentUserRole === "junior" && (item.status === "Draft" || item.status === "Revision Requested")) return true;
    if (currentUserRole === "senior" && item.status === "Pending Senior Review") return true;
    if (currentUserRole === "procurement" && item.status === "Pending Procurement") return true;
    if (currentUserRole === "admin") return true;
    return false;
  }
}
