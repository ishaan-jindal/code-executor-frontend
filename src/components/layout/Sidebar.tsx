"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { navItems } from "./navItems";
import { TIER_ACCENT } from "@/lib/constants";

export default function Sidebar() {
  const pathname = usePathname();
  const { user, isAdmin, isLoading } = useAuthStore();

  const visible = navItems.filter((item) =>
    item.adminOnly ? isAdmin : true
  );

  if (isLoading) {
    return (
      <aside
        style={{
          width: 240,
          flexShrink: 0,
          background: "var(--bg-surface)",
          borderRight: "1px solid var(--border-default)",
        }}
      />
    );
  }

  return (
    <aside
      style={{
        width: 240,
        flexShrink: 0,
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border-default)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Brand */}
      <div
        style={{
          padding: "20px 20px 16px",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <Link href="/dashboard" style={{ textDecoration: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "var(--radius-sm)",
                background:
                  "linear-gradient(135deg, var(--accent), var(--accent-light))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
                color: "#000",
                flexShrink: 0,
              }}
            >
              R
            </div>
            <span
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "var(--text-primary)",
                letterSpacing: "-0.02em",
              }}
            >
              Runnix
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: "var(--text-muted)",
                background: "rgba(255,255,255,0.05)",
                padding: "2px 6px",
                borderRadius: 4,
                marginLeft: "auto",
              }}
            >
              BETA
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 12px",
        }}
      >
        {visible.map((item, i) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const showSection =
            item.section && (i === 0 || visible[i - 1]?.section !== item.section);

          return (
            <div key={item.href}>
              {showSection && (
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    padding: "16px 12px 6px",
                  }}
                >
                  {item.section}
                </div>
              )}
              <Link
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 13,
                  fontWeight: active ? 500 : 400,
                  color: active ? "var(--text-primary)" : "var(--text-secondary)",
                  background: active ? "rgba(255,255,255,0.06)" : "transparent",
                  textDecoration: "none",
                  transition: "all var(--transition-fast)",
                  position: "relative",
                  marginBottom: 2,
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                    e.currentTarget.style.color = "var(--text-primary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }
                }}
              >
                {/* Active indicator */}
                {active && (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 3,
                      height: 16,
                      borderRadius: "0 3px 3px 0",
                      background: "var(--accent)",
                      boxShadow: "0 0 8px var(--accent-glow)",
                    }}
                  />
                )}
                {/* Icon */}
                <svg
                  width={16}
                  height={16}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flexShrink: 0, opacity: active ? 1 : 0.5 }}
                >
                  <path d={item.icon} />
                </svg>
                {item.label}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* User card */}
      {user && (
        <div
          style={{
            padding: "14px 16px",
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background:
                  "linear-gradient(135deg, var(--accent-glow), rgba(139,92,246,0.15))",
                border: "1px solid var(--border-default)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--accent-light)",
                flexShrink: 0,
              }}
            >
              {user.username.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  margin: 0,
                }}
              >
                {user.username}
              </p>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  marginTop: 2,
                }}
              >
                <div
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: TIER_ACCENT[user.tier] ?? "#6b7280",
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    textTransform: "capitalize",
                  }}
                >
                  {user.tier}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}