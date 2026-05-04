"use client";

import { useToastStore } from "@/store/toast";

const ICONS: Record<string, string> = {
  success: "✓",
  error: "✕",
  info: "ℹ",
};

const COLORS: Record<string, { bg: string; border: string; text: string }> = {
  success: {
    bg: "rgba(34, 197, 94, 0.1)",
    border: "rgba(34, 197, 94, 0.25)",
    text: "#22c55e",
  },
  error: {
    bg: "rgba(239, 68, 68, 0.1)",
    border: "rgba(239, 68, 68, 0.25)",
    text: "#ef4444",
  },
  info: {
    bg: "rgba(6, 182, 212, 0.1)",
    border: "rgba(6, 182, 212, 0.25)",
    text: "#22d3ee",
  },
};

export default function ToastContainer() {
  const { toasts, remove } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => {
        const c = COLORS[toast.type];
        return (
          <div
            key={toast.id}
            className="animate-slide-in-up"
            style={{
              pointerEvents: "auto",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 16px",
              fontSize: 13,
              color: c.text,
              background: c.bg,
              border: `1px solid ${c.border}`,
              borderRadius: "var(--radius-md)",
              backdropFilter: "blur(12px)",
              maxWidth: 360,
              cursor: "pointer",
            }}
            onClick={() => remove(toast.id)}
          >
            <span style={{ fontSize: 15, fontWeight: 600, flexShrink: 0 }}>
              {ICONS[toast.type]}
            </span>
            <span style={{ color: "var(--text-secondary)", flex: 1 }}>
              {toast.message}
            </span>
          </div>
        );
      })}
    </div>
  );
}
