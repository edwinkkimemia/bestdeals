import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getStorageHealth } from "@/lib/store";
import { AdminSidebar } from "./sidebar";

export const metadata = { title: "Admin Dashboard", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/auth/signin?next=/admin");
  if (user.role !== "ADMIN") redirect("/dashboard");
  const health = await getStorageHealth().catch(() => null);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8">
      {health && (health.mode === "demo" || !health.reachable) && (
        <p role="alert" className={`mt-4 rounded-xl p-3 text-sm font-semibold ${health.reachable ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-700"}`}>
          {health.reachable
            ? `⚠️ ${health.note} Queues may look empty — connect Postgres and run prisma migrate deploy for real data.`
            : `⛔ ${health.note} Queues below are empty fallbacks, not real zeros.`}
        </p>
      )}
      <div className="flex flex-row gap-3 lg:gap-8">
        <AdminSidebar />
        <div className="min-w-0 flex-1 py-4 lg:py-8">{children}</div>
      </div>
    </div>
  );
}
