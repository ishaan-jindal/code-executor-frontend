"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/auth";
import { authService } from "@/lib/services";
import { useRateLimit } from "@/lib/useRateLimit";
import PageShell from "@/components/layout/PageShell";
import api from "@/lib/api";

const TIER_LIMITS: Record<string, { requests: number; timeout: string }> = {
  free:         { requests: 10,  timeout: "2s"  },
  starter:      { requests: 50,  timeout: "2s"  },
  professional: { requests: 100, timeout: "10s" },
  enterprise:   { requests: 500, timeout: "30s" },
};

export default function SettingsPage() {
  const { user, logout } = useAuthStore();
  const { rateLimit } = useRateLimit();

  // Profile
  const [username, setUsername] = useState(user?.username ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Logout all
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);
  const [logoutAllSuccess, setLogoutAllSuccess] = useState("");

  // Delete account
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    setProfileLoading(true);
    try {
      await api.patch("/auth/me", { username, email });
      setProfileSuccess("Profile updated.");
    } catch (err: any) {
      setProfileError(err.response?.data?.error || "Failed to update profile.");
    } finally {
      setProfileLoading(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setPasswordLoading(true);
    try {
      await api.post("/auth/change-password", { currentPassword, newPassword });
      setPasswordSuccess("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordError(
        err.response?.data?.error || "Failed to update password."
      );
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleLogoutAll() {
    setLogoutAllLoading(true);
    try {
      await authService.logoutAll();
      setLogoutAllSuccess("All other sessions have been revoked.");
    } catch {
      // silently fail
    } finally {
      setLogoutAllLoading(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== user?.username) {
      setDeleteError(`Type your username "${user?.username}" to confirm.`);
      return;
    }
    setDeleteLoading(true);
    try {
      await api.delete("/auth/me");
      await logout();
    } catch (err: any) {
      setDeleteError(
        err.response?.data?.error || "Failed to delete account."
      );
      setDeleteLoading(false);
    }
  }

  const tierInfo = TIER_LIMITS[user?.tier ?? "free"];

  return (
    <PageShell title="Settings" rateLimit={rateLimit}>
      <div className="max-w-xl space-y-5">

        <div>
          <h2 className="text-lg font-medium text-gray-900">Settings</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage your profile and account security.
          </p>
        </div>

        {/* Plan info */}
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
            Current plan
          </p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 capitalize">
                {user?.tier ?? "free"}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {tierInfo.requests} req/min · {tierInfo.timeout} timeout
              </p>
            </div>
            {user?.tier !== "enterprise" && (
              
                <a
                  href="/pricing"
                  className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Upgrade
                </a>
              )}            
          </div>
        </div>

        {/* Profile */}
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
            Profile
          </p>
          <form onSubmit={handleProfileSave} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                minLength={3}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Email
              </label>
              <input
                title="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {profileSuccess && (
              <p className="text-xs text-green-600">{profileSuccess}</p>
            )}
            {profileError && (
              <p className="text-xs text-red-600">{profileError}</p>
            )}

            <button
              type="submit"
              disabled={profileLoading}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg transition-colors"
            >
              {profileLoading ? "Saving…" : "Save changes"}
            </button>
          </form>
        </div>

        {/* Password */}
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
            Password
          </p>
          <form onSubmit={handlePasswordChange} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Current password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                New password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="8+ characters"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Confirm new password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  confirmPassword && confirmPassword !== newPassword
                    ? "border-red-300"
                    : "border-gray-200"
                }`}
                placeholder="••••••••"
                required
              />
            </div>

            {passwordSuccess && (
              <p className="text-xs text-green-600">{passwordSuccess}</p>
            )}
            {passwordError && (
              <p className="text-xs text-red-600">{passwordError}</p>
            )}

            <button
              type="submit"
              disabled={passwordLoading}
              className="px-4 py-2 text-sm border border-gray-200 hover:bg-gray-50 disabled:opacity-50 text-gray-700 rounded-lg transition-colors"
            >
              {passwordLoading ? "Updating…" : "Update password"}
            </button>
          </form>
        </div>

        {/* Sessions */}
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
            Sessions
          </p>
          <p className="text-xs text-gray-500 mb-3">
            Sign out of all devices. Your current session will also end.
          </p>
          {logoutAllSuccess ? (
            <p className="text-xs text-green-600">{logoutAllSuccess}</p>
          ) : (
            <button
              onClick={handleLogoutAll}
              disabled={logoutAllLoading}
              className="px-4 py-2 text-sm border border-gray-200 hover:bg-gray-50 disabled:opacity-50 text-gray-700 rounded-lg transition-colors"
            >
              {logoutAllLoading ? "Revoking…" : "Sign out all devices"}
            </button>
          )}
        </div>

        {/* Danger zone */}
        <div className="bg-white border border-red-100 rounded-xl p-4">
          <p className="text-xs font-medium text-red-400 uppercase tracking-wide mb-1">
            Danger zone
          </p>
          <p className="text-xs text-gray-500 mb-3">
            Permanently delete your account and all associated data. This cannot
            be undone.
          </p>

          {!showDelete ? (
            <button
              onClick={() => setShowDelete(true)}
              className="px-4 py-2 text-sm border border-red-200 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
            >
              Delete account
            </button>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Type{" "}
                  <span className="font-mono text-gray-800">
                    {user?.username}
                  </span>{" "}
                  to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => {
                    setDeleteConfirm(e.target.value);
                    setDeleteError("");
                  }}
                  className="w-full px-3 py-2 text-sm border border-red-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-400"
                  placeholder={user?.username}
                />
              </div>

              {deleteError && (
                <p className="text-xs text-red-600">{deleteError}</p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                  className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-lg transition-colors"
                >
                  {deleteLoading ? "Deleting…" : "Delete my account"}
                </button>
                <button
                  onClick={() => {
                    setShowDelete(false);
                    setDeleteConfirm("");
                    setDeleteError("");
                  }}
                  className="px-3 py-2 text-sm border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </PageShell>
  );
}