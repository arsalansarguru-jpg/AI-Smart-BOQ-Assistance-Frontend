import Link from "next/link";

export default function TenderEmptyState() {
  return (
    <div className="rounded-xl border-2 border-dashed border-gray-200 px-6 py-16 text-center dark:border-neutral-700">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-neutral-800">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-7 w-7 text-gray-500 dark:text-neutral-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
        No tender projects yet
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-gray-500 dark:text-neutral-400">
        Create a tender project to organize BOQ documents, drawings, and make
        lists in separate categories for AI-powered automation.
      </p>
      <Link
        href="/tenders/new"
        className="mt-6 inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-neutral-200"
      >
        Create tender project
      </Link>
    </div>
  );
}
