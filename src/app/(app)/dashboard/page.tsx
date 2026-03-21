"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { executionService, Job, JobStatus } from "@/lib/services";
import { useRateLimit } from "@/lib/useRateLimit";
import PageShell from "@/components/layout/PageShell";
import Link from "next/link";

const STATUS_STYLES: Record<JobStatus, string> = {
  ACCEPTED: "bg-green-50 text-green-700",
  RUNTIME_ERROR: "bg-red-50 text-red-700",
  COMPILE_ERROR: "bg-red-50 text-red-700",
  TIME_LIMIT_EXCEEDED: "bg-amber-50 text-amber-700",
  QUEUED: "bg-gray-100 text-gray-600",
  RUNNING: "bg-blue-50 text-blue-700",
};

const STATUS_LABEL: Record<JobStatus, string> = {
  ACCEPTED: "Accepted",
  RUNTIME_ERROR: "Runtime error",
  COMPILE_ERROR: "Compile error",
  TIME_LIMIT_EXCEEDED: "Timeout",
  QUEUED: "Queued",
  RUNNING: "Running",
};

const TIER_LIMITS: Record<string, number> = {
  free: 10,
  starter: 50,
  professional: 100,
  enterprise: 500,
};

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { rateLimit, capture } = useRateLimit();

  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
  try {
    const res = await executionService.listJobs({ limit: 5 });
    capture(res);
    const { jobs, total } = res.data.data;
    setRecentJobs(jobs);
    setTotalJobs(total);
    setSuccessCount(
      jobs.filter((j) => j.status === "ACCEPTED").length
    );
  } catch (err) {
    console.error("Dashboard load error:", err);
  } finally {
    setLoading(false);
  }
}
    load();
  }, []);

  const successRate =
    totalJobs > 0 ? Math.round((successCount / totalJobs) * 100) : null;

  const tierLimit = TIER_LIMITS[user?.tier ?? "free"];
  const ratePct =
    rateLimit.remaining != null && rateLimit.limit != null
      ? Math.round((rateLimit.remaining / rateLimit.limit) * 100)
      : null;

  return (
    <PageShell title="Dashboard" rateLimit={rateLimit}>
      <div className="max-w-4xl space-y-6">

        {/* Greeting */}
        <div>
          <h2 className="text-lg font-medium text-gray-900">
            Welcome back{user ? `, ${user.username}` : ""}.
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Here&apos;s what&apos;s happening with your account.
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Total executions</p>
            <p className="text-2xl font-medium text-gray-900">
              {loading ? "—" : totalJobs}
            </p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Success rate</p>
            <p className="text-2xl font-medium text-gray-900">
              {loading || successRate === null ? "—" : `${successRate}%`}
            </p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Plan</p>
            <p className="text-2xl font-medium text-gray-900 capitalize">
              {user?.tier ?? "—"}
            </p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Rate limit</p>
            <p className="text-2xl font-medium text-gray-900">
              {tierLimit}
              <span className="text-sm font-normal text-gray-400">/min</span>
            </p>
          </div>
        </div>

        {/* Rate limit bar */}
        {ratePct !== null && (
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-medium text-gray-600">
                Rate limit — this minute
              </p>
              <p className="text-xs text-gray-400">
                {rateLimit.remaining} / {rateLimit.limit} remaining
              </p>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  ratePct > 50
                    ? "bg-green-500"
                    : ratePct > 20
                    ? "bg-amber-400"
                    : "bg-red-500"
                }`}
                style={{ width: `${ratePct}%` }}
              />
            </div>
            {user?.tier !== "enterprise" && (
              <p className="text-xs text-gray-400 mt-2">
                Need more?{" "}
                <Link href="/settings" className="text-blue-600 hover:underline">
                  Upgrade your plan
                </Link>
              </p>
            )}
          </div>
        )}

        {/* Recent jobs */}
        <div className="bg-white border border-gray-100 rounded-xl">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">Recent jobs</p>
            <Link
              href="/jobs"
              className="text-xs text-blue-600 hover:underline"
            >
              View all
            </Link>
          </div>

          {loading ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">
              Loading…
            </div>
          ) : recentJobs.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-gray-400">No jobs yet.</p>
              <Link
                href="/playground"
                className="mt-2 inline-block text-xs text-blue-600 hover:underline"
              >
                Run your first execution
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-400 px-5 py-2.5">
                    Job ID
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400 px-3 py-2.5">
                    Language
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400 px-3 py-2.5">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400 px-3 py-2.5">
                    Runtime
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400 px-3 py-2.5">
                    Submitted
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentJobs.map((job) => (
                  <tr
                    key={job.id ?? job.job_id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-5 py-3 font-mono text-xs text-gray-500 truncate max-w-[140px]">
                      {job.id ?? job.job_id}
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {job.language}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          STATUS_STYLES[job.status]
                        }`}
                      >
                        {STATUS_LABEL[job.status]}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-500 tabular-nums">
                      {job.metrics != null
                        ? `${job.metrics.exec_time_ms}ms`
                        : "—"}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-400">
                      {timeAgo(job.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </PageShell>
  );
}