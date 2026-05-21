import Link from "next/link";
import PageBreadcrumb from "@/app/(app)/_components/page-breadcrumb";
import { createClient } from "@/lib/supabase/server";
import type { TenderProject } from "@/lib/types";

export const metadata = {
  title: "Upload Tender Files - AI Smart BOQ Automation",
};

export default async function UploadBoqPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tender_projects")
    .select("*")
    .order("created_at", { ascending: false });

  const tenders = (data ?? []) as TenderProject[];

  return (
    <main className="mx-auto max-w-3xl px-6 py-8 sm:px-10">
      <PageBreadcrumb segments={[{ label: "Upload Documents" }]} />
      <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
        Upload Tender Documents
      </h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
        Choose a tender project to upload BOQs, Drawing files, or Make Lists. You can extract and structure tables on the tender page.
      </p>

      {tenders.length === 0 ? (
        <div className="mt-8 rounded-xl border-2 border-dashed border-gray-200 bg-white px-6 py-12 text-center dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-sm text-gray-500 dark:text-neutral-400">
            Create a tender project first, then return here to upload files.
          </p>
          <Link
            href="/tenders/new"
            className="mt-4 inline-flex rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-neutral-200"
          >
            Create tender project
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {tenders.map((tender) => (
            <li key={tender.id}>
              <Link
                href={`/tenders/${tender.id}`}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition hover:border-gray-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
              >
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {tender.tender_name}
                  </div>
                  <div className="mt-0.5 text-sm text-gray-500 dark:text-neutral-400">
                    {tender.client_name}
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-neutral-300">
                  Upload files &rarr;
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-center text-sm text-gray-500 dark:text-neutral-400">
        <Link
          href="/tenders/new"
          className="font-medium text-gray-700 hover:text-gray-900 dark:text-neutral-300 dark:hover:text-white"
        >
          + New tender project
        </Link>
      </p>
    </main>
  );
}
