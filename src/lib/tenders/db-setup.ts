import { createClient } from "@/lib/supabase/server";

export type TenderDbStatus = {
  ok: boolean;
  projectsTable: boolean;
  filesTable: boolean;
  message?: string;
};

export async function checkTenderDatabase(): Promise<TenderDbStatus> {
  const supabase = await createClient();

  const projectsProbe = await supabase
    .from("tender_projects")
    .select("id")
    .limit(1);

  const projectsMissing =
    projectsProbe.error?.message &&
    (projectsProbe.error.message.toLowerCase().includes("tender_projects") ||
      projectsProbe.error.message.toLowerCase().includes("schema cache") ||
      projectsProbe.error.message.toLowerCase().includes("does not exist"));

  if (projectsMissing) {
    return {
      ok: false,
      projectsTable: false,
      filesTable: false,
      message: projectsProbe.error?.message,
    };
  }

  const filesProbe = await supabase.from("tender_files").select("id").limit(1);

  const filesMissing =
    filesProbe.error?.message &&
    (filesProbe.error.message.toLowerCase().includes("tender_files") ||
      filesProbe.error.message.toLowerCase().includes("schema cache") ||
      filesProbe.error.message.toLowerCase().includes("does not exist"));

  return {
    ok: !projectsMissing && !filesMissing,
    projectsTable: !projectsMissing,
    filesTable: !filesMissing,
    message: filesProbe.error?.message,
  };
}
