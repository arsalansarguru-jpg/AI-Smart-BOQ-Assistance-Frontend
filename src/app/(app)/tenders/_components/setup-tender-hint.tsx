import { TENDER_SETUP_HINT } from "@/lib/tenders/files";

export default function SetupTenderHint() {
  return (
    <div
      role="alert"
      className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
    >
      <p className="font-medium">Database setup required</p>
      <p className="mt-1 text-amber-800 dark:text-amber-300/90">
        {TENDER_SETUP_HINT}
      </p>
    </div>
  );
}
