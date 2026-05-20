"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { STORAGE_BUCKET } from "@/lib/files";

export async function getDownloadUrl(
  storagePath: string
): Promise<{ url: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You are not signed in." };
  }

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, 60);

  if (error || !data?.signedUrl) {
    return { error: error?.message ?? "Could not create download link." };
  }

  return { url: data.signedUrl };
}

export async function deleteFile(
  fileId: string,
  projectId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You are not signed in." };
  }

  const { data: fileRow, error: fetchError } = await supabase
    .from("project_files")
    .select("storage_path")
    .eq("id", fileId)
    .eq("project_id", projectId)
    .single();

  if (fetchError || !fileRow) {
    return { error: fetchError?.message ?? "File not found." };
  }

  const { error: storageError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([fileRow.storage_path]);

  if (storageError) {
    return { error: storageError.message };
  }

  const { error: deleteError } = await supabase
    .from("project_files")
    .delete()
    .eq("id", fileId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/upload");
  revalidatePath("/dashboard");
  return {};
}
