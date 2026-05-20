import Link from "next/link";
import { formatDate } from "@/lib/dates";
import type { TenderProject } from "@/lib/types";

export default function TenderCard({
  project,
  fileCount,
}: {
  project: TenderProject;
  fileCount: number;
}) {
  return (
    <Link
      href={`/tenders/${project.id}`}
      className="group flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-gray-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="line-clamp-2 text-base font-semibold text-gray-900 group-hover:text-gray-700 dark:text-white dark:group-hover:text-neutral-200">
          {project.tender_name}
        </h3>
        <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          Tender
        </span>
      </div>
      <p className="mt-1.5 text-sm text-gray-600 dark:text-neutral-400">
        {project.client_name}
      </p>
      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-400 dark:border-neutral-800 dark:text-neutral-500">
        <span>
          {fileCount} file{fileCount === 1 ? "" : "s"} · Created{" "}
          {formatDate(project.created_at)}
        </span>
        <span className="font-medium text-gray-500 group-hover:text-gray-700 dark:text-neutral-400 dark:group-hover:text-neutral-200">
          Manage &rarr;
        </span>
      </div>
    </Link>
  );
}
