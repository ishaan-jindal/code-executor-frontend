"use client";

import Topnav from "./Topnav";
import type { RateLimit } from "@/lib/types";

export default function PageShell({
  title,
  rateLimit,
  children,
}: {
  title: string;
  rateLimit?: RateLimit;
  children: React.ReactNode;
}) {
  return (
    <>
      <Topnav title={title} rateLimit={rateLimit} />
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 28,
          background: "var(--bg-root)",
        }}
      >
        <div className="animate-fade-in">{children}</div>
      </main>
    </>
  );
}