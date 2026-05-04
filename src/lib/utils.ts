/**
 * Shared utility functions for the Runnix dashboard.
 */

/**
 * Human-friendly relative time (e.g. "2m ago", "3d ago").
 * Previously copy-pasted in 5 different page files.
 */
export function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/**
 * Merge class names — removes falsy values. Lightweight alternative to clsx.
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Format large numbers with locale separators.
 */
export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

/**
 * Get job ID from a Job object (handles both `id` and `job_id` fields).
 */
export function getJobId(job: { id?: string; job_id?: string }): string {
  return job.id ?? job.job_id ?? "—";
}

/**
 * Truncate a string with ellipsis.
 */
export function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max) + "…";
}
