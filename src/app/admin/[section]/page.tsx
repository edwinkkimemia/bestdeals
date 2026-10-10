import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Subsection pages folded into /admin live queues — redirect, no dead ends. */
export default function AdminSection() {
  redirect("/admin");
}
