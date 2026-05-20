import Link from "next/link";
import PageBreadcrumb from "@/app/(app)/_components/page-breadcrumb";
import { createClient } from "@/lib/supabase/server";
import { checkTenderDatabase } from "@/lib/tenders/db-setup";
import type { TenderProject } from "@/lib/types";
import TenderCard from "./_components/tender-card";
import TenderEmptyState from "./_components/empty-state";
import SetupTenderHint from "./_components/setup-tender-hint";

export const metadata = {
  title: "Tender Documents - BOQ Automation",
};

export default async function TendersPage() {
  const dbStatus = await checkTenderDatabase();
  const setupRequired = !dbStatus.ok;

  const supabase = await createClient();
  const { data, error } = setupRequired
    ? { data: null, error: null }
    : await supabase
        .from("tender_projects")
        .select("*")
        .order("created_at", { ascending: false });

  const projects = (data ?? []) as TenderProject[];

  const fileCounts: Record<string, number> = {};
  if (!setupRequired && projects.length > 0) {
    const ids = projects.map((p) => p.id);
    const { data: fileRows } = await supabase
      .from("tender_files")
      .select("tender_project_id")
      .in("tender_project_id", ids);

    for (const row of fileRows ?? []) {
      fileCounts[row.tender_project_id] =
        (fileCounts[row.tender_project_id] ?? 0) + 1;
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8 sm:px-10">
      <PageBreadcrumb segments={[{ label: "Tender Documents" }]} />

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
            Tender Documents
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-neutral-400">
            Organize BOQ files, drawings, and make lists per tender for
            AI-powered bill of quantities automation.
          </p>
        </div>
        {!setupRequired && projects.length > 0 ? (
          <Link
            href="/tenders/new"
            className="inline-flex shrink-0 items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-neutral-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            New tender
          </Link>
        ) : null}
      </div>

      {setupRequired ? <SetupTenderHint /> : null}

      {error ? (
        <div
          role="alert"
          className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
        >
          Failed to load tenders: {error.message}
        </div>
      ) : setupRequired ? null : projects.length === 0 ? (
        <TenderEmptyState />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <TenderCard
              key={project.id}
              project={project}
              fileCount={fileCounts[project.id] ?? 0}
            />
          ))}
        </div>
      )}
    </main>
  );
}
