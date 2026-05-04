"use client";

import { useCallback, useEffect, useState } from "react";
import { webhookService } from "@/lib/services";
import { useRateLimit } from "@/lib/useRateLimit";
import PageShell from "@/components/layout/PageShell";
import { getApiErrorMessage } from "@/lib/errors";
import { timeAgo } from "@/lib/utils";
import { WEBHOOK_EVENTS } from "@/lib/constants";
import { useToast } from "@/store/toast";
import type { Webhook, WebhookDelivery } from "@/lib/types";

export default function WebhooksPage() {
  const { rateLimit, capture } = useRateLimit();
  const toast = useToast();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formUrl, setFormUrl] = useState("");
  const [formEvents, setFormEvents] = useState<string[]>(["job.completed"]);
  const [formSecret, setFormSecret] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadWebhooks = useCallback(async () => {
    try { const res = await webhookService.list(); capture(res); const raw = res.data.data; setWebhooks(Array.isArray(raw) ? raw : raw.webhooks ?? []); }
    catch { setError("Failed to load webhooks."); } finally { setLoading(false); }
  }, [capture]);

  useEffect(() => { loadWebhooks(); }, [loadWebhooks]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); if (!formUrl.trim() || formEvents.length === 0) return;
    setCreateError(""); setCreating(true);
    try {
      const res = await webhookService.create(formUrl.trim(), formEvents, formSecret.trim() || undefined);
      setWebhooks((prev) => [res.data.data, ...prev]); setShowForm(false);
      setFormUrl(""); setFormEvents(["job.completed"]); setFormSecret("");
      toast.success("Webhook created.");
    } catch (err: unknown) { setCreateError(getApiErrorMessage(err, "Failed to create webhook.")); }
    finally { setCreating(false); }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try { await webhookService.delete(id); setWebhooks((prev) => prev.filter((w) => w.id !== id)); setDeletingId(null); if (selectedWebhook?.id === id) setSelectedWebhook(null); toast.success("Webhook deleted."); }
    catch { await loadWebhooks(); } finally { setDeleting(false); }
  }

  async function openDeliveries(webhook: Webhook) {
    setSelectedWebhook(webhook); setDeliveries([]); setDeliveriesLoading(true);
    try { const res = await webhookService.getDeliveries(webhook.id); const raw = res.data.data; setDeliveries(Array.isArray(raw) ? raw : raw.deliveries ?? []); }
    catch { setDeliveries([]); } finally { setDeliveriesLoading(false); }
  }

  function toggleEvent(event: string) { setFormEvents((prev) => prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]); }

  return (
    <PageShell title="Webhooks" rateLimit={rateLimit}>
      <div style={{ maxWidth: 700, display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Webhooks</h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "2px 0 0" }}>Receive HTTP callbacks when jobs complete. HMAC-signed.</p>
          </div>
          {!showForm && <button onClick={() => setShowForm(true)} className="btn-primary btn-sm">+ Add webhook</button>}
        </div>

        {showForm && (
          <div className="glass-card-static animate-fade-in-fast" style={{ padding: 20 }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", margin: "0 0 16px" }}>New webhook</p>
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div><label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Endpoint URL</label>
                <input type="url" value={formUrl} onChange={(e) => setFormUrl(e.target.value)} placeholder="https://your-server.com/webhook" className="input-dark" required autoFocus /></div>
              <div><label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Events</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {WEBHOOK_EVENTS.map((event) => (
                    <button key={event} type="button" onClick={() => toggleEvent(event)}
                      style={{ fontSize: 12, padding: "5px 12px", borderRadius: "var(--radius-sm)", border: "1px solid", cursor: "pointer", transition: "all var(--transition-fast)",
                        background: formEvents.includes(event) ? "var(--accent-glow)" : "transparent",
                        borderColor: formEvents.includes(event) ? "var(--border-active)" : "var(--border-default)",
                        color: formEvents.includes(event) ? "var(--accent-light)" : "var(--text-muted)" }}>{event}</button>
                  ))}
                </div></div>
              <div><label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Secret <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(optional)</span></label>
                <input type="text" value={formSecret} onChange={(e) => setFormSecret(e.target.value)} placeholder="your-webhook-secret" className="input-dark" style={{ fontFamily: "var(--font-jetbrains), monospace" }} /></div>
              {createError && <p style={{ fontSize: 12, color: "var(--red)", margin: 0 }}>{createError}</p>}
              <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
                <button type="submit" disabled={creating || !formUrl.trim() || formEvents.length === 0} className="btn-primary btn-sm">{creating ? "Creating…" : "Create webhook"}</button>
                <button type="button" onClick={() => { setShowForm(false); setCreateError(""); }} className="btn-secondary btn-sm">Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="glass-card-static" style={{ overflow: "hidden" }}>
          {loading ? <div style={{ padding: "40px 20px", textAlign: "center" }}><div className="animate-shimmer" style={{ height: 20, borderRadius: 4, maxWidth: 200, margin: "0 auto" }} /></div>
          : error ? <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--red)", fontSize: 13 }}>{error}</div>
          : webhooks.length === 0 ? <div style={{ padding: "40px 20px", textAlign: "center" }}><p style={{ color: "var(--text-muted)", fontSize: 13, margin: "0 0 8px" }}>No webhooks registered.</p><button onClick={() => setShowForm(true)} className="btn-ghost" style={{ color: "var(--accent-light)" }}>Add your first webhook</button></div>
          : (
            <div>
              {webhooks.map((webhook) => (
                <div key={webhook.id} style={{ padding: 16, borderBottom: "1px solid var(--border-subtle)" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div className="status-dot" style={{ marginTop: 6, background: webhook.active ? "var(--green)" : "var(--text-muted)" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{webhook.url}</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                        {webhook.events.map((event) => <span key={event} className="badge" style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)", fontSize: 10 }}>{event}</span>)}
                      </div>
                      <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, marginBottom: 0 }}>Created {timeAgo(webhook.createdAt)}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      <button onClick={() => openDeliveries(webhook)} className="btn-secondary btn-sm">Deliveries</button>
                      {deletingId === webhook.id ? (
                        <><button onClick={() => handleDelete(webhook.id)} disabled={deleting} className="btn-danger btn-sm">{deleting ? "…" : "Confirm"}</button><button onClick={() => setDeletingId(null)} className="btn-secondary btn-sm">Cancel</button></>
                      ) : <button onClick={() => setDeletingId(webhook.id)} className="btn-ghost btn-sm" style={{ color: "var(--text-muted)" }}>Delete</button>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedWebhook && (
          <div className="glass-card-static animate-fade-in-fast" style={{ overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--border-default)" }}>
              <div><p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", margin: 0 }}>Deliveries</p><p style={{ fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedWebhook.url}</p></div>
              <button onClick={() => setSelectedWebhook(null)} className="btn-ghost btn-sm">Close</button>
            </div>
            {deliveriesLoading ? <div style={{ padding: "30px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Loading…</div>
            : deliveries.length === 0 ? <div style={{ padding: "30px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No deliveries yet.</div>
            : (
              <table className="table-dark">
                <thead><tr><th>Status</th><th>HTTP</th><th>Delivered</th><th>Error</th></tr></thead>
                <tbody>
                  {deliveries.map((d) => (
                    <tr key={d.id}>
                      <td><span className="badge" style={{ background: d.status === "success" ? "var(--green-muted)" : "var(--red-muted)", color: d.status === "success" ? "var(--green)" : "var(--red)" }}>{d.status}</span></td>
                      <td><code style={{ fontSize: 11, color: "var(--text-muted)" }}>{d.statusCode ?? "—"}</code></td>
                      <td style={{ color: "var(--text-muted)" }}>{timeAgo(d.timestamp)}</td>
                      <td style={{ color: "var(--text-muted)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.error ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        <div className="glass-card-static" style={{ padding: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)", margin: "0 0 8px" }}>Verifying signatures</p>
          <pre style={{ fontSize: 12, fontFamily: "var(--font-jetbrains), monospace", color: "var(--text-muted)", lineHeight: 1.6, overflowX: "auto", margin: 0 }}>{`import hmac, hashlib

def verify(payload: bytes, sig: str, secret: str) -> bool:
    expected = hmac.new(
        secret.encode(), payload, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, sig)`}</pre>
        </div>
      </div>
    </PageShell>
  );
}