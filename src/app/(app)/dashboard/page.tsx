import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/lib/types";
import ProjectCard from "../projects/_components/project-card";

export const metadata = {
  title: "Dashboard - BOQ Automation",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { count } = await supabase
    .from("projects")
    .select("*", { count: "exact", head: true });

  const { data: recentData } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(3);

  const recentProjects = (recentData ?? []) as Project[];
  const projectCount = count ?? 0;

  return (
    <main className="mx-auto max-w-6xl px-6 py-8 sm:px-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
          {user?.email}
        </p>
      </div>

      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total projects"
          value={projectCount}
          href="/projects"
        />
        <StatCard label="BOQs processed" value={0} hint="Coming Day 4" />
        <StatCard label="Rates in library" value={0} hint="Coming Day 6" />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Recent projects
        </h2>
        <Link
          href="/projects"
          className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-neutral-400 dark:hover:text-white"
        >
          View all &rarr;
        </Link>
      </div>

      {recentProjects.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white px-6 py-12 text-center dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-sm text-gray-500 dark:text-neutral-400">
            You haven&apos;t created any projects yet.
          </p>
          <Link
            href="/projects/new"
            className="mt-4 inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-neutral-200"
          >
            Create your first project
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recentProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
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
  hint,
}: {
  label: string;
  value: number;
  href?: string;
  hint?: string;
}) {
  const inner = (
    <>
      <div className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-neutral-500">
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
        {value}
      </div>
      {hint ? (
        <div className="mt-1 text-xs text-gray-400 dark:text-neutral-500">
          {hint}
        </div>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-gray-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      {inner}
    </div>
  );
}
