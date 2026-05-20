import Link from "next/link";
import PageBreadcrumb from "@/app/(app)/_components/page-breadcrumb";
import { checkTenderDatabase } from "@/lib/tenders/db-setup";
import CreateTenderForm from "../_components/create-tender-form";
import SetupTenderHint from "../_components/setup-tender-hint";

export const metadata = {
  title: "New Tender - BOQ Automation",
};

export default async function NewTenderPage() {
  const dbStatus = await checkTenderDatabase();
  const setupRequired = !dbStatus.ok;

  return (
    <main className="mx-auto max-w-2xl px-6 py-8 sm:px-10">
      <PageBreadcrumb
        segments={[
          { label: "Tender Documents", href: "/tenders" },
          { label: "New tender" },
        ]}
      />

      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
          Create tender project
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
          Set up a new tender workspace to upload BOQ, drawings, and make list
          documents in organized categories.
        </p>
      </div>

      {setupRequired ? (
        <div className="space-y-4">
          <SetupTenderHint />
          <Link
            href="/tenders"
            className="inline-block text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-neutral-400 dark:hover:text-white"
          >
            &larr; Back to tenders
          </Link>
        </div>
      ) : (
        <CreateTenderForm />
      )}
    </main>
  );
}
