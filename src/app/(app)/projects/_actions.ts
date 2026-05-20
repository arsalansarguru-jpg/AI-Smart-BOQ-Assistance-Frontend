"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type FieldErrors = Partial<{
  project_name: string;
  client_name: string;
  tender_number: string;
  form: string;
}>;

export type ProjectFormState = {
  errors?: FieldErrors;
  values?: {
    project_name: string;
    client_name: string;
    tender_number: string;
  };
};

function parseFormValues(formData: FormData) {
  return {
    project_name: String(formData.get("project_name") ?? "").trim(),
    client_name: String(formData.get("client_name") ?? "").trim(),
    tender_number: String(formData.get("tender_number") ?? "").trim(),
  };
}

function validate(values: ReturnType<typeof parseFormValues>) {
  const errors: FieldErrors = {};
  if (!values.project_name) {
    errors.project_name = "Project name is required.";
  } else if (values.project_name.length > 200) {
    errors.project_name = "Project name must be 200 characters or fewer.";
  }
  if (!values.client_name) {
    errors.client_name = "Client name is required.";
  } else if (values.client_name.length > 200) {
    errors.client_name = "Client name must be 200 characters or fewer.";
  }
  if (values.tender_number.length > 100) {
    errors.tender_number = "Tender number must be 100 characters or fewer.";
  }
  return errors;
}

export async function createProject(
  _prev: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const values = parseFormValues(formData);
  const errors = validate(values);
  if (Object.keys(errors).length > 0) {
    return { errors, values };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { errors: { form: "You are not signed in." }, values };
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      project_name: values.project_name,
      client_name: values.client_name,
      tender_number: values.tender_number || null,
    })
    .select("id")
    .single();

  if (error) {
    return { errors: { form: error.message }, values };
  }

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  revalidatePath("/upload");
  redirect(`/projects/${data.id}`);
}

export async function updateProject(
  projectId: string,
  _prev: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const values = parseFormValues(formData);
  const errors = validate(values);
  if (Object.keys(errors).length > 0) {
    return { errors, values };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { errors: { form: "You are not signed in." }, values };
  }

  const { error } = await supabase
    .from("projects")
    .update({
      project_name: values.project_name,
      client_name: values.client_name,
      tender_number: values.tender_number || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);

  if (error) {
    return { errors: { form: error.message }, values };
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
  revalidatePath("/upload");
  redirect(`/projects/${projectId}`);
}

export async function deleteProject(
  projectId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You are not signed in." };
  }

  const { error } = await supabase.from("projects").delete().eq("id", projectId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  revalidatePath("/upload");
  return {};
}
