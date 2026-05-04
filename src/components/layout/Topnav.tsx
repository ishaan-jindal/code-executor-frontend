"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import type { RateLimit } from "@/lib/types";

export default function Topnav({
  title,
  rateLimit,
}: {
  title: string;
  rateLimit?: RateLimit;
}) {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  const pct =
    rateLimit?.limit && rateLimit?.remaining != null
      ? Math.round((rateLimit.remaining / rateLimit.limit) * 100)
      : null;

  return (
    <header
      style={{
        height: 52,
        borderBottom: "1px solid var(--border-default)",
        background: "var(--bg-surface)",
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        gap: 16,
        flexShrink: 0,
      }}
    >
      <h1
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "var(--text-primary)",
          margin: 0,
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h1>

      <div style={{ flex: 1 }} />

      {/* Rate limit pill */}
      {pct !== null && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "4px 12px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Rate
          </span>
          <div
            style={{
              width: 48,
              height: 4,
              background: "rgba(255,255,255,0.06)",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                borderRadius: 2,
                background:
                  pct > 50
                    ? "var(--green)"
                    : pct > 20
                      ? "var(--amber)"
                      : "var(--red)",
                width: `${pct}%`,
                transition: "width var(--transition-normal)",
              }}
            />
          </div>
          <span
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {rateLimit?.remaining}/{rateLimit?.limit}
          </span>
        </div>
      )}

      {/* User + Logout */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        {user && (
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid var(--border-default)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 500,
              color: "var(--text-secondary)",
            }}
          >
            {user.username.slice(0, 2).toUpperCase()}
          </div>
        )}
        <button
          onClick={handleLogout}
          className="btn-ghost btn-sm"
          style={{ fontSize: 12 }}
        >
          Sign out
        </button>
      </div>
    </header>
  );
}