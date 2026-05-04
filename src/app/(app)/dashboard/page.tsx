"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { executionService } from "@/lib/services";
import { useRateLimit } from "@/lib/useRateLimit";
import PageShell from "@/components/layout/PageShell";
import Link from "next/link";
import { timeAgo, getJobId } from "@/lib/utils";
import { STATUS_LABEL, STATUS_DOT_COLOR, TIER_LIMITS } from "@/lib/constants";
import type { Job } from "@/lib/types";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { rateLimit, capture } = useRateLimit();

  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await executionService.listJobs({ limit: 5 });
        capture(res);
        const { jobs, total } = res.data.data;
        setRecentJobs(jobs);
        setTotalJobs(total);
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [capture]);

  const tierConfig = TIER_LIMITS[user?.tier ?? "free"];
  const ratePct =
    rateLimit.remaining != null && rateLimit.limit != null
      ? Math.round((rateLimit.remaining / rateLimit.limit) * 100)
      : null;

  return (
    <PageShell title="Dashboard" rateLimit={rateLimit}>
      <div style={{ maxWidth: 900, display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Greeting */}
        <div>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: "var(--text-primary)",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Welcome back{user ? `, ${user.username}` : ""}.
          </h2>
          <p
            style={{
              fontSize: 14,
              color: "var(--text-muted)",
              margin: "4px 0 0",
            }}
          >
            Here&apos;s what&apos;s happening with your account.
          </p>
        </div>

        {/* Stat cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 14,
          }}
        >
          {[
            {
              label: "Total Executions",
              value: loading ? "—" : totalJobs.toLocaleString(),
            },
            {
              label: "Current Plan",
              value: user?.tier ?? "—",
              capitalize: true,
            },
            {
              label: "Rate Limit",
              value: `${tierConfig.requests}`,
              suffix: "/min",
            },
            {
              label: "Status",
              value: "Operational",
              dot: "var(--green)",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="glass-card glow-border"
              style={{ padding: "18px 20px" }}
            >
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  margin: "0 0 8px",
                }}
              >
                {stat.label}
              </p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                {stat.dot && (
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: stat.dot,
                      marginRight: 4,
                      flexShrink: 0,
                      animation: "pulse-glow 2s ease-in-out infinite",
                    }}
                  />
                )}
                <span
                  style={{
                    fontSize: 26,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    letterSpacing: "-0.02em",
                    textTransform: stat.capitalize ? "capitalize" : undefined,
                  }}
                >
                  {stat.value}
                </span>
                {stat.suffix && (
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 400,
                      color: "var(--text-muted)",
                    }}
                  >
                    {stat.suffix}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Rate limit bar */}
        {ratePct !== null && (
          <div className="glass-card-static" style={{ padding: "18px 20px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  margin: 0,
                }}
              >
                Rate limit — this minute
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  margin: 0,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {rateLimit.remaining} / {rateLimit.limit} remaining
              </p>
            </div>
            <div
              style={{
                height: 6,
                background: "rgba(255,255,255,0.06)",
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  borderRadius: 3,
                  background:
                    ratePct > 50
                      ? "var(--green)"
                      : ratePct > 20
                        ? "var(--amber)"
                        : "var(--red)",
                  width: `${ratePct}%`,
                  transition: "width 500ms ease",
                }}
              />
            </div>
            {user?.tier !== "enterprise" && (
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  margin: "10px 0 0",
                }}
              >
                Need more?{" "}
                <Link
                  href="/settings"
                  style={{
                    color: "var(--accent-light)",
                    textDecoration: "none",
                  }}
                >
                  Upgrade your plan
                </Link>
              </p>
            )}
          </div>
        )}

        {/* Recent jobs */}
        <div className="glass-card-static" style={{ overflow: "hidden" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 20px",
              borderBottom: "1px solid var(--border-default)",
            }}
          >
            <p
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              Recent jobs
            </p>
            <Link
              href="/jobs"
              style={{
                fontSize: 12,
                color: "var(--accent-light)",
                textDecoration: "none",
              }}
            >
              View all →
            </Link>
          </div>

          {loading ? (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <div className="animate-shimmer" style={{ height: 20, borderRadius: 4, maxWidth: 200, margin: "0 auto" }} />
            </div>
          ) : recentJobs.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 8px" }}>
                No jobs yet.
              </p>
              <Link
                href="/playground"
                style={{ fontSize: 13, color: "var(--accent-light)", textDecoration: "none" }}
              >
                Run your first execution →
              </Link>
            </div>
          ) : (
            <table className="table-dark">
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>Language</th>
                  <th>Status</th>
                  <th>Runtime</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {recentJobs.map((job) => (
                  <tr key={getJobId(job)}>
                    <td>
                      <code style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {getJobId(job).slice(0, 12)}…
                      </code>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {job.language}
                      </span>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: `${STATUS_DOT_COLOR[job.status]}15`,
                          color: STATUS_DOT_COLOR[job.status],
                        }}
                      >
                        <span
                          className="status-dot"
                          style={{ background: STATUS_DOT_COLOR[job.status] }}
                        />
                        {STATUS_LABEL[job.status]}
                      </span>
                    </td>
                    <td style={{ fontVariantNumeric: "tabular-nums" }}>
                      {job.metrics != null
                        ? `${job.metrics.exec_time_ms}ms`
                        : "—"}
                    </td>
                    <td style={{ color: "var(--text-muted)" }}>
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