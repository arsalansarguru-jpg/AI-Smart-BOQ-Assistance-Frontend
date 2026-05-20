/** True when a server action called redirect() — not a real failure. */
export function isNextRedirect(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const digest = "digest" in error ? String((error as { digest: unknown }).digest) : "";
  return digest.startsWith("NEXT_REDIRECT") || digest.includes("NEXT_REDIRECT");
}
