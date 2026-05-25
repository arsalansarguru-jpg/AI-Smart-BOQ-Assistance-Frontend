import { Suspense } from "react";
import LoginForm from "./login-form";

export const metadata = {
  title: "Sign in - Vertex Estimator AI",
};

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 py-12 text-zinc-100 overflow-hidden select-none">
      {/* Background Glowing Ambient Orbs */}
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-violet-600/10 blur-[120px] rounded-full pointer-events-none animate-pulse duration-10000" />
      <div className="absolute bottom-[-10%] right-[10%] w-[450px] h-[450px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none animate-pulse duration-8000" />

      <div className="w-full max-w-[440px] relative z-10">
        {/* LOGO AND BRANDING */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800/80 shadow-inner relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-violet-600/20 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <svg
              className="h-6 w-6 text-violet-400 group-hover:text-violet-300 transition duration-300 relative z-10"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          
          <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-zinc-50 via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Vertex Estimator AI
          </h1>
          <p className="mt-1.5 text-xs font-bold tracking-wide text-zinc-500 uppercase">
            MEP & Construction Intelligence Suite
          </p>
        </div>

        <Suspense
          fallback={
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/50 backdrop-blur-xl p-8 text-sm text-zinc-500 shadow-2xl text-center">
              <span className="inline-block animate-pulse text-zinc-400 font-bold">Synchronizing Secure Workspace...</span>
            </div>
          }
        >
          <LoginForm />
        </Suspense>

        <p className="mt-6 text-center text-[10px] font-extrabold uppercase tracking-widest text-zinc-600">
          Secure Sandbox environment • v0.1.0
        </p>
      </div>
    </main>
  );
}
