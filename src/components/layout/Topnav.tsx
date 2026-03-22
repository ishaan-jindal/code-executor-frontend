"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { useRateLimit } from "@/lib/useRateLimit";

export default function Topnav({
  title,
  rateLimit,
}: {
  title: string;
  rateLimit?: ReturnType<typeof useRateLimit>["rateLimit"];
}) {
  const router = useRouter();
  const { logout } = useAuthStore();

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  const pct =
    rateLimit?.limit && rateLimit?.remaining != null
      ? Math.round((rateLimit.remaining / rateLimit.limit) * 100)
      : null;

  return (
    <header className="h-11 border-b border-gray-100 bg-white flex items-center px-5 gap-4 shrink-0">
      <h1 className="text-sm font-medium text-gray-900">{title}</h1>

      <div className="flex-1" />

      {pct !== null && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Rate limit</span>
          <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${pct > 50
                  ? "bg-green-500"
                  : pct > 20
                    ? "bg-amber-400"
                    : "bg-red-500"
                }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 tabular-nums">
            {rateLimit?.remaining}/{rateLimit?.limit}
          </span>
        </div>
      )}

      <button
        onClick={handleLogout}
        className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
      >
        Sign out
      </button>
    </header>
  );
}