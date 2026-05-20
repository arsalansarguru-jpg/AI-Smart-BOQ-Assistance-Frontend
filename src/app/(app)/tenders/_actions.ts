"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TENDER_STORAGE_BUCKET } from "@/lib/tenders/files";

type FieldErrors = Partial<{
  tender_name: string;
  client_name: string;
  form: string;
}>;

export type TenderFormState = {
  errors?: FieldErrors;
  values?: {
    tender_name: string;
    client_name: string;
  };
};

function parseFormValues(formData: FormData) {
  return {
    tender_name: String(formData.get("tender_name") ?? "").trim(),
    client_name: String(formData.get("client_name") ?? "").trim(),
  };
}

function validate(values: ReturnType<typeof parseFormValues>) {
  const errors: FieldErrors = {};
  if (!values.tender_name) {
    errors.tender_name = "Tender name is required.";
  } else if (values.tender_name.length > 200) {
    errors.tender_name = "Tender name must be 200 characters or fewer.";
  }
  if (!values.client_name) {
    errors.client_name = "Client name is required.";
  } else if (values.client_name.length > 200) {
    errors.client_name = "Client name must be 200 characters or fewer.";
  }
  return errors;
}

export async function createTenderProject(
  _prev: TenderFormState,
  formData: FormData
): Promise<TenderFormState> {
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
    .from("tender_projects")
    .insert({
      tender_name: values.tender_name,
      client_name: values.client_name,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    return { errors: { form: error.message }, values };
  }

  revalidatePath("/tenders");
  revalidatePath("/dashboard");
  redirect(`/tenders/${data.id}`);
}

export async function deleteTenderProject(
  tenderId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You are not signed in." };
  }

  const { data: files } = await supabase
    .from("tender_files")
    .select("file_url")
    .eq("tender_project_id", tenderId);

  if (files?.length) {
    const paths = files.map((f) => f.file_url);
    await supabase.storage.from(TENDER_STORAGE_BUCKET).remove(paths);
  }

  const { error } = await supabase
    .from("tender_projects")
    .delete()
    .eq("id", tenderId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/tenders");
  revalidatePath("/dashboard");
  return {};
}
