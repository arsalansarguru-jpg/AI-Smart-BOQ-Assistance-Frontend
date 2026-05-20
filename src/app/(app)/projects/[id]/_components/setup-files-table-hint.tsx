import { getSupabaseProjectRef } from "@/lib/supabase/config";

export default function SetupFilesTableHint() {
  const projectRef = getSupabaseProjectRef();

  return (
    <div
      role="alert"
      className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
    >
      <p className="font-medium">Database setup required</p>
      <p className="mt-1 text-amber-800 dark:text-amber-300/90">
        Supabase cannot see the{" "}
        <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/50">
          project_files
        </code>{" "}
        table yet (schema cache error). Run the one-shot SQL fix below on the{" "}
        <strong>same project</strong> as your app.
      </p>

      {projectRef ? (
        <p className="mt-2 rounded bg-amber-100/80 px-2 py-1.5 text-xs dark:bg-amber-900/40">
          Your app uses Supabase project:{" "}
          <code className="font-semibold">{projectRef}</code>
          <br />
          Dashboard URL must include:{" "}
          <code className="break-all">supabase.com/project/{projectRef}</code>
        </p>
      ) : null}

      <p className="mt-3 font-medium text-amber-900 dark:text-amber-100">
        Run this file (entire contents, one click Run)
      </p>
      <p className="mt-1 font-mono text-xs text-amber-800 dark:text-amber-300">
        supabase/day3_fix_everything.sql
      </p>

      <ol className="mt-2 list-inside list-decimal space-y-1 text-amber-800 dark:text-amber-300/90">
        <li>
          Supabase → <strong>SQL Editor</strong> → New query
        </li>
        <li>
          Open{" "}
          <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/50">
            day3_fix_everything.sql
          </code>{" "}
          from your project folder on disk, copy <strong>all</strong> of it,
          paste, click <strong>Run</strong>
        </li>
        <li>
          At the bottom, confirm you see:{" "}
          <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/50">
            project_files table | ok = 1
          </code>{" "}
          and bucket <code className="rounded bg-amber-100 px-1">project-files</code>
        </li>
        <li>
          If upload still fails: Supabase → <strong>Project Settings</strong> →{" "}
          <strong>API</strong> → click <strong>Reload schema cache</strong> (if
          shown), then wait 30 seconds
        </li>
        <li>Hard-refresh this page (Ctrl+Shift+R) and upload again</li>
      </ol>

      <p className="mt-3 text-xs text-amber-700 dark:text-amber-400/80">
        If SQL errors on <code>references public.projects</code>, run Day 2 SQL
        first (projects table). If you already ran partial scripts, this file is
        safe to run again.
      </p>
    </div>
  );
}
