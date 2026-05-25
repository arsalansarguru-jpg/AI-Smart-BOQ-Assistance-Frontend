import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { checkTenderDatabase } from "@/lib/tenders/db-setup";
import type { TenderProject } from "@/lib/types";
import TenderCard from "../tenders/_components/tender-card";
import SetupTenderHint from "../tenders/_components/setup-tender-hint";

export const metadata = {
  title: "Executive Dashboard - Vertex Estimator AI",
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

    const { data: recentTendersData } = await supabase
      .from("tender_projects")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(3);
    
    recentTenders = (recentTendersData ?? []) as TenderProject[];
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8 sm:px-10 text-zinc-100 min-h-screen relative select-none">
      {/* Immersive mesh glow elements */}
      <div className="absolute top-[-5%] left-[10%] w-[500px] h-[500px] bg-violet-600/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[20%] right-[5%] w-[450px] h-[450px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

      {/* HEADER SECTION */}
      <div className="mb-10 flex flex-col justify-between gap-4 border-b border-zinc-900 pb-6 sm:flex-row sm:items-center">
        <div>
          <span className="text-[10px] font-black tracking-widest text-violet-400 uppercase bg-violet-500/10 px-3 py-1 rounded-full border border-violet-500/20">
            Workspace Console
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-50 mt-2">
            Estimator Command Center
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            MEP & Construction Document Structuring Hub
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80 px-3.5 py-1.5 backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-bold text-zinc-300">
            {user?.email}
          </span>
        </div>
      </div>

      {setupRequired && (
        <div className="mb-10">
          <SetupTenderHint />
        </div>
      )}

      {/* Primary Statistics Grid */}
      <div className="mb-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Tender Projects"
          value={tenderCount}
          href="/tenders"
          icon={
            <svg className="h-5 w-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
          accentColor="violet"
        />
        <StatCard
          label="BOQ Sheets"
          value={boqCount}
          icon={
            <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          accentColor="emerald"
        />
        <StatCard
          label="Drawings (CAD/PDF)"
          value={drawingsCount}
          icon={
            <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
          accentColor="blue"
        />
        <StatCard
          label="Approved Brands"
          value={makeListCount}
          icon={
            <svg className="h-5 w-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
          accentColor="amber"
        />
      </div>

      {/* EXECUTIVE INSIGHTS GRID */}
      <div className="mb-10 grid gap-5 md:grid-cols-2">
        {/* WIDGET 1: AI BID OPTIMIZATION INTEGRITY */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 backdrop-blur-xl p-6.5 relative overflow-hidden group hover:border-zinc-700/60 transition duration-300">
          <div className="absolute top-0 right-0 w-[120px] h-[120px] bg-emerald-500/5 blur-[40px] rounded-full pointer-events-none" />
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-2.5 bg-emerald-500/10 border border-emerald-500/20">
              <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <span className="text-[9px] font-black tracking-widest text-emerald-400 uppercase">AI Bid Optimization</span>
              <h3 className="text-sm font-bold text-zinc-200 mt-0.5">Landed Cost Savings Matrix</h3>
            </div>
          </div>
          <div className="mt-5 flex items-baseline gap-2">
            <span className="text-3xl font-black text-zinc-50">₹1,48,500</span>
            <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              +14.2% Saved
            </span>
          </div>
          <p className="text-xs text-zinc-450 mt-2 leading-relaxed">
            Composite rate pricing optimizations applied across electrical and HVAC components using live Indian and Middle Eastern supplier catalogs.
          </p>
          <div className="mt-5 flex gap-3">
            <Link
              href="/estimator"
              className="inline-flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 px-3.5 py-2 text-[10px] font-black uppercase tracking-wider text-zinc-300 transition active:scale-98 cursor-pointer h-[32px]"
            >
              Analyze Rates Cockpit
            </Link>
          </div>
        </div>

        {/* WIDGET 2: TENDER CONTRACT RISK ENGINE */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 backdrop-blur-xl p-6.5 relative overflow-hidden group hover:border-zinc-700/60 transition duration-300">
          <div className="absolute top-0 right-0 w-[120px] h-[120px] bg-violet-500/5 blur-[40px] rounded-full pointer-events-none" />
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-2.5 bg-violet-500/10 border border-violet-500/20">
              <svg className="h-5 w-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <span className="text-[9px] font-black tracking-widest text-violet-400 uppercase">Tender Risk Console</span>
              <h3 className="text-sm font-bold text-zinc-200 mt-0.5">Active Contractual Risk Markups</h3>
            </div>
          </div>
          <div className="mt-5 flex items-baseline gap-2">
            <span className="text-3xl font-black text-zinc-50">9 Risks</span>
            <span className="text-[10px] font-extrabold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">
              7 Mitigations Active
            </span>
          </div>
          <p className="text-xs text-zinc-450 mt-2 leading-relaxed">
            Uncapped delay damages and credit timelines countered using dynamic mathematical markups, automatically appended to item remarks.
          </p>
          <div className="mt-5 flex gap-3">
            <Link
              href="/estimator"
              className="inline-flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 px-3.5 py-2 text-[10px] font-black uppercase tracking-wider text-zinc-300 transition active:scale-98 cursor-pointer h-[32px]"
            >
              Configure Contingency
            </Link>
          </div>
        </div>
      </div>

      {/* Recents Section */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-zinc-50">
          Recent Projects
        </h2>
        <Link
          href="/tenders"
          className="text-xs font-extrabold uppercase tracking-widest text-zinc-450 hover:text-violet-400 transition"
        >
          View all projects &rarr;
        </Link>
      </div>

      {recentTenders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800/80 bg-zinc-950/40 p-12 text-center relative overflow-hidden select-none">
          <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/5 to-emerald-500/5 opacity-40 blur-[20px]" />
          <svg className="mx-auto h-10 w-10 text-zinc-650 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="mt-4 text-sm font-bold text-zinc-200 relative z-10">
            No tender projects created yet
          </p>
          <p className="mt-1 text-xs text-zinc-500 relative z-10">
            Begin by establishing a project workspace to parse drawings and BOQ lists.
          </p>
          <Link
            href="/tenders/new"
            className="mt-5 inline-flex items-center justify-center rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-98 px-4 py-2.5 text-xs font-bold text-white transition cursor-pointer shadow-lg shadow-violet-600/15 relative z-10"
          >
            Create tender project
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
  const shadowColors = {
    blue: "hover:shadow-blue-500/5 hover:border-blue-900/60",
    emerald: "hover:shadow-emerald-500/5 hover:border-emerald-900/60",
    violet: "hover:shadow-violet-500/5 hover:border-violet-900/60",
    amber: "hover:shadow-amber-500/5 hover:border-amber-900/60",
  };

  const bgIcons = {
    blue: "bg-blue-500/10 border border-blue-500/20",
    emerald: "bg-emerald-500/10 border border-emerald-500/20",
    violet: "bg-violet-500/10 border border-violet-500/20",
    amber: "bg-amber-500/10 border border-amber-500/20",
  };

  const inner = (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-[10px] font-black uppercase tracking-wider text-zinc-550">
          {label}
        </div>
        <div className="mt-2.5 text-4.5xl font-black tracking-tight text-zinc-50 transition group-hover:scale-105 origin-left duration-300">
          {value}
        </div>
      </div>
      <div className={`rounded-2xl p-3 ${bgIcons[accentColor]} transition duration-300 group-hover:rotate-6 shadow-inner`}>
        {icon}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={`group block rounded-2xl border border-zinc-800 bg-zinc-950/40 backdrop-blur-xl p-5.5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-zinc-900/40 cursor-pointer ${shadowColors[accentColor]}`}
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className="group rounded-2xl border border-zinc-800 bg-zinc-950/40 backdrop-blur-xl p-5.5 shadow-sm">
      {inner}
    </div>
  );
}
