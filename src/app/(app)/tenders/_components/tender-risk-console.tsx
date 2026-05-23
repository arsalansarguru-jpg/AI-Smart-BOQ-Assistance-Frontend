"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TenderRiskClause, TenderRiskSummary, TenderRiskCategory } from "@/lib/types";

interface TenderRiskConsoleProps {
  projectId: string;
}

const TENDER_VALUE = 1250000; // Simulated ₹12.5L tender value for financial buffer calculation

const CATEGORY_LABELS: Record<TenderRiskCategory, string> = {
  payment: "Payment Terms",
  timeline_penalties: "Timeline & Penalties",
  scope_clarity: "Scope & Clarity",
  liability_warranty: "Liability & Warranty",
  other: "Other Risks",
};

const SEVERITY_COLORS = {
  high: "bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500/20",
  medium: "bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/20",
  low: "bg-indigo-500/10 border-indigo-500/20 text-indigo-500 hover:bg-indigo-500/20",
};

const STATUS_COLORS = {
  unreviewed: "bg-neutral-800 border-neutral-700 text-neutral-400",
  mitigated: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
  accepted: "bg-blue-500/10 border-blue-500/20 text-blue-500",
  disputed: "bg-purple-500/10 border-purple-500/20 text-purple-500",
};

// High-fidelity construction/procurement risk audit template for MEP projects
const DEFAULT_RISK_CLAUSES = (projectId: string): Omit<TenderRiskClause, "id" | "created_at" | "updated_at">[] => [
  {
    tender_project_id: projectId,
    category: "timeline_penalties",
    clause_number: "Section 14.2 (a)",
    original_text: "Delay Damages: The Contractor shall pay liquidated damages of 1.5% of the total Contract Price per calendar day of delay, without any cap or limitation of liability.",
    risk_description: "Excessive delay damages of 1.5% per day. Standard industry damages are capped at 5-10% of total contract value. Uncapped damages present a critical contractor bankruptcy risk.",
    severity: "high",
    mitigation_strategy: "Negotiate a hard cap on Liquidated Damages of 10% of the Contract Price. Ensure exclusions for Force Majeure events and delays caused by other trades or the Client.",
    suggested_amendment: "Liquidated damages for delay shall be capped at a maximum of ten percent (10%) of the final Contract Price. The Contractor shall not be liable for delays caused by Client, Force Majeure, or independent third-party contractors.",
    pricing_buffer_percentage: 4.5,
    status: "unreviewed",
    estimator_notes: null,
    reviewed_by: null,
    reviewed_at: null,
  },
  {
    tender_project_id: projectId,
    category: "payment",
    clause_number: "Section 8.4 (b)",
    original_text: "Payment shall be released 90 days after formal commissioning and signed acceptance by the Lead Consultant, subject to a 10% retention held for 24 months.",
    risk_description: "90-day post-commissioning credit terms trigger major negative cash-flow exposure for MEP equipment procurements. 24-month retention duration is excessive (industry standard is 12 months).",
    severity: "high",
    mitigation_strategy: "Request pay-upon-progress monthly billing, with credit terms reduced to 30 days. Negotiate retention duration down to 12 months after practical completion.",
    suggested_amendment: "Invoices shall be paid within thirty (30) days from invoice receipt. Retainage shall be limited to five percent (5%) and released in full upon Practical Completion of the MEP scope.",
    pricing_buffer_percentage: 3.0,
    status: "unreviewed",
    estimator_notes: null,
    reviewed_by: null,
    reviewed_at: null,
  },
  {
    tender_project_id: projectId,
    category: "liability_warranty",
    clause_number: "Section 22.1",
    original_text: "The Contractor shall indemnify, defend, and hold harmless the Owner from any and all claims, losses, lost profits, or business interruption damages arising from performance of the works.",
    risk_description: "Indemnification covers lost profits and business interruption (consequential damages) without limits. Can lead to claims exceeding the entire contract value.",
    severity: "high",
    mitigation_strategy: "Exclude all indirect, special, and consequential damages. Limit overall liability (indemnification cap) to 100% of the contract value.",
    suggested_amendment: "Notwithstanding any provision to the contrary, neither party shall be liable for indirect, special, or consequential damages including loss of profits. Contractor’s maximum aggregate liability shall be capped at 100% of the Contract Price.",
    pricing_buffer_percentage: 2.5,
    status: "unreviewed",
    estimator_notes: null,
    reviewed_by: null,
    reviewed_at: null,
  },
  {
    tender_project_id: projectId,
    category: "scope_clarity",
    clause_number: "Section 3.1 (d)",
    original_text: "The Contractor shall verify all architectural drawings and be solely responsible for any design discrepancies, errors, or routing omissions in the MEP layouts, regardless of prior approval.",
    risk_description: "Vague routing responsibility shifts design-builder risk onto the installing contractor. Demanding full design validation without an extra design fee.",
    severity: "medium",
    mitigation_strategy: "Clarify that routing is subject to site conditions. Exclude responsibility for fundamental architectural design faults or structural clash errors.",
    suggested_amendment: "The Contractor will coordinate routing based on issued IFC drawings. The Contractor shall not be held liable for design errors or structural coordination gaps in the original engineering blueprints.",
    pricing_buffer_percentage: 1.5,
    status: "unreviewed",
    estimator_notes: null,
    reviewed_by: null,
    reviewed_at: null,
  },
  {
    tender_project_id: projectId,
    category: "liability_warranty",
    clause_number: "Section 17.3",
    original_text: "The Contractor warrants all chillers, VRF units, and ductwork for a period of 60 months from overall building occupancy, including free replacement of consumables, filters, and refrigerant.",
    risk_description: "5-year comprehensive parts and labor warranty is far beyond standard manufacturer warranty (usually 12-24 months). Free consumables/refrigerant is highly expensive.",
    severity: "high",
    mitigation_strategy: "Limit defect liability to 12 months for general works and pass-through manufacturer's warranty for heavy equipment (chillers). Exclude filters/refrigerant consumables.",
    suggested_amendment: "The Defect Liability Period shall be twelve (12) months from Practical Completion. Heavy equipment warranties (VRF compressors, chillers) shall match the manufacturer’s standard terms.",
    pricing_buffer_percentage: 5.0,
    status: "unreviewed",
    estimator_notes: null,
    reviewed_by: null,
    reviewed_at: null,
  },
  {
    tender_project_id: projectId,
    category: "timeline_penalties",
    clause_number: "Section 5.2",
    original_text: "The MEP works must be completed within 14 weeks from Site Handover, including all testing, balancing, and civil authority approvals, working in double-shifts at no additional cost.",
    risk_description: "14 weeks is highly unrealistic for a complex HVAC and electrical commissioning schedule. Double shifts are mandatory without compensation, spiking labor costs.",
    severity: "medium",
    mitigation_strategy: "Request extension to 22 weeks based on chiller lead times, or ensure that double-shift premiums are priced into the base bid.",
    suggested_amendment: "The schedule shall be extended to twenty-two (22) weeks. Any acceleration or double-shifts requested by the Owner shall be compensated via a Change Order.",
    pricing_buffer_percentage: 3.5,
    status: "unreviewed",
    estimator_notes: null,
    reviewed_by: null,
    reviewed_at: null,
  },
  {
    tender_project_id: projectId,
    category: "scope_clarity",
    clause_number: "Section 11.7.3",
    original_text: "Chillers shall operate quietly and comply with local municipal noise ordinances and all acoustic comfort expectations of the building's premium office tenants.",
    risk_description: "Vague 'quiet operation' and 'acoustic comfort expectations' rather than dBA decibel numbers. Creates subjective criteria for commissioning sign-off.",
    severity: "medium",
    mitigation_strategy: "Define specific acoustic criteria in decibels (e.g., max 68 dBA at 1 meter). Avoid open-ended phrases like 'acoustic comfort'.",
    suggested_amendment: "Chillers shall conform to the sound pressure levels specified in the technical data sheet (not to exceed 68 dBA at 1 meter distance under free field conditions).",
    pricing_buffer_percentage: 1.0,
    status: "unreviewed",
    estimator_notes: null,
    reviewed_by: null,
    reviewed_at: null,
  },
  {
    tender_project_id: projectId,
    category: "timeline_penalties",
    clause_number: "Section 9.1",
    original_text: "Force Majeure shall only excuse delays if the Contractor can prove that the event was completely unforeseeable. Supply chain disruptions, customs delays, and local labor shortages shall not be excused.",
    risk_description: "Highly restrictive Force Majeure definition. Construction import supply chains are inherently vulnerable to global disruptions; excluding them is extreme.",
    severity: "medium",
    mitigation_strategy: "Include global supply chain crises, import embargoes, and pandemic shortages under Force Majeure protections.",
    suggested_amendment: "Force Majeure events shall include acts of God, war, pandemic-induced lockdowns, general strikes, and unavoidable material import delays at customs.",
    pricing_buffer_percentage: 1.5,
    status: "unreviewed",
    estimator_notes: null,
    reviewed_by: null,
    reviewed_at: null,
  },
];

export default function TenderRiskConsole({ projectId }: TenderRiskConsoleProps) {
  const [clauses, setClauses] = useState<TenderRiskClause[]>([]);
  const [summary, setSummary] = useState<TenderRiskSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [dbActive, setDbActive] = useState(false);

  // Filters & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");

  // Detail Drawer state
  const [selectedClause, setSelectedClause] = useState<TenderRiskClause | null>(null);
  const [notesInput, setNotesInput] = useState("");
  const [bufferInput, setBufferInput] = useState(0);
  const [copiedText, setCopiedText] = useState(false);

  // Initialize and Seed Data
  useEffect(() => {
    async function loadRiskData() {
      try {
        setLoading(true);
        const supabase = createClient();

        // Probe database connectivity
        const { data: clausesData, error: clausesError } = await supabase
          .from("tender_risk_clauses")
          .select("*")
          .eq("tender_project_id", projectId);

        if (clausesError) {
          throw new Error(clausesError.message);
        }

        const { data: summaryData } = await supabase
          .from("tender_risk_summaries")
          .select("*")
          .eq("tender_project_id", projectId)
          .single();

        setClauses(clausesData as TenderRiskClause[]);
        setSummary(summaryData as TenderRiskSummary);
        setDbActive(true);
      } catch (err: any) {
        console.warn("Falling back to local storage adapter:", err.message);
        setDbActive(false);

        // Fallback Local Storage logic
        const cacheClausesKey = `tender_risk_clauses_${projectId}`;
        const cacheSummaryKey = `tender_risk_summary_${projectId}`;

        const cachedClauses = localStorage.getItem(cacheClausesKey);
        const cachedSummary = localStorage.getItem(cacheSummaryKey);

        if (cachedClauses && cachedSummary) {
          setClauses(JSON.parse(cachedClauses));
          setSummary(JSON.parse(cachedSummary));
        } else {
          // Seed new high-fidelity templates
          const freshClauses = DEFAULT_RISK_CLAUSES(projectId).map((c, i) => ({
            ...c,
            id: `risk-item-${i}-${crypto.randomUUID()}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })) as TenderRiskClause[];

          const freshSummary: TenderRiskSummary = {
            id: `summary-${crypto.randomUUID()}`,
            tender_project_id: projectId,
            risk_score: 82,
            executive_summary: "This tender project represents a high-risk liability profile. The primary areas of exposure center on uncapped delay damages, restrictive Force Majeure conditions, and an extended 60-month warranty clause on heavy MEP equipment. Action is required on 5 High and 3 Medium severity contract clauses.",
            created_by: "system-fallback",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          localStorage.setItem(cacheClausesKey, JSON.stringify(freshClauses));
          localStorage.setItem(cacheSummaryKey, JSON.stringify(freshSummary));

          setClauses(freshClauses);
          setSummary(freshSummary);
        }
      } finally {
        setLoading(false);
      }
    }

    loadRiskData();
  }, [projectId]);

  // Compute overall risk scores and summaries dynamically!
  const computedRiskMetric = useMemo(() => {
    if (clauses.length === 0) return { score: 0, severity: "low", activeCount: 0, highCount: 0 };

    const maxWeight = clauses.reduce((acc, c) => acc + (c.severity === "high" ? 15 : c.severity === "medium" ? 8 : 3), 0);
    const activeWeight = clauses.reduce((acc, c) => {
      let weightMultiplier = 1.0;
      if (c.status === "mitigated") weightMultiplier = 0.25; // 75% reduction
      if (c.status === "accepted") weightMultiplier = 0.85; // slightly reduced simply from being acknowledged
      if (c.status === "disputed") weightMultiplier = 0.50; // ongoing pushback
      
      const clauseWeight = c.severity === "high" ? 15 : c.severity === "medium" ? 8 : 3;
      return acc + (clauseWeight * weightMultiplier);
    }, 0);

    const calculatedScore = maxWeight > 0 ? Math.round((activeWeight / maxWeight) * 100) : 0;
    
    let label = "Low Risk";
    if (calculatedScore >= 70) label = "High Exposure";
    else if (calculatedScore >= 40) label = "Moderate Exposure";

    return {
      score: calculatedScore,
      severity: label,
      activeCount: clauses.filter(c => c.status === "unreviewed").length,
      highCount: clauses.filter(c => c.severity === "high" && c.status !== "mitigated").length,
    };
  }, [clauses]);

  // Compute contingency buffers
  const financialBuffer = useMemo(() => {
    const totalPercentage = clauses.reduce((acc, c) => acc + Number(c.pricing_buffer_percentage || 0), 0);
    const totalCash = (totalPercentage / 100) * TENDER_VALUE;
    return {
      percentage: totalPercentage.toFixed(1),
      cash: totalCash,
    };
  }, [clauses]);

  // Handle drawer action selects
  const openDetails = (clause: TenderRiskClause) => {
    setSelectedClause(clause);
    setNotesInput(clause.estimator_notes || "");
    setBufferInput(clause.pricing_buffer_percentage || 0);
    setCopiedText(false);
  };

  // Close details
  const closeDetails = () => {
    setSelectedClause(null);
  };

  // Copy Amendment to Clipboard
  const handleCopyAmendment = () => {
    if (!selectedClause?.suggested_amendment) return;
    navigator.clipboard.writeText(selectedClause.suggested_amendment);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Save changes to current selected clause
  const saveClauseDetails = async (updates: Partial<TenderRiskClause>) => {
    if (!selectedClause) return;

    const updatedClauses = clauses.map((c) => {
      if (c.id === selectedClause.id) {
        const merged = { ...c, ...updates, updated_at: new Date().toISOString() };
        setSelectedClause(merged);
        return merged;
      }
      return c;
    });

    setClauses(updatedClauses);

    // Save to Database / LocalStorage
    if (dbActive) {
      const supabase = createClient();
      await supabase
        .from("tender_risk_clauses")
        .update(updates)
        .eq("id", selectedClause.id);
    } else {
      localStorage.setItem(`tender_risk_clauses_${projectId}`, JSON.stringify(updatedClauses));
    }
  };

  // Filter clauses
  const filteredClauses = useMemo(() => {
    return clauses.filter((c) => {
      const matchesSearch =
        c.clause_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.risk_description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.original_text.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === "all" || c.category === selectedCategory;
      const matchesSeverity = selectedSeverity === "all" || c.severity === selectedSeverity;

      return matchesSearch && matchesCategory && matchesSeverity;
    });
  }, [clauses, searchQuery, selectedCategory, selectedSeverity]);

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center text-zinc-400">
        <svg className="h-8 w-8 animate-spin text-violet-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span>Analyzing tender documents for contractual risks...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Dashboard Risk Index Summary Header */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Risk Radial Gauge Chart */}
        <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col items-center text-center shadow-xl">
          <div className="absolute top-0 right-0 bg-violet-500/10 px-2 py-0.5 rounded-bl text-[10px] font-mono text-violet-400 border-l border-b border-zinc-800">
            {dbActive ? "Cloud Verified" : "Active Sandbox"}
          </div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-4">
            Tender Risk Index
          </h3>
          <div className="relative flex items-center justify-center h-32 w-32">
            <svg className="w-full h-full transform -rotate-90">
              {/* Underlay ring */}
              <circle
                cx="64"
                cy="64"
                r="52"
                strokeWidth="8"
                stroke="currentColor"
                className="text-zinc-800"
                fill="transparent"
              />
              {/* Highlight dynamic ring */}
              <circle
                cx="64"
                cy="64"
                r="52"
                strokeWidth="8"
                strokeDasharray={2 * Math.PI * 52}
                strokeDashoffset={2 * Math.PI * 52 * (1 - computedRiskMetric.score / 100)}
                strokeLinecap="round"
                stroke={
                  computedRiskMetric.score >= 70
                    ? "#f43f5e" // Rose-500
                    : computedRiskMetric.score >= 40
                    ? "#f59e0b" // Amber-500
                    : "#10b981" // Emerald-500
                }
                fill="transparent"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-extrabold text-white leading-none">
                {computedRiskMetric.score}%
              </span>
              <span
                className="text-[10px] font-medium tracking-wide mt-1 uppercase"
                style={{
                  color:
                    computedRiskMetric.score >= 70
                      ? "#f43f5e"
                      : computedRiskMetric.score >= 40
                      ? "#f59e0b"
                      : "#10b981",
                }}
              >
                {computedRiskMetric.severity}
              </span>
            </div>
          </div>
          <p className="mt-4 text-[11px] text-zinc-400">
            {computedRiskMetric.activeCount > 0
              ? `${computedRiskMetric.activeCount} risk factors pending mitigation review`
              : "All identified contract risks successfully mitigated!"}
          </p>
        </div>

        {/* AI Procurement Summary Text Card */}
        <div className="col-span-2 rounded-xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                AI Executive Risk Audit
              </h3>
            </div>
            <p className="text-sm leading-relaxed text-zinc-300">
              {summary?.executive_summary}
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-900 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Tender Estimate</div>
              <div className="text-sm font-bold text-white font-mono mt-0.5">
                ₹{TENDER_VALUE.toLocaleString("en-IN")}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Contingency Buffer</div>
              <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                +{financialBuffer.percentage}%
              </div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Buffer Cost</div>
              <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                +₹{financialBuffer.cash.toLocaleString("en-IN")}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Critical Threats</div>
              <div className="text-sm font-bold text-rose-500 font-mono mt-0.5">
                {computedRiskMetric.highCount} Active
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Clause Registry & Filtration Controls */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/40 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search clauses or citations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-9 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              <option value="all">All Categories</option>
              <option value="payment">Payment Terms</option>
              <option value="timeline_penalties">Timeline & Penalties</option>
              <option value="scope_clarity">Scope & Clarity</option>
              <option value="liability_warranty">Liability & Warranty</option>
              <option value="other">Other</option>
            </select>

            {/* Severity Filter */}
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              <option value="all">All Severities</option>
              <option value="high">🔴 High Severity</option>
              <option value="medium">🟡 Medium Severity</option>
              <option value="low">🟣 Low Severity</option>
            </select>
          </div>
        </div>

        {/* Clause Registry List Grid */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-900">
            <thead className="bg-zinc-900/20">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Section Reference
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Category
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Identified Risk / exposure
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Threat Level
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Workflow Status
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Cost Buffer
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/50 bg-zinc-950">
              {filteredClauses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500 text-sm">
                    No risk clauses matched the selected filters.
                  </td>
                </tr>
              ) : (
                filteredClauses.map((clause) => (
                  <tr
                    key={clause.id}
                    onClick={() => openDetails(clause)}
                    className="hover:bg-zinc-900/30 transition cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-zinc-300 font-mono">
                      {clause.clause_number || "Unreferenced"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-zinc-400">
                      {CATEGORY_LABELS[clause.category] || clause.category}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-300 max-w-sm">
                      <div className="line-clamp-2 leading-relaxed">
                        {clause.risk_description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${SEVERITY_COLORS[clause.severity]}`}>
                        {clause.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_COLORS[clause.status]}`}>
                        {clause.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-xs font-mono font-bold text-emerald-400">
                      +{clause.pricing_buffer_percentage}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetails(clause);
                        }}
                        className="text-violet-400 hover:text-violet-300 transition"
                      >
                        Audit Details →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Sliding Detail Drawer Side Pane */}
      {selectedClause && (
        <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
          <div className="absolute inset-0 overflow-hidden">
            {/* Backdrop overlay */}
            <div
              onClick={closeDetails}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            />

            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <div className="pointer-events-auto w-screen max-w-xl">
                <div className="flex h-full flex-col bg-zinc-950 border-l border-zinc-800 shadow-2xl p-6 overflow-y-auto">
                  
                  {/* Header */}
                  <div className="flex items-start justify-between border-b border-zinc-900 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono bg-zinc-900 text-zinc-400 px-2 py-0.5 border border-zinc-850 rounded">
                          {selectedClause.clause_number}
                        </span>
                        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${SEVERITY_COLORS[selectedClause.severity]}`}>
                          {selectedClause.severity} Risk
                        </span>
                      </div>
                      <h2 className="text-base font-semibold text-white mt-1.5">
                        {CATEGORY_LABELS[selectedClause.category]} Review
                      </h2>
                    </div>
                    <button
                      onClick={closeDetails}
                      className="rounded-md text-zinc-500 hover:text-zinc-300 focus:outline-none transition p-1 hover:bg-zinc-900"
                    >
                      <span className="sr-only">Close panel</span>
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Body Content */}
                  <div className="mt-6 flex-1 space-y-6 text-sm text-zinc-300">
                    
                    {/* Verbatim Tender Section Cite */}
                    <div>
                      <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                        Original Tender Citation
                      </h4>
                      <div className="rounded-lg border border-zinc-900 bg-zinc-900/30 p-4 font-serif text-xs italic leading-relaxed text-zinc-400 select-all border-l-2 border-l-zinc-700">
                        "{selectedClause.original_text}"
                      </div>
                    </div>

                    {/* AI Exposure Analysis */}
                    <div>
                      <h4 className="text-[11px] font-bold text-rose-400 uppercase tracking-wider mb-2">
                        AI Exposure Assessment
                      </h4>
                      <p className="bg-rose-950/10 border border-rose-900/20 rounded-lg p-3 text-xs leading-relaxed text-rose-300">
                        {selectedClause.risk_description}
                      </p>
                    </div>

                    {/* AI Mitigation Strategy */}
                    <div>
                      <h4 className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-2">
                        Negotiation & Mitigation Strategy
                      </h4>
                      <p className="bg-emerald-950/10 border border-emerald-900/20 rounded-lg p-3 text-xs leading-relaxed text-emerald-300">
                        {selectedClause.mitigation_strategy}
                      </p>
                    </div>

                    {/* Legal Suggested Amendment Counter-Proposal */}
                    {selectedClause.suggested_amendment && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-[11px] font-bold text-violet-400 uppercase tracking-wider">
                            Suggested Amendment Text
                          </h4>
                          <button
                            onClick={handleCopyAmendment}
                            className="inline-flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                            {copiedText ? "Copied!" : "Copy Markup"}
                          </button>
                        </div>
                        <div className="rounded-lg border border-zinc-900 bg-zinc-950 p-4 font-mono text-[11px] leading-relaxed text-zinc-400 border-l-2 border-l-violet-800">
                          {selectedClause.suggested_amendment}
                        </div>
                      </div>
                    )}

                    {/* Cost Pricing Contingency Buffer Slider */}
                    <div className="bg-zinc-900/20 border border-zinc-900 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-semibold text-white">
                          Pricing Risk Premium Premium
                        </h4>
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          +{bufferInput}% (+₹{((bufferInput / 100) * TENDER_VALUE).toLocaleString("en-IN")})
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 mb-3 leading-relaxed">
                        Add a cost premium backup contingency buffer to the BOQ to cover this contract liability.
                      </p>
                      <input
                        type="range"
                        min="0"
                        max="15"
                        step="0.5"
                        value={bufferInput}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setBufferInput(val);
                          saveClauseDetails({ pricing_buffer_percentage: val });
                        }}
                        className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
                      />
                      <div className="flex justify-between text-[10px] text-zinc-600 font-mono mt-1">
                        <span>0.0% (No buffer)</span>
                        <span>7.5%</span>
                        <span>15.0% Max</span>
                      </div>
                    </div>

                    {/* Estimator Action Workflows */}
                    <div>
                      <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                        Estimator Status Sign-off
                      </h4>
                      <div className="grid grid-cols-3 gap-2">
                        {(["mitigated", "accepted", "disputed"] as const).map((st) => (
                          <button
                            key={st}
                            onClick={() => saveClauseDetails({ status: st })}
                            className={`py-2 px-3 text-xs font-semibold border rounded-lg uppercase tracking-wider transition ${
                              selectedClause.status === st
                                ? st === "mitigated"
                                  ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                                  : st === "accepted"
                                  ? "bg-blue-500/10 border-blue-550 text-blue-450"
                                  : "bg-purple-500/10 border-purple-500 text-purple-400"
                                : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Estimator Custom Notes Box */}
                    <div>
                      <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                        Estimator Review Notes
                      </h4>
                      <textarea
                        rows={3}
                        value={notesInput}
                        onChange={(e) => {
                          setNotesInput(e.target.value);
                          saveClauseDetails({ estimator_notes: e.target.value });
                        }}
                        placeholder="Type commercial notes or negotiation targets..."
                        className="block w-full px-3 py-2 bg-zinc-900 border border-zinc-850 rounded-md text-xs text-white placeholder-zinc-650 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
                      />
                    </div>
                  </div>

                  {/* Save Sign-off Trigger */}
                  <div className="mt-8 pt-4 border-t border-zinc-900">
                    <button
                      onClick={closeDetails}
                      className="w-full py-2 px-4 bg-zinc-900 hover:bg-zinc-850 text-white font-medium rounded-lg text-xs transition border border-zinc-800 text-center"
                    >
                      Close & Keep Audited Benchmarks
                    </button>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
