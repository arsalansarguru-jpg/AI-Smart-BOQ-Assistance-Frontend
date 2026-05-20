"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton({
  variant = "default",
}: {
  variant?: "default" | "sidebar";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSignOut() {
    setErrorMsg(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        setErrorMsg(error.message);
        return;
      }
      router.push("/login");
      router.refresh();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Sign out failed. Try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const buttonClass =
    variant === "sidebar"
      ? "w-full rounded-md px-3 py-2 text-left text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-60 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
      : "inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800";

  return (
    <div className={variant === "sidebar" ? "w-full" : ""}>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={loading}
        aria-busy={loading}
        className={buttonClass}
      >
        {loading ? "Signing out..." : "Sign out"}
      </button>
      {errorMsg && variant === "sidebar" ? (
        <p className="mt-1 px-3 text-xs text-red-600 dark:text-red-400">
          {errorMsg}
        </p>
      ) : null}
    </div>
  );
}
