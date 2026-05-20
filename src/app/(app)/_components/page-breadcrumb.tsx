import Link from "next/link";

export type BreadcrumbSegment = {
  label: string;
  href?: string;
};

export default function PageBreadcrumb({
  segments,
}: {
  segments: BreadcrumbSegment[];
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-4 text-sm text-gray-500 dark:text-neutral-400"
    >
      <Link
        href="/dashboard"
        className="font-medium hover:text-gray-700 dark:hover:text-neutral-200"
      >
        Home
      </Link>
      {segments.map((segment, index) => (
        <span key={`${segment.label}-${index}`}>
          <span className="mx-1.5">/</span>
          {segment.href ? (
            <Link
              href={segment.href}
              className="hover:text-gray-700 dark:hover:text-neutral-200"
            >
              {segment.label}
            </Link>
          ) : (
            <span className="text-gray-700 dark:text-neutral-200">
              {segment.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
