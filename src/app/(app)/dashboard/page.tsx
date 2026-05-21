import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { checkTenderDatabase } from "@/lib/tenders/db-setup";
import type { TenderProject } from "@/lib/types";
import TenderCard from "../tenders/_components/tender-card";
import SetupTenderHint from "../tenders/_components/setup-tender-hint";

export const metadata = {
  title: "Dashboard - AI Smart BOQ Automation",
};

export default async function DashboardPage() {
  const dbStatus = await checkTenderDatabase();
  const setupRequired = !dbStatus.ok;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let tenderCount = 0;
  let boqCount = 0;
  let drawingsCount = 0;
  let makeListCount = 0;
  let recentTenders: TenderProject[] = [];
  const fileCounts: Record<string, number> = {};

  if (!setupRequired) {
    // 1. Fetch statistics
    const { count: tc } = await supabase
      .from("tender_projects")
      .select("*", { count: "exact", head: true });
    tenderCount = tc ?? 0;

    const { data: files } = await supabase
      .from("tender_files")
      .select("category, tender_project_id");

    if (files) {
      boqCount = files.filter((f) => f.category === "boq").length;
      drawingsCount = files.filter((f) => f.category === "drawings").length;
      makeListCount = files.filter((f) => f.category === "make_list").length;

      for (const row of files) {
        fileCounts[row.tender_project_id] =
          (fileCounts[row.tender_project_id] ?? 0) + 1;
      }
    }

    // 2. Fetch recent tender projects
    const { data: recentTendersData } = await supabase
      .from("tender_projects")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(3);
    
    recentTenders = (recentTendersData ?? []) as TenderProject[];
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8 sm:px-10">
      <div className="mb-8 flex flex-col justify-between gap-4 border-b border-gray-100 pb-5 dark:border-neutral-800 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Enterprise Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
            Construction & MEP Tender Document Automation Hub
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5 dark:bg-neutral-800">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-medium text-gray-600 dark:text-neutral-300">
            {user?.email}
          </span>
        </div>
      </div>

      {setupRequired ? (
        <div className="mb-10">
          <SetupTenderHint />
        </div>
      ) : null}

      {/* Stats Grid */}
      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Tender Projects"
          value={tenderCount}
          href="/tenders"
          icon={
            <svg
              className="h-6 w-6 text-blue-600 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          }
          accentColor="blue"
        />
        <StatCard
          label="BOQ Files"
          value={boqCount}
          icon={
            <svg
              className="h-6 w-6 text-emerald-600 dark:text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          }
          accentColor="emerald"
        />
        <StatCard
          label="Drawings (PDF/DWG)"
          value={drawingsCount}
          icon={
            <svg
              className="h-6 w-6 text-violet-600 dark:text-violet-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          }
          accentColor="violet"
        />
        <StatCard
          label="Make Lists"
          value={makeListCount}
          icon={
            <svg
              className="h-6 w-6 text-amber-600 dark:text-amber-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          }
          accentColor="amber"
        />
      </div>

      {/* Recents Section */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
          Recent Tender Projects
        </h2>
        <Link
          href="/tenders"
          className="text-sm font-semibold text-gray-600 transition hover:text-gray-900 dark:text-neutral-400 dark:hover:text-white"
        >
          View all &rarr;
        </Link>
      </div>

      {recentTenders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center dark:border-neutral-800 dark:bg-neutral-900">
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
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <p className="mt-4 text-sm font-medium text-gray-900 dark:text-white">
            No tender projects created yet
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-neutral-400">
            Create a tender project to upload BOQs, drawings, and make lists.
          </p>
          <Link
            href="/tenders/new"
            className="mt-4 inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-neutral-200"
          >
            Create tender project
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recentTenders.map((project) => (
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

function StatCard({
  label,
  value,
  href,
  icon,
  accentColor,
}: {
  label: string;
  value: number;
  href?: string;
  icon: React.ReactNode;
  accentColor: "blue" | "emerald" | "violet" | "amber";
}) {
  const bgColors = {
    blue: "bg-blue-50 dark:bg-blue-950/20",
    emerald: "bg-emerald-50 dark:bg-emerald-950/20",
    violet: "bg-violet-50 dark:bg-violet-950/20",
    amber: "bg-amber-50 dark:bg-amber-950/20",
  };

  const inner = (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-500">
          {label}
        </div>
        <div className="mt-2 text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white transition group-hover:scale-105 origin-left duration-200">
          {value}
        </div>
      </div>
      <div className={`rounded-xl p-3 ${bgColors[accentColor]} transition duration-200 group-hover:rotate-6`}>
        {icon}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="group block rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-gray-200 hover:shadow-md dark:border-neutral-800/80 dark:bg-neutral-900 dark:hover:border-neutral-700"
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-neutral-800/80 dark:bg-neutral-900">
      {inner}
    </div>
  );
}
