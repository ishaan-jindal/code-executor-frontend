"use client";

import { useEffect, useState, useCallback } from "react";
import { adminService, publicService } from "@/lib/services";
import { useRateLimit } from "@/lib/useRateLimit";
import PageShell from "@/components/layout/PageShell";

interface AdminUser {
    id: string;
    username: string;
    email: string;
    tier: "free" | "starter" | "professional" | "enterprise";
    role: "user" | "admin";
    rateLimit: number;
    createdAt: number;
}

interface StatusData {
    jobs?: {
        submitted: number;
        completed: number;
        success_rate: string;
        jobs_per_second: string;
    };
    execution?: {
        average_ms: number;
        p95_ms: number;
    };
    queue?: {
        current_size: number;
        average_wait_time_ms: number;
    };
    workers?: {
        error_count: number;
    };
    system?: {
        redis_connected: boolean;
        memory_mb: number;
        error_rate: string;
    };
    uptime?: {
        human: string;
    };
}

const TIERS = ["free", "starter", "professional", "enterprise"] as const;

const TIER_STYLES: Record<string, string> = {
    free: "bg-gray-100 text-gray-600",
    starter: "bg-blue-50 text-blue-700",
    professional: "bg-purple-50 text-purple-700",
    enterprise: "bg-amber-50 text-amber-700",
};

function timeAgo(ts: number): string {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

const PAGE_SIZE = 20;

export default function AdminPage() {
    const { rateLimit } = useRateLimit();

    const [users, setUsers] = useState<AdminUser[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [usersLoading, setUsersLoading] = useState(true);
    const [usersError, setUsersError] = useState("");
    const [search, setSearch] = useState("");

    const [status, setStatus] = useState<StatusData | null>(null);

    // Upgrade
    const [upgradingId, setUpgradingId] = useState<string | null>(null);
    const [upgradeTier, setUpgradeTier] = useState<string>("professional");
    const [upgradeLoading, setUpgradeLoading] = useState(false);
    const [upgradeError, setUpgradeError] = useState("");
    const [upgradeSuccess, setUpgradeSuccess] = useState("");

    // Admin role toggle
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [toggleLoading, setToggleLoading] = useState(false);

    // Selected user detail
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

    const loadUsers = useCallback(async (p: number) => {
        setUsersLoading(true);
        setUsersError("");
        try {
            const res = await adminService.listUsers(p, PAGE_SIZE);
            const raw = res.data.data;
            setUsers(Array.isArray(raw) ? raw : raw.users ?? []);
            setTotal(raw.total ?? raw.length ?? 0);
        } catch {
            setUsersError("Failed to load users.");
        } finally {
            setUsersLoading(false);
        }
    }, []);

    async function loadHealth() {
        try {
            const [s] = await Promise.all([
                publicService.status(),
            ]);
            setStatus(s.data);
        } catch { }
    }

    useEffect(() => {
        loadUsers(page);
    }, [page, loadUsers]);

    useEffect(() => {
        loadHealth();
        const interval = setInterval(loadHealth, 15000);
        return () => clearInterval(interval);
    }, []);

    async function handleUpgrade(userId: string) {
        setUpgradeLoading(true);
        setUpgradeError("");
        setUpgradeSuccess("");
        try {
            await adminService.upgradeUser(userId, upgradeTier);
            setUpgradeSuccess(`User upgraded to ${upgradeTier}.`);
            setUsers((prev) =>
                prev.map((u) =>
                    u.id === userId ? { ...u, tier: upgradeTier as AdminUser["tier"] } : u
                )
            );
            if (selectedUser?.id === userId) {
                setSelectedUser((u) =>
                    u ? { ...u, tier: upgradeTier as AdminUser["tier"] } : u
                );
            }
            setTimeout(() => {
                setUpgradingId(null);
                setUpgradeSuccess("");
            }, 2000);
        } catch (err: any) {
            setUpgradeError(err.response?.data?.error || "Upgrade failed.");
        } finally {
            setUpgradeLoading(false);
        }
    }

    async function handleToggleAdmin(user: AdminUser) {
        setTogglingId(user.id);
        setToggleLoading(true);
        try {
            if (user.role === "admin") {
                await adminService.revokeAdmin(user.id);
            } else {
                await adminService.makeAdmin(user.id);
            }
            const newRole = user.role === "admin" ? "user" : "admin";
            setUsers((prev) =>
                prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
            );
            if (selectedUser?.id === user.id) {
                setSelectedUser((u) => (u ? { ...u, role: newRole } : u));
            }
        } catch { } finally {
            setTogglingId(null);
            setToggleLoading(false);
        }
    }

    const filtered = search.trim()
        ? users.filter(
            (u) =>
                u.username.toLowerCase().includes(search.toLowerCase()) ||
                u.email.toLowerCase().includes(search.toLowerCase())
        )
        : users;

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <PageShell title="Admin panel" rateLimit={rateLimit}>
            <div className="max-w-5xl space-y-5">

                <div>
                    <h2 className="text-lg font-medium text-gray-900">Admin panel</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Manage users, tiers, and monitor platform health.
                    </p>
                </div>

                {/* Health metrics */}
                <div className="grid grid-cols-4 gap-3">
                    <div className="bg-white border border-gray-100 rounded-xl p-4">
                        <p className="text-xs text-gray-400 mb-1">Redis</p>
                        <p className={`text-sm font-medium ${status?.system?.redis_connected ? "text-green-600" : "text-red-600"
                            }`}>
                            {status
                                ? status.system?.redis_connected
                                    ? "connected"
                                    : "disconnected"
                                : "—"}
                        </p>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-xl p-4">
                        <p className="text-xs text-gray-400 mb-1">Queue depth</p>
                        <p className="text-2xl font-medium text-gray-900">
                            {status?.queue?.current_size ?? "—"}
                        </p>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-xl p-4">
                        <p className="text-xs text-gray-400 mb-1">Memory</p>
                        <p className="text-2xl font-medium text-gray-900">
                            {status?.system?.memory_mb != null
                                ? `${status.system.memory_mb}mb`
                                : "—"}
                        </p>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-xl p-4">
                        <p className="text-xs text-gray-400 mb-1">Total users</p>
                        <p className="text-2xl font-medium text-gray-900">{total || "—"}</p>
                    </div>
                </div>

                {/* Second row of stats */}
                <div className="grid grid-cols-4 gap-3">
                    <div className="bg-white border border-gray-100 rounded-xl p-4">
                        <p className="text-xs text-gray-400 mb-1">Jobs submitted</p>
                        <p className="text-2xl font-medium text-gray-900">
                            {status?.jobs?.submitted ?? "—"}
                        </p>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-xl p-4">
                        <p className="text-xs text-gray-400 mb-1">Success rate</p>
                        <p className="text-2xl font-medium text-gray-900">
                            {status?.jobs?.success_rate ?? "—"}
                        </p>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-xl p-4">
                        <p className="text-xs text-gray-400 mb-1">Avg exec time</p>
                        <p className="text-2xl font-medium text-gray-900">
                            {status?.execution?.average_ms != null
                                ? `${status.execution.average_ms}ms`
                                : "—"}
                        </p>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-xl p-4">
                        <p className="text-xs text-gray-400 mb-1">Uptime</p>
                        <p className="text-2xl font-medium text-gray-900">
                            {status?.uptime?.human ?? "—"}
                        </p>
                    </div>
                </div>

                <div className="flex gap-5 items-start">

                    {/* Users table */}
                    <div className="flex-1 bg-white border border-gray-100 rounded-xl overflow-hidden">
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by username or email…"
                                className="flex-1 text-sm px-3 py-1.5 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-xs text-gray-400 shrink-0">
                                {total} users
                            </span>
                        </div>

                        {usersLoading ? (
                            <div className="px-5 py-10 text-center text-sm text-gray-400">
                                Loading…
                            </div>
                        ) : usersError ? (
                            <div className="px-5 py-10 text-center text-sm text-red-500">
                                {usersError}
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="px-5 py-10 text-center text-sm text-gray-400">
                                No users found.
                            </div>
                        ) : (
                            <>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100">
                                            <th className="text-left text-xs font-medium text-gray-400 px-4 py-3">
                                                User
                                            </th>
                                            <th className="text-left text-xs font-medium text-gray-400 px-3 py-3">
                                                Tier
                                            </th>
                                            <th className="text-left text-xs font-medium text-gray-400 px-3 py-3">
                                                Role
                                            </th>
                                            <th className="text-left text-xs font-medium text-gray-400 px-3 py-3">
                                                Joined
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map((user) => (
                                            <tr
                                                key={user.id}
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setUpgradingId(null);
                                                    setUpgradeError("");
                                                    setUpgradeSuccess("");
                                                }}
                                                className={`border-b border-gray-50 last:border-0 cursor-pointer transition-colors ${selectedUser?.id === user.id
                                                    ? "bg-blue-50"
                                                    : "hover:bg-gray-50"
                                                    }`}
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-medium shrink-0">
                                                            {user.username.slice(0, 2).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-medium text-gray-900">
                                                                {user.username}
                                                            </p>
                                                            <p className="text-xs text-gray-400">
                                                                {user.email}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3">
                                                    <span
                                                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIER_STYLES[user.tier]
                                                            }`}
                                                    >
                                                        {user.tier}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3">
                                                    <span
                                                        className={`text-xs px-2 py-0.5 rounded-full ${user.role === "admin"
                                                            ? "bg-purple-50 text-purple-700"
                                                            : "bg-gray-100 text-gray-500"
                                                            }`}
                                                    >
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 text-xs text-gray-400">
                                                    {timeAgo(user.createdAt)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                                        <button
                                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                                            disabled={page === 0}
                                            className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                                        >
                                            Previous
                                        </button>
                                        <span className="text-xs text-gray-400">
                                            Page {page + 1} of {totalPages}
                                        </span>
                                        <button
                                            onClick={() =>
                                                setPage((p) => Math.min(totalPages - 1, p + 1))
                                            }
                                            disabled={page >= totalPages - 1}
                                            className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* User detail panel */}
                    {selectedUser && (
                        <div className="w-64 shrink-0 bg-white border border-gray-100 rounded-xl overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                                <p className="text-xs font-medium text-gray-900">
                                    User detail
                                </p>
                                <button
                                    onClick={() => setSelectedUser(null)}
                                    className="text-xs text-gray-400 hover:text-gray-600"
                                >
                                    Close
                                </button>
                            </div>

                            <div className="p-4 space-y-4">
                                {/* Avatar + name */}
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium">
                                        {selectedUser.username.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">
                                            {selectedUser.username}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {selectedUser.email}
                                        </p>
                                    </div>
                                </div>

                                {/* Meta */}
                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">ID</span>
                                        <span className="font-mono text-gray-500 truncate ml-2 max-w-[110px]">
                                            {selectedUser.id}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Tier</span>
                                        <span
                                            className={`px-2 py-0.5 rounded-full font-medium ${TIER_STYLES[selectedUser.tier]
                                                }`}
                                        >
                                            {selectedUser.tier}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Role</span>
                                        <span
                                            className={`px-2 py-0.5 rounded-full ${selectedUser.role === "admin"
                                                ? "bg-purple-50 text-purple-700"
                                                : "bg-gray-100 text-gray-500"
                                                }`}
                                        >
                                            {selectedUser.role}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Rate limit</span>
                                        <span className="text-gray-600">
                                            {selectedUser.rateLimit}/min
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Joined</span>
                                        <span className="text-gray-600">
                                            {timeAgo(selectedUser.createdAt)}
                                        </span>
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 pt-4 space-y-3">
                                    {/* Upgrade tier */}
                                    {upgradingId === selectedUser.id ? (
                                        <div className="space-y-2">
                                            <label className="block text-xs font-medium text-gray-600">
                                                New tier
                                            </label>
                                            <select
                                                value={upgradeTier}
                                                onChange={(e) => setUpgradeTier(e.target.value)}
                                                className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                {TIERS.map((t) => (
                                                    <option key={t} value={t}>
                                                        {t}
                                                    </option>
                                                ))}
                                            </select>
                                            {upgradeSuccess && (
                                                <p className="text-xs text-green-600">
                                                    {upgradeSuccess}
                                                </p>
                                            )}
                                            {upgradeError && (
                                                <p className="text-xs text-red-600">{upgradeError}</p>
                                            )}
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleUpgrade(selectedUser.id)}
                                                    disabled={upgradeLoading}
                                                    className="flex-1 text-xs py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg transition-colors"
                                                >
                                                    {upgradeLoading ? "Saving…" : "Apply"}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setUpgradingId(null);
                                                        setUpgradeError("");
                                                    }}
                                                    className="flex-1 text-xs py-1.5 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-lg transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                setUpgradingId(selectedUser.id);
                                                setUpgradeTier(selectedUser.tier);
                                                setUpgradeError("");
                                                setUpgradeSuccess("");
                                            }}
                                            className="w-full text-xs py-1.5 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
                                        >
                                            Change tier
                                        </button>
                                    )}

                                    {/* Toggle admin */}
                                    <button
                                        onClick={() => handleToggleAdmin(selectedUser)}
                                        disabled={togglingId === selectedUser.id && toggleLoading}
                                        className={`w-full text-xs py-1.5 border rounded-lg transition-colors disabled:opacity-50 ${selectedUser.role === "admin"
                                            ? "border-red-200 hover:bg-red-50 text-red-600"
                                            : "border-gray-200 hover:bg-gray-50 text-gray-700"
                                            }`}
                                    >
                                        {togglingId === selectedUser.id && toggleLoading
                                            ? "Updating…"
                                            : selectedUser.role === "admin"
                                                ? "Revoke admin"
                                                : "Make admin"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </PageShell>
    );
}