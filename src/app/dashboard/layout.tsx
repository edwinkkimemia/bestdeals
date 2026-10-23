import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getStore } from "@/lib/store";
import { DashboardSidebar } from "./sidebar";
import { PaymentStatusRefresh } from "@/components/payment-status-refresh";

export const metadata = { title: "Seller Dashboard", robots: { index: false, follow: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/auth/signin?next=/dashboard");
  const store = getStore();
  const fresh = await store.findUserById(user.id).catch(() => null);

  // Unread message + notification counts for the sidebar badges (best-effort).
  let unread = 0;
  let notifUnread = 0;
  try {
    const convos = await store.listConversations({
      userId: user.id,
      phone: fresh?.phone ?? user.phone,
      sellerName: fresh?.name ?? user.name,
    });
    unread = convos.reduce((s, c) => s + (c.unread ?? 0), 0);
  } catch {}
  try {
    notifUnread = await store.countUnreadNotifications(user.id);
  } catch {}

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8">
      <PaymentStatusRefresh />
      <div className="flex flex-row gap-3 lg:gap-8">
        <DashboardSidebar unread={unread} notifUnread={notifUnread} />
        <div className="min-w-0 flex-1 py-4 lg:py-8">{children}</div>
      </div>
    </div>
  );
}
