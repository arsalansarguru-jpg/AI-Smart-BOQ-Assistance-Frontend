"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "sign-in" | "sign-up";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";

  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(true);

    const supabase = createClient();

    try {
      if (mode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setErrorMsg(error.message);
          setLoading(false);
          return;
        }
        router.push(redirectTo);
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
          },
        });
        if (error) {
          setErrorMsg(error.message);
          setLoading(false);
          return;
        }
        // If email confirmation is enabled, session is null and user must confirm.
        // If it's disabled in Supabase settings, session is returned immediately.
        if (data.session) {
          router.push(redirectTo);
          router.refresh();
        } else {
          setInfoMsg(
            "Check your inbox for a confirmation email to finish signing up."
          );
        }
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Something went wrong. Try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const isSignIn = mode === "sign-in";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-6 flex rounded-lg bg-gray-100 p-1 dark:bg-neutral-800">
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setMode("sign-in");
            setErrorMsg(null);
            setInfoMsg(null);
          }}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
            isSignIn
              ? "bg-white text-gray-900 shadow-sm dark:bg-neutral-700 dark:text-white"
              : "text-gray-500 hover:text-gray-700 dark:text-neutral-400 dark:hover:text-neutral-200"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setMode("sign-up");
            setErrorMsg(null);
            setInfoMsg(null);
          }}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
            !isSignIn
              ? "bg-white text-gray-900 shadow-sm dark:bg-neutral-700 dark:text-white"
              : "text-gray-500 hover:text-gray-700 dark:text-neutral-400 dark:hover:text-neutral-200"
          }`}
        >
          Sign up
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 dark:text-neutral-300"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:border-white dark:focus:ring-white"
            placeholder="you@company.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 dark:text-neutral-300"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            autoComplete={isSignIn ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:border-white dark:focus:ring-white"
            placeholder={isSignIn ? "Your password" : "At least 6 characters"}
          />
        </div>

        {errorMsg ? (
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
          >
            {errorMsg}
          </div>
        ) : null}

        {infoMsg ? (
          <div
            role="status"
            className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300"
          >
            {infoMsg}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-gray-900 dark:hover:bg-neutral-200 dark:focus:ring-white"
        >
          {loading
            ? isSignIn
              ? "Signing in..."
              : "Creating account..."
            : isSignIn
              ? "Sign in"
              : "Create account"}
        </button>
      </form>
    </div>
  );
}
