import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getStore } from "@/lib/store";
import { DashboardSidebar } from "./sidebar";

export const metadata = { title: "Seller Dashboard", robots: { index: false, follow: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/auth/signin?next=/dashboard");
  const store = getStore();
  const fresh = await store.findUserById(user.id).catch(() => null);

  // Unread message count for the sidebar badge (best-effort).
  let unread = 0;
  try {
    const convos = await store.listConversations({
      userId: user.id,
      phone: fresh?.phone ?? user.phone,
      sellerName: fresh?.name ?? user.name,
    });
    unread = convos.reduce((s, c) => s + (c.unread ?? 0), 0);
  } catch {}

  return (
    <div className="container-bd">
      <div className="flex flex-col lg:flex-row lg:gap-8">
        <DashboardSidebar unread={unread} />
        <div className="min-w-0 flex-1 py-4 lg:py-8">{children}</div>
      </div>
    </div>
  );
}
