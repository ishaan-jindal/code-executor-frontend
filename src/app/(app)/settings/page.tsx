"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/auth";
import { authService } from "@/lib/services";
import { useRateLimit } from "@/lib/useRateLimit";
import PageShell from "@/components/layout/PageShell";
import { useToast } from "@/store/toast";
import { TIER_LIMITS } from "@/lib/constants";

export default function SettingsPage() {
  const { user, logout } = useAuthStore();
  const { rateLimit } = useRateLimit();
  const toast = useToast();

  const [username, setUsername] = useState(user?.username ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [profileLoading, setProfileLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [logoutAllLoading, setLogoutAllLoading] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault(); setProfileLoading(true);
    try { await authService.updateProfile({ username, email }); toast.success("Profile updated."); }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed to update profile."); }
    finally { setProfileLoading(false); }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) { toast.error("New password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match."); return; }
    setPasswordLoading(true);
    try { await authService.changePassword({ currentPassword, newPassword }); toast.success("Password updated."); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed to update password."); }
    finally { setPasswordLoading(false); }
  }

  async function handleLogoutAll() {
    setLogoutAllLoading(true);
    try { await authService.logoutAll(); toast.success("All sessions revoked."); }
    catch { toast.error("Failed to revoke sessions."); } finally { setLogoutAllLoading(false); }
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== user?.username) { toast.error(`Type "${user?.username}" to confirm.`); return; }
    setDeleteLoading(true);
    try { await authService.deleteMe(); await logout(); }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed to delete account."); setDeleteLoading(false); }
  }

  const tierConfig = TIER_LIMITS[user?.tier ?? "free"];

  const sectionStyle = { marginBottom: 0 } as const;
  const sectionTitleStyle = { fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.08em", margin: "0 0 14px" };

  return (
    <PageShell title="Settings" rateLimit={rateLimit}>
      <div style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Settings</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "2px 0 0" }}>Manage your profile and account security.</p>
        </div>

        {/* Plan */}
        <div className="glass-card-static" style={{ padding: 20, ...sectionStyle }}>
          <p style={sectionTitleStyle}>Current Plan</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", textTransform: "capitalize", margin: 0 }}>{user?.tier ?? "free"}</p>
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>{tierConfig.requests} req/min</p>
            </div>
            {user?.tier !== "enterprise" && <span className="badge" style={{ background: "var(--accent-glow)", color: "var(--accent-light)", border: "1px solid var(--border-active)" }}>Contact to upgrade</span>}
          </div>
        </div>

        {/* Profile */}
        <div className="glass-card-static" style={{ padding: 20, ...sectionStyle }}>
          <p style={sectionTitleStyle}>Profile</p>
          <form onSubmit={handleProfileSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div><label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Username</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="input-dark" minLength={3} required /></div>
            <div><label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-dark" required /></div>
            <button type="submit" disabled={profileLoading} className="btn-primary btn-sm" style={{ alignSelf: "flex-start" }}>{profileLoading ? "Saving…" : "Save changes"}</button>
          </form>
        </div>

        {/* Password */}
        <div className="glass-card-static" style={{ padding: 20, ...sectionStyle }}>
          <p style={sectionTitleStyle}>Password</p>
          <form onSubmit={handlePasswordChange} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div><label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Current password</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="input-dark" placeholder="••••••••" required /></div>
            <div><label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>New password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-dark" placeholder="8+ characters" required /></div>
            <div><label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Confirm</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input-dark" placeholder="••••••••" required
                style={{ borderColor: confirmPassword && confirmPassword !== newPassword ? "rgba(239,68,68,0.4)" : undefined }} /></div>
            <button type="submit" disabled={passwordLoading} className="btn-secondary btn-sm" style={{ alignSelf: "flex-start" }}>{passwordLoading ? "Updating…" : "Update password"}</button>
          </form>
        </div>

        {/* Sessions */}
        <div className="glass-card-static" style={{ padding: 20, ...sectionStyle }}>
          <p style={sectionTitleStyle}>Sessions</p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 12px" }}>Sign out of all devices. Your current session will also end.</p>
          <button onClick={handleLogoutAll} disabled={logoutAllLoading} className="btn-secondary btn-sm">{logoutAllLoading ? "Revoking…" : "Sign out all devices"}</button>
        </div>

        {/* Danger zone */}
        <div className="glass-card-static" style={{ padding: 20, borderColor: "rgba(239,68,68,0.15)" }}>
          <p style={{ ...sectionTitleStyle, color: "var(--red)" }}>Danger Zone</p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 12px" }}>Permanently delete your account and all associated data. This cannot be undone.</p>
          {!showDelete ? (
            <button onClick={() => setShowDelete(true)} className="btn-danger btn-sm">Delete account</button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div><label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Type <code style={{ fontFamily: "var(--font-jetbrains), monospace", color: "var(--text-primary)" }}>{user?.username}</code> to confirm</label>
                <input type="text" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} className="input-dark" style={{ borderColor: "rgba(239,68,68,0.3)" }} placeholder={user?.username} /></div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={handleDeleteAccount} disabled={deleteLoading} className="btn-danger btn-sm">{deleteLoading ? "Deleting…" : "Delete my account"}</button>
                <button onClick={() => { setShowDelete(false); setDeleteConfirm(""); }} className="btn-secondary btn-sm">Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}