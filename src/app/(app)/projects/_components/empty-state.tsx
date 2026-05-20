import Link from "next/link";

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-gray-200 bg-white px-6 py-16 text-center dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-neutral-800">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-gray-500 dark:text-neutral-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.6}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
          />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        No projects yet
      </h2>
      <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-neutral-400">
        Create your first project to start uploading tender documents and
        generating BOQs.
      </p>
      <Link
        href="/projects/new"
        className="mt-6 inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-neutral-200"
      >
        Create your first project
      </Link>
    </div>
  );
}
