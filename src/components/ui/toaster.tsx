"use client";

import { Toaster } from "sonner";

export default function AppToaster() {
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "rounded-lg border border-gray-200 bg-white text-gray-900 shadow-lg dark:border-neutral-700 dark:bg-neutral-900 dark:text-white",
          title: "text-sm font-medium",
          description: "text-sm text-gray-500 dark:text-neutral-400",
        },
      }}
    />
  );
}
