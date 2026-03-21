"use client";

import { useEffect, useState } from "react";
import { authService } from "@/lib/services";
import { useRateLimit } from "@/lib/useRateLimit";
import PageShell from "@/components/layout/PageShell";

interface ApiKey {
  keyId: string;
  name: string;
  createdAt: number;
  lastUsedAt?: number | null;
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function KeysPage() {
  const { rateLimit, capture } = useRateLimit();

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // New key form
  const [showForm, setShowForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Revealed key after creation
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Revoke confirmation
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    loadKeys();
  }, []);

  async function loadKeys() {
    try {
      const res = await authService.listApiKeys();
      capture(res);
      setKeys(res.data.data.keys ?? []);
    } catch {
      setError("Failed to load API keys.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.SubmitEvent) {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setCreateError("");
    setCreating(true);
    try {
      const res = await authService.generateApiKey(newKeyName.trim());
      const { key, keyId, name, createdAt } = res.data.data;
      setRevealedKey(key);
      setKeys((prev) => [{ keyId, name, createdAt }, ...prev]);
      setNewKeyName("");
      setShowForm(false);
    } catch (err: any) {
      setCreateError(err.response?.data?.error || "Failed to create key.");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(keyId: string) {
    setRevoking(true);
    try {
      await authService.revokeApiKey(keyId);
      setKeys((prev) => prev.filter((k) => k.keyId !== keyId));
      setRevokingId(null);
      if (revealedKey) setRevealedKey(null);
    } catch {
      // silently fail — refresh to sync
      await loadKeys();
    } finally {
      setRevoking(false);
    }
  }

  async function copyKey() {
    if (!revealedKey) return;
    await navigator.clipboard.writeText(revealedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <PageShell title="API keys" rateLimit={rateLimit}>
      <div className="max-w-2xl space-y-5">

        {/* Header row */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">API keys</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Use keys to authenticate programmatic access via{" "}
              <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                X-API-Key
              </code>{" "}
              header.
            </p>
          </div>
          {!showForm && (
            <button
              onClick={() => {
                setShowForm(true);
                setRevealedKey(null);
              }}
              className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              + New key
            </button>
          )}
        </div>

        {/* Revealed key banner */}
        {revealedKey && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
            <p className="text-xs font-medium text-green-700">
              Copy your key now — it will never be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono bg-white border border-green-200 rounded-lg px-3 py-2 text-gray-800 break-all">
                {revealedKey}
              </code>
              <button
                onClick={copyKey}
                className="shrink-0 px-3 py-2 text-xs border border-green-300 bg-white hover:bg-green-50 text-green-700 rounded-lg transition-colors"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        )}

        {/* New key form */}
        {showForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm font-medium text-gray-900 mb-3">
              New API key
            </p>
            <form onSubmit={handleCreate} className="flex gap-2">
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g. Production server"
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                maxLength={64}
              />
              <button
                type="submit"
                disabled={creating || !newKeyName.trim()}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg transition-colors"
              >
                {creating ? "Creating…" : "Create"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setCreateError("");
                  setNewKeyName("");
                }}
                className="px-3 py-2 text-sm border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </form>
            {createError && (
              <p className="mt-2 text-xs text-red-600">{createError}</p>
            )}
          </div>
        )}

        {/* Keys list */}
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          {loading ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">
              Loading…
            </div>
          ) : error ? (
            <div className="px-5 py-8 text-center text-sm text-red-500">
              {error}
            </div>
          ) : keys.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-gray-400">No API keys yet.</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-2 text-xs text-blue-600 hover:underline"
              >
                Create your first key
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">
                    Name
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400 px-3 py-3">
                    Key ID
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400 px-3 py-3">
                    Created
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400 px-3 py-3">
                    Last used
                  </th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <tr
                    key={key.keyId}
                    className="border-b border-gray-50 last:border-0"
                  >
                    <td className="px-5 py-3 font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                        {key.name}
                      </div>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-gray-400">
                      {key.keyId}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-400">
                      {timeAgo(key.createdAt)}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-400">
                      {key.lastUsedAt ? timeAgo(key.lastUsedAt) : "Never"}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {revokingId === key.keyId ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-gray-500">
                            Revoke?
                          </span>
                          <button
                            onClick={() => handleRevoke(key.keyId)}
                            disabled={revoking}
                            className="text-xs px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg transition-colors"
                          >
                            {revoking ? "Revoking…" : "Confirm"}
                          </button>
                          <button
                            onClick={() => setRevokingId(null)}
                            className="text-xs px-2.5 py-1 border border-gray-200 hover:bg-gray-50 text-gray-500 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setRevokingId(key.keyId)}
                          className="text-xs px-2.5 py-1 border border-gray-200 hover:border-red-200 hover:text-red-600 text-gray-400 rounded-lg transition-colors"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Usage example */}
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-600 mb-2">Usage</p>
          <pre className="text-xs font-mono text-gray-500 leading-relaxed overflow-x-auto">{`curl -X POST ${process.env.NEXT_PUBLIC_API_URL}/submit \\
  -H "X-API-Key: sk_live_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"language":"python","code":"print(42)"}'`}</pre>
        </div>

      </div>
    </PageShell>
  );
}