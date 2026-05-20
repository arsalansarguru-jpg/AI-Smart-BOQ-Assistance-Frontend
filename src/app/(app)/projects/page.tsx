import Link from "next/link";
import PageBreadcrumb from "@/app/(app)/_components/page-breadcrumb";
import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/lib/types";
import ProjectCard from "./_components/project-card";
import EmptyState from "./_components/empty-state";

export const metadata = {
  title: "Projects - BOQ Automation",
};

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  const projects = (data ?? []) as Project[];

  return (
    <main className="mx-auto max-w-6xl px-6 py-8 sm:px-10">
      <PageBreadcrumb segments={[{ label: "Projects" }]} />
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
            Projects
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
            {projects.length === 0
              ? "Get started by creating your first project."
              : `${projects.length} project${projects.length === 1 ? "" : "s"}`}
          </p>
        </div>
        {projects.length > 0 ? (
          <Link
            href="/projects/new"
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
            New project
          </Link>
        ) : null}
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
        >
          Failed to load projects: {error.message}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </main>
  );
}
