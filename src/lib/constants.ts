import type { JobStatus, UserTier } from "./types";

/* ─── Job status display config ─── */

export const STATUS_LABEL: Record<JobStatus, string> = {
  ACCEPTED: "Accepted",
  RUNTIME_ERROR: "Runtime Error",
  COMPILE_ERROR: "Compile Error",
  TIME_LIMIT_EXCEEDED: "Timeout",
  SYSTEM_ERROR: "System Error",
  QUEUED: "Queued",
  RUNNING: "Running",
};

/** CSS classes for status badges — designed for dark theme */
export const STATUS_DOT_COLOR: Record<JobStatus, string> = {
  ACCEPTED: "#22c55e",
  RUNTIME_ERROR: "#ef4444",
  COMPILE_ERROR: "#ef4444",
  TIME_LIMIT_EXCEEDED: "#f59e0b",
  SYSTEM_ERROR: "#ef4444",
  QUEUED: "#6b7280",
  RUNNING: "#06b6d4",
};

export const TERMINAL_STATUSES: JobStatus[] = [
  "ACCEPTED",
  "RUNTIME_ERROR",
  "COMPILE_ERROR",
  "TIME_LIMIT_EXCEEDED",
  "SYSTEM_ERROR",
];

/* ─── Tier config ─── */

export const TIER_LIMITS: Record<UserTier, { requests: number; label: string }> = {
  free: { requests: 10, label: "Free" },
  starter: { requests: 50, label: "Starter" },
  professional: { requests: 100, label: "Professional" },
  enterprise: { requests: 500, label: "Enterprise" },
};

export const TIER_ACCENT: Record<UserTier, string> = {
  free: "#6b7280",
  starter: "#06b6d4",
  professional: "#8b5cf6",
  enterprise: "#f59e0b",
};

/* ─── Playground code examples ─── */

export const CODE_EXAMPLES: Record<string, string> = {
  python: `# Two Sum
nums = [2, 7, 11, 15]
target = 9

seen = {}
for i, n in enumerate(nums):
    diff = target - n
    if diff in seen:
        print([seen[diff], i])
        break
    seen[n] = i`,
  c: `#include <stdio.h>

int main() {
    int nums[] = {2, 7, 11, 15};
    int target = 9;
    int n = 4;

    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            if (nums[i] + nums[j] == target) {
                printf("[%d, %d]\\n", i, j);
                return 0;
            }
        }
    }
    return 0;
}`,
};

/* ─── Webhook events ─── */

export const WEBHOOK_EVENTS = ["job.completed", "job.failed", "job.timeout"];

/* ─── Polling ─── */

export const POLL_INTERVAL_MS = 800;
export const MAX_POLLS = 30;
