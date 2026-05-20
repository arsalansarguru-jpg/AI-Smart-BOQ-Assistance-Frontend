import type { TenderFile, TenderFileCategory } from "@/lib/types";
import { TENDER_CATEGORY_CONFIG } from "@/lib/tenders/files";

const CATEGORIES: TenderFileCategory[] = ["boq", "drawings", "make_list"];

export default function TenderFilesSummary({ files }: { files: TenderFile[] }) {
  const total = files.length;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white">
        Document overview
      </h2>
      <p className="mt-0.5 text-sm text-gray-500 dark:text-neutral-400">
        {total === 0
          ? "No documents uploaded yet."
          : `${total} document${total === 1 ? "" : "s"} across all categories`}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {CATEGORIES.map((category) => {
          const count = files.filter((f) => f.category === category).length;
          const config = TENDER_CATEGORY_CONFIG[category];
          return (
            <div
              key={category}
              className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-800/50"
            >
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-neutral-500">
                {config.title}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900 dark:text-white">
                {count}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
