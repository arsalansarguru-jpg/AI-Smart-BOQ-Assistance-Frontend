/** Safe for Client and Server — no next/headers. */

/**
 * Supabase project URL only — no /rest/v1/ suffix.
 * Auth must hit .../auth/v1/..., not .../rest/v1/auth/v1/...
 */
export function getSupabaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return raw
    .replace(/\/rest\/v1\/?$/i, "")
    .replace(/\/+$/, "");
}

export function getSupabaseAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
}

/** Reads project ref from NEXT_PUBLIC_SUPABASE_URL (e.g. komqbxfdoawznpdvvvgh). */
export function getSupabaseProjectRef(): string | null {
  const url = getSupabaseUrl();
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match?.[1] ?? null;
}
