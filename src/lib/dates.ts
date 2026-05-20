/**
 * Fixed-locale date formatting so server and client HTML match (avoids hydration errors).
 * Do not use toLocaleString(undefined) — that follows the OS/browser locale and differs.
 */

const LOCALE = "en-US";

const DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
};

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
};

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(LOCALE, DATE_TIME_OPTIONS);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(LOCALE, DATE_OPTIONS);
}
