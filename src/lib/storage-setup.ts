import { createClient } from "@/lib/supabase/server";
import { isStorageBucketMissing, STORAGE_BUCKET } from "@/lib/files";
import { getSupabaseProjectRef } from "@/lib/supabase/config";

export type StorageBucketStatus = {
  ok: boolean;
  bucket: string;
  projectRef: string | null;
  error?: string;
};

export { getSupabaseProjectRef };

/**
 * Probes whether bucket `project-files` exists on the same Supabase project as .env.local.
 */
export async function checkStorageBucket(): Promise<StorageBucketStatus> {
  const projectRef = getSupabaseProjectRef();
  const supabase = await createClient();

  const { error } = await supabase.storage.from(STORAGE_BUCKET).list("", {
    limit: 1,
  });

  if (error) {
    return {
      ok: false,
      bucket: STORAGE_BUCKET,
      projectRef,
      error: error.message,
    };
  }

  return {
    ok: true,
    bucket: STORAGE_BUCKET,
    projectRef,
  };
}

export function isBucketMissingStatus(status: StorageBucketStatus): boolean {
  return Boolean(status.error && isStorageBucketMissing(status.error));
}
