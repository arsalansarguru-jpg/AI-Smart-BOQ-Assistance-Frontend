import { STORAGE_BUCKET } from "@/lib/files";

export default function SetupStorageBucketHint({
  projectRef,
}: {
  projectRef?: string | null;
}) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
    >
      <p className="font-medium">Storage bucket required</p>
      <p className="mt-1 text-amber-800 dark:text-amber-300/90">
        Supabase returned <strong>Bucket not found</strong> for{" "}
        <code className="rounded bg-amber-100 px-1 font-semibold dark:bg-amber-900/50">
          {STORAGE_BUCKET}
        </code>
        . The bucket must exist on the <strong>same project</strong> as your app.
      </p>

      {projectRef ? (
        <p className="mt-2 rounded bg-amber-100/80 px-2 py-1.5 text-xs dark:bg-amber-900/40">
          Your app is connected to Supabase project:{" "}
          <code className="font-semibold">{projectRef}</code>
          <br />
          In the dashboard URL you should see:{" "}
          <code className="break-all">supabase.com/project/{projectRef}</code>
          — if you are in a different project, fix{" "}
          <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/50">
            frontend/.env.local
          </code>{" "}
          or create the bucket in the correct project.
        </p>
      ) : null}

      <p className="mt-3 font-medium text-amber-900 dark:text-amber-100">
        Recommended fix (SQL — most reliable)
      </p>
      <ol className="mt-1 list-inside list-decimal space-y-1 text-amber-800 dark:text-amber-300/90">
        <li>
          Supabase → <strong>SQL Editor</strong> → New query
        </li>
        <li>
          Paste and run the entire file{" "}
          <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/50">
            supabase/day3_fix_storage_complete.sql
          </code>
        </li>
        <li>
          Confirm the result shows one row:{" "}
          <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/50">
            project-files | project-files | false
          </code>
        </li>
        <li>
          Go to <strong>Storage</strong> — you should see bucket{" "}
          <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/50">
            project-files
          </code>
        </li>
        <li>Refresh this page and upload again</li>
      </ol>

      <p className="mt-3 text-xs text-amber-700 dark:text-amber-400/80">
        Or use the dashboard: Storage → New bucket → name{" "}
        <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/50">
          project-files
        </code>
        , Public OFF, then run{" "}
        <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/50">
          day3c_storage_policies.sql
        </code>
        .
      </p>
    </div>
  );
}
