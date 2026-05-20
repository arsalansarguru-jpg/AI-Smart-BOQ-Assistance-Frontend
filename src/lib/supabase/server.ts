import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/config";
/**
 * Supabase client for use in Server Components, Route Handlers, and Server Actions.
 * Bridges Supabase's cookie storage to Next.js's cookies() API.
 *
 * In Next.js 15+, cookies() is async, so this function is async too.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // `setAll` was called from a Server Component (read-only context).
            // This is safe to ignore as long as middleware is refreshing sessions.
          }
        },
      },
    }
  );
}
