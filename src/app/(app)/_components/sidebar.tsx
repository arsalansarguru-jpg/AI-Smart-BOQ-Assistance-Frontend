"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SignOutButton from "./sign-out-button";

type NavItem = {
  href: string;
  label: string;
  iconPath: string;
  /** Custom active check; defaults to pathname match on href */
  isActive?: (pathname: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Home",
    iconPath:
      "M3 12l2-2m0 0l7-7 7 7M5 21v-10a2 2 0 012-2h10a2 2 0 012 2v10",
    isActive: (pathname) => pathname === "/dashboard",
  },
  {
    href: "/projects",
    label: "Projects",
    iconPath:
      "M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z",
    isActive: (pathname) =>
      pathname === "/projects" ||
      pathname === "/projects/new" ||
      pathname.endsWith("/edit"),
  },
  {
    href: "/tenders",
    label: "Tender Documents",
    iconPath:
      "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    isActive: (pathname) =>
      pathname === "/tenders" ||
      pathname.startsWith("/tenders/"),
  },
  {
    href: "/upload",
    label: "Upload BOQ",
    iconPath:
      "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 12V4m0 0l-4 4m4-4l4 4",
    isActive: (pathname) =>
      pathname === "/upload" ||
      (pathname.startsWith("/projects/") &&
        pathname !== "/projects/new" &&
        !pathname.endsWith("/edit")),
  },
];

const COMING_SOON_ITEMS: NavItem[] = [
  {
    href: "#",
    label: "Rates",
    iconPath:
      "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z",
  },
];

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const active = item.isActive
    ? item.isActive(pathname)
    : pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-gray-100 text-gray-900 dark:bg-neutral-800 dark:text-white"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
      }`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.6}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d={item.iconPath}
        />
      </svg>
      <span>{item.label}</span>
    </Link>
  );
}

export default function Sidebar({ userEmail }: { userEmail: string }) {
  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <Link
        href="/dashboard"
        className="block border-b border-gray-200 px-5 py-4 transition hover:bg-gray-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50"
      >
        <h1 className="text-base font-semibold tracking-tight text-gray-900 dark:text-white">
          BOQ Automation
        </h1>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-neutral-400">
          AI estimation assistant
        </p>
      </Link>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <div className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-500">
          Workspace
        </div>
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.label} item={item} />
        ))}

        <div className="px-2 pb-2 pt-6 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-500">
          Coming soon
        </div>
        {COMING_SOON_ITEMS.map((item) => (
          <div
            key={item.label}
            className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-400 dark:text-neutral-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.6}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d={item.iconPath}
              />
            </svg>
            <span className="flex-1">{item.label}</span>
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-neutral-800 dark:text-neutral-400">
              Later
            </span>
          </div>
        ))}
      </nav>

      <div className="border-t border-gray-200 p-3 dark:border-neutral-800">
        <div
          className="truncate px-3 py-1.5 text-xs text-gray-500 dark:text-neutral-400"
          title={userEmail}
        >
          {userEmail}
        </div>
        <SignOutButton variant="sidebar" />
      </div>
    </aside>
  );
}
