/**
 * Mirrors the `public.projects` table in Supabase.
 * Keep this in sync with the SQL schema.
 */
export type Project = {
  id: string;
  user_id: string;
  project_name: string;
  client_name: string;
  tender_number: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Mirrors the `public.project_files` table in Supabase.
 */
export type ProjectFile = {
  id: string;
  project_id: string;
  user_id: string;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  uploaded_at: string;
};

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/** Mirrors `public.tender_projects`. */
export type TenderProject = {
  id: string;
  tender_name: string;
  client_name: string;
  created_by: string;
  created_at: string;
};

/** Category values for `public.tender_files.category`. */
export type TenderFileCategory = "boq" | "drawings" | "make_list";

/** Mirrors `public.tender_files`. */
export type TenderFile = {
  id: string;
  tender_project_id: string;
  category: TenderFileCategory;
  file_name: string;
  file_url: string;
  file_type: string;
  uploaded_by: string;
  created_at: string;
};

/** Mirrors `public.tender_risk_summaries`. */
export type TenderRiskSummary = {
  id: string;
  tender_project_id: string;
  risk_score: number;
  executive_summary: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

/** Category values for `public.tender_risk_clauses.category`. */
export type TenderRiskCategory =
  | "payment"
  | "timeline_penalties"
  | "scope_clarity"
  | "liability_warranty"
  | "other";

/** Mirrors `public.tender_risk_clauses`. */
export type TenderRiskClause = {
  id: string;
  tender_project_id: string;
  category: TenderRiskCategory;
  clause_number: string | null;
  original_text: string;
  risk_description: string;
  severity: "high" | "medium" | "low";
  mitigation_strategy: string;
  suggested_amendment: string | null;
  pricing_buffer_percentage: number;
  status: "unreviewed" | "mitigated" | "accepted" | "disputed";
  estimator_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

