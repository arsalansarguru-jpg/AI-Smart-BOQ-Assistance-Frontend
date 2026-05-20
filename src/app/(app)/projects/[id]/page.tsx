import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDateTime } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/lib/types";
import DeleteButton from "./delete-button";
import {
  checkProjectFilesTable,
  isTableMissingStatus,
} from "@/lib/db-setup";
import { checkStorageBucket, isBucketMissingStatus } from "@/lib/storage-setup";
import PageBreadcrumb from "@/app/(app)/_components/page-breadcrumb";
import FileUpload from "./_components/file-upload";
import FileList from "./_components/file-list";

export const metadata = {
  title: "Project - BOQ Automation",
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const project = data as Project;
  const tableStatus = await checkProjectFilesTable();
  const tableMissing = isTableMissingStatus(tableStatus);
  const storageStatus = tableMissing
    ? { ok: false, bucket: "project-files", projectRef: tableStatus.projectRef }
    : await checkStorageBucket();
  const bucketMissing =
    !tableMissing && isBucketMissingStatus(storageStatus);

  return (
    <main className="mx-auto max-w-4xl px-6 py-8 sm:px-10">
      <PageBreadcrumb
        segments={[
          { label: "Projects", href: "/projects" },
          { label: project.project_name },
        ]}
      />

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
            {project.project_name}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
            Client: {project.client_name}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/projects/${project.id}/edit`}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            Edit
          </Link>
          <DeleteButton
            projectId={project.id}
            projectName={project.project_name}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <DetailRow label="Project name" value={project.project_name} />
        <DetailRow label="Client" value={project.client_name} />
        <DetailRow
          label="Tender number"
          value={project.tender_number ?? "—"}
        />
        <DetailRow label="Created" value={formatDateTime(project.created_at)} />
        <DetailRow
          label="Last updated"
          value={formatDateTime(project.updated_at)}
        />
      </div>

      <section className="mt-10 space-y-6">
        <FileUpload
          projectId={project.id}
          initialTableMissing={tableMissing}
          initialBucketMissing={bucketMissing}
          projectRef={storageStatus.projectRef ?? tableStatus.projectRef}
        />
        <FileList
          projectId={project.id}
          projectName={project.project_name}
        />
      </section>
    </main>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-neutral-500">
        {label}
      </div>
      <div className="mt-1 break-words text-sm text-gray-900 dark:text-white">
        {value}
      </div>
    </div>
  );
}
