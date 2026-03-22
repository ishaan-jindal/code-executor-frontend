"use client";

import { useState, useRef } from "react";
import { executionService, Language, JobStatus } from "@/lib/services";
import { useRateLimit } from "@/lib/useRateLimit";
import PageShell from "@/components/layout/PageShell";

const STATUS_LABEL: Record<JobStatus, string> = {
    ACCEPTED: "Accepted",
    RUNTIME_ERROR: "Runtime error",
    COMPILE_ERROR: "Compile error",
    TIME_LIMIT_EXCEEDED: "Time limit exceeded",
    QUEUED: "Queued",
    RUNNING: "Running",
};

const STATUS_STYLES: Record<JobStatus, string> = {
    ACCEPTED: "bg-green-50 text-green-700 border-green-200",
    RUNTIME_ERROR: "bg-red-50 text-red-700 border-red-200",
    COMPILE_ERROR: "bg-red-50 text-red-700 border-red-200",
    TIME_LIMIT_EXCEEDED: "bg-amber-50 text-amber-700 border-amber-200",
    QUEUED: "bg-gray-100 text-gray-600 border-gray-200",
    RUNNING: "bg-blue-50 text-blue-700 border-blue-200",
};

const TERMINAL_STATUSES: JobStatus[] = [
    "ACCEPTED",
    "RUNTIME_ERROR",
    "COMPILE_ERROR",
    "TIME_LIMIT_EXCEEDED",
];

const EXAMPLES: Record<Language, string> = {
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

interface RunResult {
    jobId: string;
    status: JobStatus;
    stdout: string;
    stderr: string;
    metrics: {
        queue_wait_ms: number;
        compile_time_ms: number;
        exec_time_ms: number;
        total_time_ms: number;
    } | null;
}

const POLL_INTERVAL_MS = 800;
const MAX_POLLS = 30; // 24 seconds max

export default function PlaygroundPage() {
    const { rateLimit, capture } = useRateLimit();

    const [language, setLanguage] = useState<Language>("python");
    const [code, setCode] = useState(EXAMPLES.python);
    const [stdin, setStdin] = useState("");
    const [showStdin, setShowStdin] = useState(false);

    const [running, setRunning] = useState(false);
    const [runStatus, setRunStatus] = useState<JobStatus | null>(null);
    const [result, setResult] = useState<RunResult | null>(null);
    const [error, setError] = useState("");

    const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pollCount = useRef(0);

    function stopPolling() {
        if (pollRef.current) {
            clearTimeout(pollRef.current);
            pollRef.current = null;
        }
    }

    async function poll(jobId: string) {
        if (pollCount.current >= MAX_POLLS) {
            stopPolling();
            setRunning(false);
            setError("Timed out waiting for result. The job may still be running.");
            return;
        }

        pollCount.current += 1;

        try {
            const res = await executionService.getResult(jobId);
            const job = res.data.data;
            const status = job.status;

            setRunStatus(status);

            if (TERMINAL_STATUSES.includes(status)) {
                stopPolling();
                setRunning(false);
                const firstResult = job.results?.[0];
                setResult({
                    jobId,
                    status,
                    stdout: firstResult?.stdout ?? "",
                    stderr: firstResult?.stderr ?? "",
                    metrics: job.metrics ?? null,
                });
                return;
            }

            // Not terminal yet — keep polling
            pollRef.current = setTimeout(() => poll(jobId), POLL_INTERVAL_MS);
        } catch {
            stopPolling();
            setRunning(false);
            setError("Failed to fetch job result.");
        }
    }

    async function handleRun() {
        if (running) return;
        if (!code.trim()) return;

        stopPolling();
        pollCount.current = 0;
        setRunning(true);
        setRunStatus(null);
        setResult(null);
        setError("");

        try {
            const res = await executionService.submit(
                language,
                code,
                stdin.trim() || undefined
            );
            capture(res);
            const jobId = res.data.data.job_id;
            setRunStatus("QUEUED");
            pollRef.current = setTimeout(() => poll(jobId), POLL_INTERVAL_MS);
        } catch (err: any) {
            setRunning(false);
            if (err.response?.status === 429) {
                setError("Rate limit reached. Wait a moment before running again.");
            } else {
                setError(err.response?.data?.error || "Failed to submit code.");
            }
        }
    }

    function handleLanguageChange(lang: Language) {
        setLanguage(lang);
        setCode(EXAMPLES[lang]);
        setResult(null);
        setRunStatus(null);
        setError("");
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        // Ctrl+Enter or Cmd+Enter to run
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            handleRun();
        }
        // Tab inserts spaces instead of focus change
        if (e.key === "Tab") {
            e.preventDefault();
            const el = e.currentTarget;
            const start = el.selectionStart;
            const end = el.selectionEnd;
            const newCode =
                code.substring(0, start) + "  " + code.substring(end);
            setCode(newCode);
            requestAnimationFrame(() => {
                el.selectionStart = el.selectionEnd = start + 2;
            });
        }
    }

    return (
        <PageShell title="Playground" rateLimit={rateLimit}>
            <div className="max-w-5xl space-y-4">

                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-medium text-gray-900">Playground</h2>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Write and run code against your API.{" "}
                            <span className="text-gray-400">
                                Ctrl+Enter to run.
                            </span>
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Language selector */}
                        <div className="flex border border-gray-200 rounded-lg overflow-hidden text-xs">
                            {(["python", "c"] as Language[]).map((lang) => (
                                <button
                                    key={lang}
                                    onClick={() => handleLanguageChange(lang)}
                                    className={`px-3 py-1.5 transition-colors ${language === lang
                                        ? "bg-gray-900 text-white"
                                        : "bg-white text-gray-600 hover:bg-gray-50"
                                        }`}
                                >
                                    {lang === "python" ? "Python 3.12" : "C (GCC 13)"}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={handleRun}
                            disabled={running || !code.trim()}
                            className="flex items-center gap-2 px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg transition-colors"
                        >
                            {running ? (
                                <>
                                    <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                    {runStatus ? STATUS_LABEL[runStatus] : "Submitting…"}
                                </>
                            ) : (
                                <>
                                    <span className="w-0 h-0 border-t-4 border-b-4 border-l-6 border-transparent border-l-white" />
                                    Run
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">

                    {/* Editor pane */}
                    <div className="space-y-2">
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50">
                                <span className="text-xs font-medium text-gray-500">
                                    {language === "python" ? "solution.py" : "solution.c"}
                                </span>
                                <button
                                    onClick={() => setCode(EXAMPLES[language])}
                                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    Reset example
                                </button>
                            </div>
                            <textarea
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                onKeyDown={handleKeyDown}
                                spellCheck={false}
                                className="w-full h-80 px-4 py-3 text-xs font-mono text-gray-800 bg-white resize-none focus:outline-none leading-relaxed"
                                placeholder="Write your code here…"
                            />
                        </div>

                        {/* Stdin toggle */}
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                            <button
                                onClick={() => setShowStdin((s) => !s)}
                                className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
                            >
                                <span className="font-medium">stdin</span>
                                <span className="text-gray-400">
                                    {showStdin ? "▲ hide" : "▼ show"}
                                </span>
                            </button>
                            {showStdin && (
                                <textarea
                                    value={stdin}
                                    onChange={(e) => setStdin(e.target.value)}
                                    placeholder="Input passed to your program via stdin…"
                                    className="w-full h-20 px-4 py-2 text-xs font-mono text-gray-700 bg-white border-t border-gray-100 resize-none focus:outline-none"
                                />
                            )}
                        </div>
                    </div>

                    {/* Output pane */}
                    <div className="space-y-2">

                        {/* Status + metrics */}
                        {(runStatus || result) && (
                            <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs font-medium ${result
                                ? STATUS_STYLES[result.status]
                                : "bg-blue-50 text-blue-700 border-blue-200"
                                }`}>
                                <span>
                                    {result
                                        ? STATUS_LABEL[result.status]
                                        : runStatus
                                            ? STATUS_LABEL[runStatus]
                                            : ""}
                                </span>
                                {result?.metrics && (
                                    <span className="font-normal opacity-80">
                                        {result.metrics.exec_time_ms}ms exec ·{" "}
                                        {result.metrics.queue_wait_ms}ms queue ·{" "}
                                        {result.metrics.total_time_ms}ms total
                                    </span>
                                )}
                            </div>
                        )}

                        {/* stdout */}
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                            <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
                                <span className="text-xs font-medium text-gray-500">stdout</span>
                            </div>
                            <pre className="px-4 py-3 text-xs font-mono text-gray-800 leading-relaxed min-h-32 max-h-64 overflow-y-auto whitespace-pre-wrap break-words">
                                {running && !result ? (
                                    <span className="text-gray-400 animate-pulse">
                                        Waiting for output…
                                    </span>
                                ) : result?.stdout ? (
                                    result.stdout
                                ) : result ? (
                                    <span className="text-gray-400">No output.</span>
                                ) : (
                                    <span className="text-gray-400">
                                        Output will appear here.
                                    </span>
                                )}
                            </pre>
                        </div>

                        {/* stderr */}
                        {(result?.stderr || result?.status === "COMPILE_ERROR") && (
                            <div className="bg-white border border-red-100 rounded-xl overflow-hidden">
                                <div className="px-4 py-2 border-b border-red-100 bg-red-50">
                                    <span className="text-xs font-medium text-red-600">
                                        stderr
                                    </span>
                                </div>
                                <pre className="px-4 py-3 text-xs font-mono text-red-700 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap break-words">
                                    {result.stderr || "No error output."}
                                </pre>
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                                {error}
                            </div>
                        )}

                        {/* API request preview */}
                        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                            <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
                                <span className="text-xs font-medium text-gray-500">
                                    Request preview
                                </span>
                            </div>
                            <pre className="px-4 py-3 text-xs font-mono text-gray-500 leading-relaxed overflow-x-auto">{`POST ${process.env.NEXT_PUBLIC_API_URL}/submit
Authorization: Bearer <token>
Content-Type: application/json

{
  "language": "${language}",
  "code": "${code.slice(0, 40).replace(/\n/g, "\\n")}${code.length > 40 ? "…" : ""}"${stdin ? `,\n  "stdin": "${stdin.slice(0, 30)}${stdin.length > 30 ? "…" : ""}"` : ""
                                }
}`}</pre>
                        </div>

                    </div>
                </div>
            </div>
        </PageShell>
    );
}
