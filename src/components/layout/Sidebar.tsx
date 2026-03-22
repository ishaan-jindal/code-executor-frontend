"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { navItems } from "./navItems";

const TIER_COLORS: Record<string, string> = {
  free: "bg-gray-100 text-gray-600",
  starter: "bg-amber-50 text-amber-700",
  professional: "bg-blue-50 text-blue-700",
  enterprise: "bg-purple-50 text-purple-700",
};

export default function Sidebar() {
  const pathname = usePathname();
  const { user, isAdmin, isLoading } = useAuthStore();

  const visible = navItems.filter((item) =>
    item.adminOnly ? isAdmin : true
  );


  if (isLoading) {
    return (
      <aside className="w-52 shrink-0 border-r border-gray-100 bg-gray-50" />
    );
  }

  return (
    <aside className="w-52 shrink-0 border-r border-gray-100 bg-gray-50 flex flex-col h-full">
      <div className="px-4 py-4 border-b border-gray-100">
        <span className="text-base font-medium tracking-tight text-gray-900">
          exec<span className="text-blue-600">.run</span>
        </span>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {visible.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${active
                  ? "bg-white text-gray-900 border border-gray-200 font-medium shadow-sm"
                  : "text-gray-500 hover:text-gray-900 hover:bg-white"
                }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {user && (
        <div className="px-3 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-medium shrink-0">
              {user.username.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">
                {user.username}
              </p>
              <span
                className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full font-medium ${TIER_COLORS[user.tier] ?? TIER_COLORS.free
                  }`}
              >
                {user.tier}
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}