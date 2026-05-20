import { Suspense } from "react";
import LoginForm from "./login-form";

export const metadata = {
  title: "Sign in - BOQ Automation",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-neutral-950">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
            BOQ Automation
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
            AI estimation assistant for contractors
          </p>
        </div>

        <Suspense
          fallback={
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
              Loading...
            </div>
          }
        >
          <LoginForm />
        </Suspense>

        <p className="mt-6 text-center text-xs text-gray-400 dark:text-neutral-500">
          By continuing you agree to use this software responsibly.
        </p>
      </div>
    </main>
  );
}
