/** Safe for Client and Server — no next/headers. */

/** Reads project ref from NEXT_PUBLIC_SUPABASE_URL (e.g. komqbxfdoawznpdvvvgh). */
export function getSupabaseProjectRef(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match?.[1] ?? null;
}
