"use client";

import { useEffect, useState, useCallback } from "react";
import { executionService } from "@/lib/services";
import { useRateLimit } from "@/lib/useRateLimit";
import PageShell from "@/components/layout/PageShell";
import { timeAgo, getJobId } from "@/lib/utils";
import { STATUS_LABEL, STATUS_DOT_COLOR } from "@/lib/constants";
import type { Job, JobStatus, Language } from "@/lib/types";

const PAGE_SIZE = 20;

export default function JobsPage() {
  const { rateLimit, capture } = useRateLimit();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<JobStatus | "">("");
  const [langFilter, setLangFilter] = useState<Language | "">("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobCode, setJobCode] = useState<string | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);

  const load = useCallback(async (p: number, status: JobStatus | "", lang: Language | "") => {
    setLoading(true); setError("");
    try {
      const res = await executionService.listJobs({ limit: PAGE_SIZE, offset: p * PAGE_SIZE, ...(status ? { status } : {}), ...(lang ? { language: lang } : {}) });
      capture(res);
      setJobs(res.data.data.jobs); setTotal(res.data.data.total);
    } catch { setError("Failed to load jobs."); } finally { setLoading(false); }
  }, [capture]);

  useEffect(() => { load(page, statusFilter, langFilter); }, [page, statusFilter, langFilter, load]);

  async function openJob(job: Job) {
    setSelectedJob(job); setJobCode(null); setCodeLoading(true);
    try { const res = await executionService.getJobCode(getJobId(job)); setJobCode(res.data.data.code ?? null); }
    catch { setJobCode(null); } finally { setCodeLoading(false); }
  }

  function handleFilterChange(status: JobStatus | "", lang: Language | "") {
    setPage(0); setStatusFilter(status); setLangFilter(lang); setSelectedJob(null);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <PageShell title="Job History" rateLimit={rateLimit}>
      <div style={{ maxWidth: 1100, display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Job History</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "2px 0 0" }}>All past executions. Click a row to inspect.</p>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <select title="statusfilter" value={statusFilter} onChange={(e) => handleFilterChange(e.target.value as JobStatus | "", langFilter)}
            className="input-dark" style={{ width: "auto", padding: "6px 10px", fontSize: 12 }}>
            <option value="">All statuses</option>
            <option value="ACCEPTED">Accepted</option><option value="RUNTIME_ERROR">Runtime error</option>
            <option value="COMPILE_ERROR">Compile error</option><option value="TIME_LIMIT_EXCEEDED">Timeout</option>
            <option value="QUEUED">Queued</option><option value="RUNNING">Running</option>
          </select>
          <select title="langfilter" value={langFilter} onChange={(e) => handleFilterChange(statusFilter, e.target.value as Language | "")}
            className="input-dark" style={{ width: "auto", padding: "6px 10px", fontSize: 12 }}>
            <option value="">All languages</option><option value="python">Python</option><option value="c">C</option>
          </select>
          {(statusFilter || langFilter) && <button onClick={() => handleFilterChange("", "")} className="btn-ghost btn-sm">Clear</button>}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{total} job{total !== 1 ? "s" : ""}</span>
        </div>

        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
          {/* Table */}
          <div className="glass-card-static" style={{ flex: 1, overflow: "hidden" }}>
            {loading ? (
              <div style={{ padding: "60px 20px", textAlign: "center" }}><div className="animate-shimmer" style={{ height: 20, borderRadius: 4, maxWidth: 200, margin: "0 auto" }} /></div>
            ) : error ? (
              <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--red)", fontSize: 13 }}>{error}</div>
            ) : jobs.length === 0 ? (
              <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No jobs found.</div>
            ) : (
              <>
                <table className="table-dark">
                  <thead><tr><th>Job ID</th><th>Lang</th><th>Status</th><th>Runtime</th><th>Submitted</th></tr></thead>
                  <tbody>
                    {jobs.map((job) => (
                      <tr key={getJobId(job)} onClick={() => openJob(job)} style={{ cursor: "pointer" }}
                        className={selectedJob && getJobId(selectedJob) === getJobId(job) ? "active" : ""}>
                        <td><code style={{ fontSize: 12, color: "var(--text-muted)" }}>{getJobId(job).slice(0, 8)}…</code></td>
                        <td><span className="badge" style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-secondary)" }}>{job.language}</span></td>
                        <td><span className="badge" style={{ background: `${STATUS_DOT_COLOR[job.status]}15`, color: STATUS_DOT_COLOR[job.status] }}>
                          <span className="status-dot" style={{ background: STATUS_DOT_COLOR[job.status] }} />{STATUS_LABEL[job.status]}</span></td>
                        <td style={{ fontVariantNumeric: "tabular-nums" }}>{job.metrics?.exec_time_ms != null ? `${job.metrics.exec_time_ms}ms` : "—"}</td>
                        <td style={{ color: "var(--text-muted)" }}>{timeAgo(job.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {totalPages > 1 && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderTop: "1px solid var(--border-default)" }}>
                    <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="btn-secondary btn-sm">Previous</button>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Page {page + 1} of {totalPages}</span>
                    <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="btn-secondary btn-sm">Next</button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Detail drawer */}
          {selectedJob && (
            <div className="glass-card-static animate-slide-in-right" style={{ width: 300, flexShrink: 0, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--border-default)" }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", margin: 0 }}>Job Detail</p>
                <button onClick={() => setSelectedJob(null)} className="btn-ghost btn-sm">Close</button>
              </div>
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16, fontSize: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { l: "ID", v: getJobId(selectedJob) },
                    { l: "Status", v: STATUS_LABEL[selectedJob.status] },
                    { l: "Language", v: selectedJob.language },
                    { l: "Submitted", v: timeAgo(selectedJob.created_at) },
                  ].map((r) => (
                    <div key={r.l} style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>{r.l}</span>
                      <span style={{ color: "var(--text-secondary)", fontFamily: r.l === "ID" ? "var(--font-jetbrains), monospace" : undefined, maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.v}</span>
                    </div>
                  ))}
                </div>
                {selectedJob.metrics && (
                  <div>
                    <p style={{ color: "var(--text-muted)", fontWeight: 500, margin: "0 0 8px" }}>Metrics</p>
                    {[{ l: "Queue", v: `${selectedJob.metrics.queue_wait_ms}ms` }, { l: "Compile", v: `${selectedJob.metrics.compile_time_ms}ms` }, { l: "Execute", v: `${selectedJob.metrics.exec_time_ms}ms` }, { l: "Total", v: `${selectedJob.metrics.total_time_ms}ms` }].map((r) => (
                      <div key={r.l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ color: "var(--text-muted)" }}>{r.l}</span>
                        <span style={{ color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums", fontWeight: r.l === "Total" ? 500 : 400 }}>{r.v}</span>
                      </div>
                    ))}
                  </div>
                )}
                {selectedJob.results && selectedJob.results.length > 0 && (
                  <div>
                    <p style={{ color: "var(--text-muted)", fontWeight: 500, margin: "0 0 8px" }}>Output</p>
                    {selectedJob.results[0].stdout && <pre style={{ background: "rgba(255,255,255,0.03)", borderRadius: "var(--radius-sm)", padding: 10, fontSize: 11, fontFamily: "var(--font-jetbrains), monospace", color: "var(--text-secondary)", lineHeight: 1.5, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 120, overflowY: "auto", margin: 0 }}>{selectedJob.results[0].stdout}</pre>}
                    {selectedJob.results[0].stderr && <pre style={{ marginTop: 8, background: "var(--red-muted)", borderRadius: "var(--radius-sm)", padding: 10, fontSize: 11, fontFamily: "var(--font-jetbrains), monospace", color: "var(--red)", lineHeight: 1.5, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 120, overflowY: "auto" }}>{selectedJob.results[0].stderr}</pre>}
                  </div>
                )}
                <div>
                  <p style={{ color: "var(--text-muted)", fontWeight: 500, margin: "0 0 8px" }}>Code</p>
                  {codeLoading ? <p style={{ color: "var(--text-muted)" }}>Loading…</p> : jobCode ? <pre style={{ background: "rgba(255,255,255,0.03)", borderRadius: "var(--radius-sm)", padding: 10, fontSize: 11, fontFamily: "var(--font-jetbrains), monospace", color: "var(--text-secondary)", lineHeight: 1.5, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 160, overflowY: "auto", margin: 0 }}>{jobCode}</pre> : <p style={{ color: "var(--text-muted)", margin: 0 }}>Not available.</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}