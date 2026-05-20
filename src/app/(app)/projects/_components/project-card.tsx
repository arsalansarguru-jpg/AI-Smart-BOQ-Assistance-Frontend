import Link from "next/link";
import { formatDate } from "@/lib/dates";
import type { Project } from "@/lib/types";

export default function ProjectCard({ project }: { project: Project }) {
  const created = formatDate(project.created_at);

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-gray-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="line-clamp-2 text-base font-semibold text-gray-900 group-hover:text-gray-700 dark:text-white dark:group-hover:text-neutral-200">
          {project.project_name}
        </h3>
        {project.tender_number ? (
          <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-neutral-800 dark:text-neutral-300">
            #{project.tender_number}
          </span>
        ) : null}
      </div>

      <p className="mt-1.5 text-sm text-gray-600 dark:text-neutral-400">
        {project.client_name}
      </p>

      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-400 dark:border-neutral-800 dark:text-neutral-500">
        <span>Created {created}</span>
        <span className="font-medium text-gray-500 group-hover:text-gray-700 dark:text-neutral-400 dark:group-hover:text-neutral-200">
          View &rarr;
        </span>
      </div>
    </Link>
  );
}
