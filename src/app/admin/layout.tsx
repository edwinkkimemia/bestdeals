import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminSidebar } from "./sidebar";

export const metadata = { title: "Admin Dashboard", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/auth/signin?next=/admin");
  if (user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8">
      <div className="flex flex-row gap-3 lg:gap-5">
        <AdminSidebar />
        <div className="min-w-0 flex-1 py-4 lg:py-8">{children}</div>
      </div>
    </div>
  );
}
