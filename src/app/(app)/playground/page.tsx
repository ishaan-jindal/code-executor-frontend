"use client";

import { useState, useRef } from "react";
import { executionService } from "@/lib/services";
import { useRateLimit } from "@/lib/useRateLimit";
import PageShell from "@/components/layout/PageShell";
import { getApiErrorMessage, getApiStatus } from "@/lib/errors";
import { STATUS_LABEL, STATUS_DOT_COLOR, TERMINAL_STATUSES, CODE_EXAMPLES, POLL_INTERVAL_MS, MAX_POLLS } from "@/lib/constants";
import type { JobStatus, Language, JobMetrics } from "@/lib/types";

interface RunResult {
  jobId: string;
  status: JobStatus;
  stdout: string;
  stderr: string;
  metrics: JobMetrics | null;
}

export default function PlaygroundPage() {
  const { rateLimit, capture } = useRateLimit();
  const [language, setLanguage] = useState<Language>("python");
  const [code, setCode] = useState(CODE_EXAMPLES.python);
  const [stdin, setStdin] = useState("");
  const [showStdin, setShowStdin] = useState(false);
  const [running, setRunning] = useState(false);
  const [runStatus, setRunStatus] = useState<JobStatus | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState("");
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollCount = useRef(0);

  function stopPolling() {
    if (pollRef.current) { clearTimeout(pollRef.current); pollRef.current = null; }
  }

  async function poll(jobId: string) {
    if (pollCount.current >= MAX_POLLS) { stopPolling(); setRunning(false); setError("Timed out waiting for result."); return; }
    pollCount.current += 1;
    try {
      const res = await executionService.getResult(jobId);
      const job = res.data.data;
      setRunStatus(job.status);
      if (TERMINAL_STATUSES.includes(job.status)) {
        stopPolling(); setRunning(false);
        const r = job.results?.[0];
        setResult({ jobId, status: job.status, stdout: r?.stdout ?? "", stderr: r?.stderr ?? "", metrics: job.metrics ?? null });
        return;
      }
      pollRef.current = setTimeout(() => poll(jobId), POLL_INTERVAL_MS);
    } catch { stopPolling(); setRunning(false); setError("Failed to fetch job result."); }
  }

  async function handleRun() {
    if (running || !code.trim()) return;
    stopPolling(); pollCount.current = 0;
    setRunning(true); setRunStatus(null); setResult(null); setError("");
    try {
      const res = await executionService.submit(language, code, stdin.trim() || undefined);
      capture(res);
      setRunStatus("QUEUED");
      pollRef.current = setTimeout(() => poll(res.data.data.job_id), POLL_INTERVAL_MS);
    } catch (err: unknown) {
      setRunning(false);
      setError(getApiStatus(err) === 429 ? "Rate limit reached. Wait a moment." : getApiErrorMessage(err, "Failed to submit code."));
    }
  }

  function handleLanguageChange(lang: Language) {
    setLanguage(lang); setCode(CODE_EXAMPLES[lang]); setResult(null); setRunStatus(null); setError("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); handleRun(); }
    if (e.key === "Tab") {
      e.preventDefault();
      const el = e.currentTarget; const start = el.selectionStart; const end = el.selectionEnd;
      setCode(code.substring(0, start) + "  " + code.substring(end));
      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start + 2; });
    }
  }

  const cs = (s: JobStatus) => ({ bg: `${STATUS_DOT_COLOR[s]}12`, color: STATUS_DOT_COLOR[s], border: `${STATUS_DOT_COLOR[s]}25` });

  return (
    <PageShell title="Playground" rateLimit={rateLimit}>
      <div style={{ maxWidth: 1100, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Playground</h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "2px 0 0" }}>Write and run code. <span style={{ opacity: 0.6 }}>⌘+Enter to run.</span></p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
              {(["python", "c"] as Language[]).map((lang) => (
                <button key={lang} onClick={() => handleLanguageChange(lang)}
                  style={{ padding: "6px 14px", fontSize: 12, fontWeight: 500, border: "none", cursor: "pointer", transition: "all var(--transition-fast)", background: language === lang ? "rgba(255,255,255,0.1)" : "transparent", color: language === lang ? "var(--text-primary)" : "var(--text-muted)" }}>
                  {lang === "python" ? "Python 3.12" : "C (GCC 13)"}
                </button>
              ))}
            </div>
            <button onClick={handleRun} disabled={running || !code.trim()} className="btn-primary btn-sm" style={{ gap: 6 }}>
              {running ? (<><span style={{ width: 12, height: 12, border: "2px solid rgba(0,0,0,0.2)", borderTopColor: "#000", borderRadius: "50%", animation: "spin 0.6s linear infinite", display: "inline-block" }} />{runStatus ? STATUS_LABEL[runStatus] : "Submitting…"}</>) : (<><svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>Run</>)}
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Editor */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="glass-card-static" style={{ overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", borderBottom: "1px solid var(--border-subtle)", background: "rgba(255,255,255,0.02)" }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)", fontFamily: "var(--font-jetbrains), monospace" }}>{language === "python" ? "solution.py" : "solution.c"}</span>
                <button onClick={() => setCode(CODE_EXAMPLES[language])} className="btn-ghost btn-sm">Reset</button>
              </div>
              <textarea value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={handleKeyDown} spellCheck={false} className="code-area" style={{ height: 340 }} placeholder="Write your code here…" />
            </div>
            <div className="glass-card-static" style={{ overflow: "hidden" }}>
              <button onClick={() => setShowStdin((s) => !s)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", fontSize: 12, fontWeight: 500, color: "var(--text-muted)", background: "transparent", border: "none", cursor: "pointer" }}>
                <span>stdin</span><span style={{ fontSize: 10, opacity: 0.5 }}>{showStdin ? "▲" : "▼"}</span>
              </button>
              {showStdin && <textarea value={stdin} onChange={(e) => setStdin(e.target.value)} placeholder="Input via stdin…" className="code-area" style={{ height: 80, borderTop: "1px solid var(--border-subtle)" }} />}
            </div>
          </div>

          {/* Output */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(runStatus || result) && (() => {
              const s = result ? cs(result.status) : { bg: "rgba(6,182,212,0.1)", color: "var(--accent-light)", border: "rgba(6,182,212,0.2)" };
              return (
                <div className="animate-fade-in-fast" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderRadius: "var(--radius-md)", fontSize: 12, fontWeight: 500, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                  <span>{result ? STATUS_LABEL[result.status] : runStatus ? STATUS_LABEL[runStatus] : ""}</span>
                  {result?.metrics && <span style={{ fontWeight: 400, opacity: 0.8, fontSize: 11 }}>{result.metrics.exec_time_ms}ms exec · {result.metrics.queue_wait_ms}ms queue · {result.metrics.total_time_ms}ms total</span>}
                </div>
              );
            })()}

            <div className="glass-card-static" style={{ overflow: "hidden" }}>
              <div style={{ padding: "8px 16px", borderBottom: "1px solid var(--border-subtle)", background: "rgba(255,255,255,0.02)" }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)" }}>stdout</span>
              </div>
              <pre style={{ padding: 16, fontSize: 13, fontFamily: "var(--font-jetbrains), monospace", color: "var(--text-primary)", lineHeight: 1.6, minHeight: 140, maxHeight: 280, overflowY: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>
                {running && !result ? <span style={{ color: "var(--text-muted)" }}>Waiting for output…</span> : result?.stdout ? result.stdout : result ? <span style={{ color: "var(--text-muted)" }}>No output.</span> : <span style={{ color: "var(--text-muted)" }}>Output will appear here.</span>}
              </pre>
            </div>

            {(result?.stderr || result?.status === "COMPILE_ERROR") && (
              <div className="glass-card-static animate-fade-in-fast" style={{ overflow: "hidden", borderColor: "rgba(239,68,68,0.15)" }}>
                <div style={{ padding: "8px 16px", borderBottom: "1px solid rgba(239,68,68,0.1)", background: "var(--red-muted)" }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: "var(--red)" }}>stderr</span>
                </div>
                <pre style={{ padding: 16, fontSize: 13, fontFamily: "var(--font-jetbrains), monospace", color: "var(--red)", lineHeight: 1.6, maxHeight: 180, overflowY: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>{result.stderr || "No error output."}</pre>
              </div>
            )}

            {error && <div className="animate-fade-in-fast" style={{ padding: "12px 16px", fontSize: 13, color: "var(--red)", background: "var(--red-muted)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "var(--radius-md)" }}>{error}</div>}

            <div className="glass-card-static" style={{ overflow: "hidden" }}>
              <div style={{ padding: "8px 16px", borderBottom: "1px solid var(--border-subtle)", background: "rgba(255,255,255,0.02)" }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)" }}>Request preview</span>
              </div>
              <pre style={{ padding: 16, fontSize: 12, fontFamily: "var(--font-jetbrains), monospace", color: "var(--text-muted)", lineHeight: 1.6, overflowX: "auto", margin: 0 }}>{`POST ${process.env.NEXT_PUBLIC_API_URL}/submit
Content-Type: application/json

{
  "language": "${language}",
  "code": "${code.slice(0, 40).replace(/\n/g, "\\n")}${code.length > 40 ? "…" : ""}"${stdin ? `,\n  "inputs": ["${stdin.slice(0, 30)}${stdin.length > 30 ? "…" : ""}"]` : ""}
}`}</pre>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
