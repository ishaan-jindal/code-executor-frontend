"use client";

import { useEffect, useState, useCallback } from "react";
import { executionService, Job, JobStatus, Language } from "@/lib/services";
import { useRateLimit } from "@/lib/useRateLimit";
import PageShell from "@/components/layout/PageShell";

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

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const PAGE_SIZE = 20;

export default function JobsPage() {
  const { rateLimit, capture } = useRateLimit();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [statusFilter, setStatusFilter] = useState<JobStatus | "">("");
  const [langFilter, setLangFilter] = useState<Language | "">("");

  // Selected job for detail drawer
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobCode, setJobCode] = useState<string | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);

  const load = useCallback(
    async (p: number, status: JobStatus | "", lang: Language | "") => {
      setLoading(true);
      setError("");
      try {
        const res = await executionService.listJobs({
          limit: PAGE_SIZE,
          offset: p * PAGE_SIZE,
          ...(status ? { status } : {}),
          ...(lang ? { language: lang } : {}),
        });
        capture(res);
        const { jobs: fetched, total: t } = res.data.data;
        setJobs(fetched);
        setTotal(t);
      } catch {
        setError("Failed to load jobs.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    load(page, statusFilter, langFilter);
  }, [page, statusFilter, langFilter, load]);

  async function openJob(job: Job) {
    setSelectedJob(job);
    setJobCode(null);
    setCodeLoading(true);
    const id = job.id ?? job.job_id ?? "";
    try {
      const res = await executionService.getJobCode(id);
      setJobCode(res.data.data.code ?? null);
    } catch {
      setJobCode(null);
    } finally {
      setCodeLoading(false);
    }
  }

  function handleFilterChange(
    status: JobStatus | "",
    lang: Language | ""
  ) {
    setPage(0);
    setStatusFilter(status);
    setLangFilter(lang);
    setSelectedJob(null);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const jobId = (job: Job) => job.id ?? job.job_id ?? "—";

  return (
    <PageShell title="Job history" rateLimit={rateLimit}>
      <div className="max-w-5xl space-y-5">

        <div>
          <h2 className="text-lg font-medium text-gray-900">Job history</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            All your past executions. Click a row to inspect output and code.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <select
            title="statusfilter"
            value={statusFilter}
            onChange={(e) =>
              handleFilterChange(e.target.value as JobStatus | "", langFilter)
            }
            className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All statuses</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="RUNTIME_ERROR">Runtime error</option>
            <option value="COMPILE_ERROR">Compile error</option>
            <option value="TIME_LIMIT_EXCEEDED">Timeout</option>
            <option value="QUEUED">Queued</option>
            <option value="RUNNING">Running</option>
          </select>

          <select
            title="langfilter"
            value={langFilter}
            onChange={(e) =>
              handleFilterChange(statusFilter, e.target.value as Language | "")
            }
            className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All languages</option>
            <option value="python">Python</option>
            <option value="c">C</option>
          </select>

          {(statusFilter || langFilter) && (
            <button
              onClick={() => handleFilterChange("", "")}
              className="text-xs text-gray-400 hover:text-gray-700 transition-colors px-2 py-2"
            >
              Clear filters
            </button>
          )}

          <div className="flex-1" />

          <span className="text-xs text-gray-400">
            {total} job{total !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex gap-5 items-start">
          {/* Table */}
          <div className="flex-1 bg-white border border-gray-100 rounded-xl overflow-hidden">
            {loading ? (
              <div className="px-5 py-10 text-center text-sm text-gray-400">
                Loading…
              </div>
            ) : error ? (
              <div className="px-5 py-10 text-center text-sm text-red-500">
                {error}
              </div>
            ) : jobs.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-gray-400">
                No jobs found.
              </div>
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">
                        Job ID
                      </th>
                      <th className="text-left text-xs font-medium text-gray-400 px-3 py-3">
                        Lang
                      </th>
                      <th className="text-left text-xs font-medium text-gray-400 px-3 py-3">
                        Status
                      </th>
                      <th className="text-left text-xs font-medium text-gray-400 px-3 py-3">
                        Runtime
                      </th>
                      <th className="text-left text-xs font-medium text-gray-400 px-3 py-3">
                        Submitted
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => (
                      <tr
                        key={jobId(job)}
                        onClick={() => openJob(job)}
                        className={`border-b border-gray-50 last:border-0 cursor-pointer transition-colors ${
                          selectedJob &&
                          jobId(selectedJob) === jobId(job)
                            ? "bg-blue-50"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">
                          {jobId(job).slice(0, 8)}…
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
                          {job.metrics?.exec_time_ms != null
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

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-gray-400">
                      Page {page + 1} of {totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setPage((p) => Math.min(totalPages - 1, p + 1))
                      }
                      disabled={page >= totalPages - 1}
                      className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Detail drawer */}
          {selectedJob && (
            <div className="w-72 shrink-0 bg-white border border-gray-100 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <p className="text-xs font-medium text-gray-900">
                  Job detail
                </p>
                <button
                  onClick={() => setSelectedJob(null)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Close
                </button>
              </div>

              <div className="p-4 space-y-4 text-xs">
                {/* Meta */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">ID</span>
                    <span className="font-mono text-gray-600 truncate ml-2 max-w-[140px]">
                      {jobId(selectedJob)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status</span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-medium ${
                        STATUS_STYLES[selectedJob.status]
                      }`}
                    >
                      {STATUS_LABEL[selectedJob.status]}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Language</span>
                    <span className="text-gray-600">{selectedJob.language}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Submitted</span>
                    <span className="text-gray-600">
                      {timeAgo(selectedJob.created_at)}
                    </span>
                  </div>
                </div>

                {/* Metrics */}
                {selectedJob.metrics && (
                  <div>
                    <p className="text-gray-400 mb-2 font-medium">Metrics</p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Queue wait</span>
                        <span className="tabular-nums text-gray-600">
                          {selectedJob.metrics.queue_wait_ms}ms
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Compile</span>
                        <span className="tabular-nums text-gray-600">
                          {selectedJob.metrics.compile_time_ms}ms
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Execute</span>
                        <span className="tabular-nums text-gray-600">
                          {selectedJob.metrics.exec_time_ms}ms
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total</span>
                        <span className="tabular-nums font-medium text-gray-700">
                          {selectedJob.metrics.total_time_ms}ms
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Output */}
                {selectedJob.results && selectedJob.results.length > 0 && (
                  <div>
                    <p className="text-gray-400 mb-2 font-medium">Output</p>
                    {selectedJob.results[0].stdout && (
                      <pre className="bg-gray-50 rounded-lg p-2.5 text-gray-700 font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                        {selectedJob.results[0].stdout}
                      </pre>
                    )}
                    {selectedJob.results[0].stderr && (
                      <pre className="mt-2 bg-red-50 rounded-lg p-2.5 text-red-600 font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                        {selectedJob.results[0].stderr}
                      </pre>
                    )}
                  </div>
                )}

                {/* Code */}
                <div>
                  <p className="text-gray-400 mb-2 font-medium">Code</p>
                  {codeLoading ? (
                    <p className="text-gray-400">Loading…</p>
                  ) : jobCode ? (
                    <pre className="bg-gray-50 rounded-lg p-2.5 text-gray-700 font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                      {jobCode}
                    </pre>
                  ) : (
                    <p className="text-gray-400">Not available.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}