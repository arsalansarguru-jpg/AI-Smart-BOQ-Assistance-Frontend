import { notFound } from "next/navigation";
import PageBreadcrumb from "@/app/(app)/_components/page-breadcrumb";
import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/lib/types";
import EditProjectForm from "./edit-project-form";

export const metadata = {
  title: "Edit project - BOQ Automation",
};

export default async function EditProjectPage({
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

  return (
    <main className="mx-auto max-w-2xl px-6 py-8 sm:px-10">
      <PageBreadcrumb
        segments={[
          { label: "Projects", href: "/projects" },
          { label: project.project_name, href: `/projects/${project.id}` },
          { label: "Edit" },
        ]}
      />

      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
          Edit project
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
          Update the details for this project.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <EditProjectForm project={project} />
      </div>
    </main>
  );
}
