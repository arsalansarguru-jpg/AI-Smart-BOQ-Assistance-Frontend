"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

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
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 backdrop-blur-xl p-7.5 shadow-2xl shadow-violet-500/5 relative overflow-hidden select-none">
      {/* Decorative inner ambient glow */}
      <div className="absolute top-0 right-0 w-[120px] h-[120px] bg-violet-500/5 blur-[40px] rounded-full pointer-events-none" />

      {/* FORM MODE TABS */}
      <div className="mb-6 flex rounded-xl bg-zinc-900/60 border border-zinc-800/60 p-1">
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setMode("sign-in");
            setErrorMsg(null);
            setInfoMsg(null);
          }}
          className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-extrabold transition duration-300 cursor-pointer ${
            isSignIn
              ? "bg-zinc-800 text-violet-400 shadow-inner border border-zinc-700/30"
              : "text-zinc-500 hover:text-zinc-300"
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
          className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-extrabold transition duration-300 cursor-pointer ${
            !isSignIn
              ? "bg-zinc-800 text-violet-400 shadow-inner border border-zinc-700/30"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Sign up
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* EMAIL INPUT */}
        <div>
          <label
            htmlFor="email"
            className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1"
          >
            Corporate Email Address
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs font-bold text-zinc-100 placeholder-zinc-650 outline-none focus:border-violet-600 focus:ring-1 focus:ring-violet-600 transition duration-300 h-[38px]"
            placeholder="you@company.com"
          />
        </div>

        {/* PASSWORD INPUT */}
        <div>
          <label
            htmlFor="password"
            className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1"
          >
            Secure Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            autoComplete={isSignIn ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs font-bold text-zinc-100 placeholder-zinc-650 outline-none focus:border-violet-600 focus:ring-1 focus:ring-violet-600 transition duration-300 h-[38px]"
            placeholder={isSignIn ? "••••••••" : "Minimum 6 characters"}
          />
        </div>

        {/* ERROR / INFO BOXES */}
        {errorMsg && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/20 bg-red-950/20 px-3.5 py-2 text-xs font-bold text-red-400 border-dashed"
          >
            ⚠️ {errorMsg}
          </div>
        )}

        {infoMsg && (
          <div
            role="status"
            className="rounded-xl border border-violet-500/20 bg-violet-950/20 px-3.5 py-2 text-xs font-bold text-violet-400 border-dashed animate-pulse"
          >
            ✉️ {infoMsg}
          </div>
        )}

        {/* SUBMIT BUTTON */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-extrabold text-white shadow-lg shadow-violet-600/10 transition duration-300 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed h-[38px] cursor-pointer mt-2"
        >
          {loading
            ? isSignIn
              ? "Authenticating Securely..."
              : "Provisioning Account..."
            : isSignIn
              ? "Access Secure Workspace"
              : "Create Business Account"}
        </button>

        {/* DIRECT TEST ACCELERATION BARRIER */}
        <div className="relative flex items-center justify-center my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-800/80" />
          </div>
          <span className="relative px-3 bg-zinc-950 text-[9px] font-black uppercase tracking-wider text-zinc-500">
            or connect with
          </span>
        </div>

        {/* SOCIAL IDENTITY PROVIDERS */}
        <div className="grid grid-cols-2 gap-3.5">
          <button
            type="button"
            onClick={() => {
              // Populate mock local identity credentials to accelerate local testing
              setEmail("estimator@company.com");
              setPassword("estimator123");
              toast.success("Loaded sandbox demo account! Click submit to continue.");
            }}
            className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-900/60 transition duration-300 py-2 text-xs font-extrabold text-zinc-300 cursor-pointer active:scale-98 h-[38px]"
            title="Pre-populate local sandbox demo account details"
          >
            {/* Google Icon SVG */}
            <svg className="h-3.5 w-3.5 text-zinc-400 group-hover:text-white" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.504 0-6.35-2.846-6.35-6.35s2.846-6.35 6.35-6.35c1.637 0 3.13.619 4.27 1.638l3.125-3.125C19.167 2.213 15.937 1 12.24 1 5.923 1 1 5.923 1 12.24s4.923 11.24 11.24 11.24c6.302 0 10.963-4.428 10.963-11.14 0-.766-.068-1.353-.18-2.055H12.24z"/>
            </svg>
            Google
          </button>
          
          <button
            type="button"
            onClick={() => {
              // Pre-populate admin local identity credentials to accelerate local testing
              setEmail("admin@company.com");
              setPassword("admin123");
              toast.success("Loaded admin demo account! Click submit to continue.");
            }}
            className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-900/60 transition duration-300 py-2 text-xs font-extrabold text-zinc-300 cursor-pointer active:scale-98 h-[38px]"
            title="Pre-populate admin demo account details"
          >
            {/* GitHub Icon SVG */}
            <svg className="h-3.5 w-3.5 text-zinc-400" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
            </svg>
            GitHub
          </button>
        </div>
      </form>
    </div>
  );
}
