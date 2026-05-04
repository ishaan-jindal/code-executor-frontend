"use client";

import { useEffect, useState, useCallback } from "react";
import { adminService, publicService } from "@/lib/services";
import { useRateLimit } from "@/lib/useRateLimit";
import PageShell from "@/components/layout/PageShell";
import { getApiErrorMessage } from "@/lib/errors";
import { timeAgo } from "@/lib/utils";
import { TIER_ACCENT } from "@/lib/constants";
import { useToast } from "@/store/toast";
import type { AdminUser, StatusData, UserTier } from "@/lib/types";

const TIERS: UserTier[] = ["free", "starter", "professional", "enterprise"];
const PAGE_SIZE = 20;

export default function AdminPage() {
  const { rateLimit } = useRateLimit();
  const toast = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusData | null>(null);
  const [upgradingId, setUpgradingId] = useState<string | null>(null);
  const [upgradeTier, setUpgradeTier] = useState<string>("professional");
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const loadUsers = useCallback(async (p: number) => {
    setUsersLoading(true); setUsersError("");
    try { const res = await adminService.listUsers(p, PAGE_SIZE); const raw = res.data.data; setUsers(Array.isArray(raw) ? raw : raw.users ?? []); setTotal(raw.total ?? raw.length ?? 0); }
    catch { setUsersError("Failed to load users."); } finally { setUsersLoading(false); }
  }, []);

  async function loadHealth() {
    try { const [s] = await Promise.all([publicService.status()]); setStatus(s.data); } catch { }
  }

  useEffect(() => { loadUsers(page); }, [page, loadUsers]);
  useEffect(() => { loadHealth(); const i = setInterval(loadHealth, 15000); return () => clearInterval(i); }, []);

  async function handleUpgrade(userId: string) {
    setUpgradeLoading(true);
    try {
      await adminService.upgradeUser(userId, upgradeTier);
      toast.success(`User upgraded to ${upgradeTier}.`);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, tier: upgradeTier as UserTier } : u));
      if (selectedUser?.id === userId) setSelectedUser((u) => u ? { ...u, tier: upgradeTier as UserTier } : u);
      setTimeout(() => setUpgradingId(null), 1000);
    } catch (err: unknown) { toast.error(getApiErrorMessage(err, "Upgrade failed.")); }
    finally { setUpgradeLoading(false); }
  }

  async function handleToggleAdmin(user: AdminUser) {
    setTogglingId(user.id); setToggleLoading(true);
    try {
      if (user.role === "admin") await adminService.revokeAdmin(user.id); else await adminService.makeAdmin(user.id);
      const newRole = user.role === "admin" ? "user" as const : "admin" as const;
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u)));
      if (selectedUser?.id === user.id) setSelectedUser((u) => (u ? { ...u, role: newRole } : u));
      toast.success(user.role === "admin" ? "Admin revoked." : "Admin granted.");
    } catch { toast.error("Failed to update role."); }
    finally { setTogglingId(null); setToggleLoading(false); }
  }

  async function handleDeleteUser(userId: string) {
    setDeleteLoading(true);
    try {
      await adminService.deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setDeletingId(null);
      if (selectedUser?.id === userId) setSelectedUser(null);
      toast.success("User deleted.");
    } catch (err: unknown) { toast.error(getApiErrorMessage(err, "Failed to delete user.")); }
    finally { setDeleteLoading(false); }
  }

  const filtered = search.trim() ? users.filter((u) => u.username.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())) : users;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const metricCard = (label: string, value: string | number | undefined, suffix?: string) => (
    <div className="glass-card glow-border" style={{ padding: "16px 18px" }}>
      <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px" }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 600, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
        {value ?? "—"}{suffix && <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text-muted)" }}>{suffix}</span>}
      </p>
    </div>
  );

  return (
    <PageShell title="Admin" rateLimit={rateLimit}>
      <div style={{ maxWidth: 1100, display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Admin Panel</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "2px 0 0" }}>Manage users, tiers, and monitor platform health.</p>
        </div>

        {/* Health metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {metricCard("Redis", status ? (status.system?.redis_connected ? "Connected" : "Down") : undefined)}
          {metricCard("Queue Depth", status?.queue?.current_size)}
          {metricCard("Memory", status?.system?.memory_mb, "MB")}
          {metricCard("Total Users", total || undefined)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {metricCard("Jobs Submitted", status?.jobs?.submitted)}
          {metricCard("Success Rate", status?.jobs?.success_rate)}
          {metricCard("Avg Exec", status?.execution?.average_ms, "ms")}
          {metricCard("Uptime", status?.uptime?.human)}
        </div>

        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
          {/* Users table */}
          <div className="glass-card-static" style={{ flex: 1, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid var(--border-default)" }}>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users…" className="input-dark" style={{ flex: 1, padding: "6px 10px", fontSize: 12 }} />
              <span style={{ fontSize: 12, color: "var(--text-muted)", flexShrink: 0 }}>{total} users</span>
            </div>
            {usersLoading ? <div style={{ padding: "60px 20px", textAlign: "center" }}><div className="animate-shimmer" style={{ height: 20, borderRadius: 4, maxWidth: 200, margin: "0 auto" }} /></div>
              : usersError ? <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--red)", fontSize: 13 }}>{usersError}</div>
                : filtered.length === 0 ? <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No users found.</div>
                  : (
                    <>
                      <table className="table-dark">
                        <thead><tr><th>User</th><th>Tier</th><th>Role</th><th>Joined</th></tr></thead>
                        <tbody>
                          {filtered.map((user) => (
                            <tr key={user.id} style={{ cursor: "pointer" }} className={selectedUser?.id === user.id ? "active" : ""}
                              onClick={() => { setSelectedUser(user); setUpgradingId(null); setDeletingId(null); }}>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "1px solid var(--border-default)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 500, color: "var(--text-secondary)", flexShrink: 0 }}>{user.username.slice(0, 2).toUpperCase()}</div>
                                  <div><p style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)", margin: 0 }}>{user.username}</p><p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>{user.email}</p></div>
                                </div>
                              </td>
                              <td><span className="badge" style={{ background: `${TIER_ACCENT[user.tier]}18`, color: TIER_ACCENT[user.tier] }}>{user.tier}</span></td>
                              <td><span className="badge" style={{ background: user.role === "admin" ? "var(--purple-muted)" : "rgba(255,255,255,0.04)", color: user.role === "admin" ? "var(--purple)" : "var(--text-muted)" }}>{user.role}</span></td>
                              <td style={{ color: "var(--text-muted)" }}>{timeAgo(user.createdAt)}</td>
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

          {/* User detail */}
          {selectedUser && (
            <div className="glass-card-static animate-slide-in-right" style={{ width: 280, flexShrink: 0, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--border-default)" }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", margin: 0 }}>User Detail</p>
                <button onClick={() => setSelectedUser(null)} className="btn-ghost btn-sm">Close</button>
              </div>
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "1px solid var(--border-default)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>{selectedUser.username.slice(0, 2).toUpperCase()}</div>
                  <div><p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", margin: 0 }}>{selectedUser.username}</p><p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>{selectedUser.email}</p></div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
                  {[{ l: "ID", v: selectedUser.id }, { l: "Tier", v: selectedUser.tier }, { l: "Role", v: selectedUser.role }, { l: "Rate", v: `${selectedUser.rateLimit}/min` }, { l: "Joined", v: timeAgo(selectedUser.createdAt) }].map((r) => (
                    <div key={r.l} style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>{r.l}</span>
                      <span style={{ color: "var(--text-secondary)", maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textTransform: r.l === "Tier" ? "capitalize" : undefined }}>{r.v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                  {upgradingId === selectedUser.id ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>New tier</label>
                      <select value={upgradeTier} onChange={(e) => setUpgradeTier(e.target.value)} className="input-dark" style={{ padding: "6px 10px", fontSize: 12 }}>
                        {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => handleUpgrade(selectedUser.id)} disabled={upgradeLoading} className="btn-primary btn-sm" style={{ flex: 1 }}>{upgradeLoading ? "…" : "Apply"}</button>
                        <button onClick={() => setUpgradingId(null)} className="btn-secondary btn-sm" style={{ flex: 1 }}>Cancel</button>
                      </div>
                    </div>
                  ) : <button onClick={() => { setUpgradingId(selectedUser.id); setUpgradeTier(selectedUser.tier); }} className="btn-secondary btn-sm" style={{ width: "100%" }}>Change tier</button>}

                  <button onClick={() => handleToggleAdmin(selectedUser)} disabled={togglingId === selectedUser.id && toggleLoading}
                    className={selectedUser.role === "admin" ? "btn-danger btn-sm" : "btn-secondary btn-sm"} style={{ width: "100%" }}>
                    {togglingId === selectedUser.id && toggleLoading ? "…" : selectedUser.role === "admin" ? "Revoke admin" : "Make admin"}
                  </button>

                  {deletingId === selectedUser.id ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => handleDeleteUser(selectedUser.id)} disabled={deleteLoading} className="btn-danger btn-sm" style={{ flex: 1 }}>{deleteLoading ? "…" : "Confirm delete"}</button>
                      <button onClick={() => setDeletingId(null)} className="btn-secondary btn-sm" style={{ flex: 1 }}>Cancel</button>
                    </div>
                  ) : <button onClick={() => setDeletingId(selectedUser.id)} className="btn-ghost btn-sm" style={{ width: "100%", color: "var(--red)" }}>Delete user</button>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}