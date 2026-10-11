import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminSidebar } from "./sidebar";

export const metadata = { title: "Admin Dashboard", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/auth/signin?next=/admin");
  if (user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="container-bd">
      <div className="flex gap-0 lg:gap-8">
        <AdminSidebar email={user.email} />
        <div className="min-w-0 flex-1 py-6 lg:py-8">{children}</div>
      </div>
    </div>
  );
}
