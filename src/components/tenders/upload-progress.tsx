"use client";

type UploadProgressProps = {
  current: number;
  total: number;
  fileName?: string;
};

export default function UploadProgress({
  current,
  total,
  fileName,
}: UploadProgressProps) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800/50">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-gray-700 dark:text-neutral-200">
          Uploading{fileName ? `: ${fileName}` : ""}…
        </span>
        <span className="tabular-nums text-gray-500 dark:text-neutral-400">
          {current} / {total} ({percent}%)
        </span>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-neutral-700"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-gray-900 transition-all duration-300 ease-out dark:bg-white"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
