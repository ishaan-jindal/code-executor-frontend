"use client";

import { useCallback, useEffect, useState } from "react";
import { authService } from "@/lib/services";
import { useRateLimit } from "@/lib/useRateLimit";
import PageShell from "@/components/layout/PageShell";
import { getApiErrorMessage } from "@/lib/errors";
import { timeAgo } from "@/lib/utils";
import { useToast } from "@/store/toast";
import type { ApiKey } from "@/lib/types";

export default function KeysPage() {
  const { rateLimit, capture } = useRateLimit();
  const toast = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);

  const loadKeys = useCallback(async () => {
    try { const res = await authService.listApiKeys(); capture(res); setKeys(res.data.data.keys ?? []); }
    catch { setError("Failed to load API keys."); } finally { setLoading(false); }
  }, [capture]);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); if (!newKeyName.trim()) return;
    setCreateError(""); setCreating(true);
    try {
      const res = await authService.generateApiKey(newKeyName.trim());
      const { key, keyId, name, createdAt } = res.data.data;
      setRevealedKey(key); setKeys((prev) => [{ keyId, name, createdAt }, ...prev]);
      setNewKeyName(""); setShowForm(false); toast.success("API key created.");
    } catch (err: unknown) { setCreateError(getApiErrorMessage(err, "Failed to create key.")); }
    finally { setCreating(false); }
  }

  async function handleRevoke(keyId: string) {
    setRevoking(true);
    try { await authService.revokeApiKey(keyId); setKeys((prev) => prev.filter((k) => k.keyId !== keyId)); setRevokingId(null); if (revealedKey) setRevealedKey(null); toast.success("Key revoked."); }
    catch { await loadKeys(); } finally { setRevoking(false); }
  }

  async function copyKey() {
    if (!revealedKey) return;
    await navigator.clipboard.writeText(revealedKey);
    toast.success("Copied to clipboard.");
  }

  return (
    <PageShell title="API Keys" rateLimit={rateLimit}>
      <div style={{ maxWidth: 700, display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>API Keys</h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "2px 0 0" }}>Authenticate via <code style={{ fontSize: 12, background: "rgba(255,255,255,0.04)", padding: "2px 6px", borderRadius: 4 }}>X-API-Key</code> header.</p>
          </div>
          {!showForm && <button onClick={() => { setShowForm(true); setRevealedKey(null); }} className="btn-primary btn-sm">+ New key</button>}
        </div>

        {/* Revealed key */}
        {revealedKey && (
          <div className="animate-fade-in-fast" style={{ background: "var(--green-muted)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "var(--radius-lg)", padding: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: "var(--green)", margin: "0 0 8px" }}>Copy your key now — it won&apos;t be shown again.</p>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <code style={{ flex: 1, fontSize: 12, fontFamily: "var(--font-jetbrains), monospace", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: "var(--radius-sm)", padding: "8px 12px", color: "var(--text-primary)", wordBreak: "break-all" }}>{revealedKey}</code>
              <button onClick={copyKey} className="btn-secondary btn-sm">Copy</button>
            </div>
          </div>
        )}

        {/* New key form */}
        {showForm && (
          <div className="glass-card-static animate-fade-in-fast" style={{ padding: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", margin: "0 0 12px" }}>New API key</p>
            <form onSubmit={handleCreate} style={{ display: "flex", gap: 8 }}>
              <input type="text" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="e.g. Production server" className="input-dark" style={{ flex: 1 }} autoFocus maxLength={64} />
              <button type="submit" disabled={creating || !newKeyName.trim()} className="btn-primary btn-sm">{creating ? "Creating…" : "Create"}</button>
              <button type="button" onClick={() => { setShowForm(false); setCreateError(""); setNewKeyName(""); }} className="btn-secondary btn-sm">Cancel</button>
            </form>
            {createError && <p style={{ fontSize: 12, color: "var(--red)", marginTop: 8 }}>{createError}</p>}
          </div>
        )}

        {/* Keys list */}
        <div className="glass-card-static" style={{ overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: "40px 20px", textAlign: "center" }}><div className="animate-shimmer" style={{ height: 20, borderRadius: 4, maxWidth: 200, margin: "0 auto" }} /></div>
          ) : error ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--red)", fontSize: 13 }}>{error}</div>
          ) : keys.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "0 0 8px" }}>No API keys yet.</p>
              <button onClick={() => setShowForm(true)} className="btn-ghost" style={{ color: "var(--accent-light)" }}>Create your first key</button>
            </div>
          ) : (
            <table className="table-dark">
              <thead><tr><th>Name</th><th>Key ID</th><th>Created</th><th>Last used</th><th></th></tr></thead>
              <tbody>
                {keys.map((key) => (
                  <tr key={key.keyId}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div className="status-dot" style={{ background: "var(--green)" }} />
                        <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>{key.name}</span>
                      </div>
                    </td>
                    <td><code style={{ fontSize: 11, color: "var(--text-muted)" }}>{key.keyId}</code></td>
                    <td style={{ color: "var(--text-muted)" }}>{timeAgo(key.createdAt)}</td>
                    <td style={{ color: "var(--text-muted)" }}>{key.lastUsedAt ? timeAgo(key.lastUsedAt) : "Never"}</td>
                    <td style={{ textAlign: "right" }}>
                      {revokingId === key.keyId ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Revoke?</span>
                          <button onClick={() => handleRevoke(key.keyId)} disabled={revoking} className="btn-danger btn-sm">{revoking ? "…" : "Confirm"}</button>
                          <button onClick={() => setRevokingId(null)} className="btn-secondary btn-sm">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setRevokingId(key.keyId)} className="btn-ghost btn-sm" style={{ color: "var(--text-muted)" }}>Revoke</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Usage example */}
        <div className="glass-card-static" style={{ padding: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)", margin: "0 0 8px" }}>Usage</p>
          <pre style={{ fontSize: 12, fontFamily: "var(--font-jetbrains), monospace", color: "var(--text-muted)", lineHeight: 1.6, overflowX: "auto", margin: 0 }}>{`curl -X POST ${process.env.NEXT_PUBLIC_API_URL}/submit \\
  -H "X-API-Key: sk_live_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"language":"python","code":"print(42)"}'`}</pre>
        </div>
      </div>
    </PageShell>
  );
}