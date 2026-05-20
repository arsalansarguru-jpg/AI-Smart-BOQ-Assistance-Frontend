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
