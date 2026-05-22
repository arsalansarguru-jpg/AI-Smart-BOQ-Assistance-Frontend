import Link from "next/link";
import { notFound } from "next/navigation";
import PageBreadcrumb from "@/app/(app)/_components/page-breadcrumb";
import { formatDateTime } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { checkTenderDatabase } from "@/lib/tenders/db-setup";
import type { TenderFile, TenderProject } from "@/lib/types";
import SetupTenderHint from "../_components/setup-tender-hint";
import DeleteTenderButton from "./delete-tender-button";
import TenderDocumentsManager from "./_components/tender-documents-manager";
import TenderFilesSummary from "./_components/tender-files-summary";
import TenderRiskConsole from "../_components/tender-risk-console";

export const metadata = {
  title: "Tender Project - BOQ Automation",
};

export default async function TenderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const tab = resolvedSearchParams?.tab || "documents";

  const dbStatus = await checkTenderDatabase();
  const setupRequired = !dbStatus.ok;

  const supabase = await createClient();

  const { data, error } = setupRequired
    ? { data: null, error: { message: "setup" } }
    : await supabase.from("tender_projects").select("*").eq("id", id).single();

  if (!setupRequired && (error || !data)) {
    notFound();
  }

  const project = data as TenderProject | null;

  let files: TenderFile[] = [];
  if (!setupRequired && project) {
    const { data: fileRows } = await supabase
      .from("tender_files")
      .select("*")
      .eq("tender_project_id", id)
      .order("created_at", { ascending: false });
    files = (fileRows ?? []) as TenderFile[];
  }

  if (!project) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-8 sm:px-10">
        <SetupTenderHint />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-8 sm:px-10">
      <PageBreadcrumb
        segments={[
          { label: "Tender Documents", href: "/tenders" },
          { label: project.tender_name },
        ]}
      />

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
              {project.tender_name}
            </h1>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              Active tender
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
            Client: {project.client_name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/tenders"
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            All tenders
          </Link>
          <DeleteTenderButton
            tenderId={project.id}
            tenderName={project.tender_name}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mb-8">
        <DetailRow label="Tender name" value={project.tender_name} />
        <DetailRow label="Client" value={project.client_name} />
        <DetailRow label="Created" value={formatDateTime(project.created_at)} />
        <DetailRow
          label="Total documents"
          value={String(files.length)}
        />
      </div>

      {/* Tabs navigation list */}
      <div className="border-b border-gray-200 dark:border-neutral-800 mb-6">
        <div className="flex gap-6">
          <Link
            href={`/tenders/${id}?tab=documents`}
            className={`pb-3 text-sm font-semibold border-b-2 px-1 transition ${
              tab === "documents"
                ? "border-violet-500 text-violet-650 dark:text-violet-400"
                : "border-transparent text-gray-500 hover:text-gray-900 dark:text-neutral-400 dark:hover:text-white"
            }`}
          >
            Document Repository
          </Link>
          <Link
            href={`/tenders/${id}?tab=risk`}
            className={`pb-3 text-sm font-semibold border-b-2 px-1 transition flex items-center gap-2 ${
              tab === "risk"
                ? "border-violet-500 text-violet-650 dark:text-violet-400"
                : "border-transparent text-gray-500 hover:text-gray-900 dark:text-neutral-400 dark:hover:text-white"
            }`}
          >
            <span>AI Risk Analysis Console</span>
            <span className="rounded-full bg-violet-100 dark:bg-violet-950 px-1.5 py-0.5 text-[10px] font-bold text-violet-600 dark:text-violet-400">
              AI
            </span>
          </Link>
        </div>
      </div>

      <section className="space-y-8">
        {tab === "documents" ? (
          <>
            <TenderFilesSummary files={files} />

            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Upload & manage documents
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
                Upload files into the correct category. Drag and drop multiple
                files, track progress, preview, and delete as needed.
              </p>
            </div>

            {setupRequired ? (
              <SetupTenderHint />
            ) : (
              <TenderDocumentsManager
                tenderProjectId={project.id}
                projectName={project.tender_name}
                files={files}
                setupRequired={false}
              />
            )}
          </>
        ) : (
          <TenderRiskConsole projectId={project.id} />
        )}
      </section>
    </main>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-neutral-500">
        {label}
      </div>
      <div className="mt-1 break-words text-sm text-gray-900 dark:text-white">
        {value}
      </div>
    </div>
  );
}

