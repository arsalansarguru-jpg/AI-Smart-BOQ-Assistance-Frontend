"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { TENDER_STORAGE_BUCKET } from "@/lib/tenders/files";

export async function getTenderFileDownloadUrl(
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
    .from(TENDER_STORAGE_BUCKET)
    .createSignedUrl(storagePath, 60);

  if (error || !data?.signedUrl) {
    return { error: error?.message ?? "Could not create download link." };
  }

  return { url: data.signedUrl };
}

export async function deleteTenderFile(
  fileId: string,
  tenderProjectId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You are not signed in." };
  }

  const { data: fileRow, error: fetchError } = await supabase
    .from("tender_files")
    .select("file_url, tender_project_id")
    .eq("id", fileId)
    .eq("tender_project_id", tenderProjectId)
    .single();

  if (fetchError || !fileRow) {
    return { error: fetchError?.message ?? "File not found." };
  }

  const { error: storageError } = await supabase.storage
    .from(TENDER_STORAGE_BUCKET)
    .remove([fileRow.file_url]);

  if (storageError) {
    return { error: storageError.message };
  }

  const { error: deleteError } = await supabase
    .from("tender_files")
    .delete()
    .eq("id", fileId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  revalidatePath(`/tenders/${tenderProjectId}`);
  revalidatePath("/tenders");
  return {};
}
