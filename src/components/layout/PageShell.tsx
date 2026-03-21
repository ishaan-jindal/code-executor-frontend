import Topnav from "./Topnav";
import { useRateLimit } from "@/lib/useRateLimit";

export default function PageShell({
  title,
  rateLimit,
  children,
}: {
  title: string;
  rateLimit?: ReturnType<typeof useRateLimit>["rateLimit"];
  children: React.ReactNode;
}) {
  return (
    <>
      <Topnav title={title} rateLimit={rateLimit} />
      <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
        {children}
      </main>
    </>
  );
}