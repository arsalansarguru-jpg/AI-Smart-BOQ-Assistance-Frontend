import PageBreadcrumb from "@/app/(app)/_components/page-breadcrumb";
import CreateProjectForm from "./create-project-form";

export const metadata = {
  title: "New project - BOQ Automation",
};

export default function NewProjectPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-8 sm:px-10">
      <PageBreadcrumb
        segments={[
          { label: "Projects", href: "/projects" },
          { label: "New" },
        ]}
      />

      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
          Create new project
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
          Set up a workspace for one tender or estimation engagement.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <CreateProjectForm />
      </div>
    </main>
  );
}
