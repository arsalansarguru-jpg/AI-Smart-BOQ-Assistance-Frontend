import { createClient } from "@/lib/supabase/server";
import { isProjectFilesTableMissing } from "@/lib/files";
import { getSupabaseProjectRef } from "@/lib/supabase/config";

export type ProjectFilesTableStatus = {
  ok: boolean;
  projectRef: string | null;
  error?: string;
};

/** Probes whether public.project_files exists on the connected Supabase project. */
export async function checkProjectFilesTable(): Promise<ProjectFilesTableStatus> {
  const projectRef = getSupabaseProjectRef();
  const supabase = await createClient();

  const { error } = await supabase.from("project_files").select("id").limit(1);

  if (error) {
    return {
      ok: false,
      projectRef,
      error: error.message,
    };
  }

  return { ok: true, projectRef };
}

export function isTableMissingStatus(status: ProjectFilesTableStatus): boolean {
  return Boolean(status.error && isProjectFilesTableMissing(status.error));
}
