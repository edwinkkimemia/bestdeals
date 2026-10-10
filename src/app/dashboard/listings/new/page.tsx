import { redirect } from "next/navigation";

/** Legacy posting URL — the form now lives at /sell (type param preserved). */
export default function NewListingRedirect({ searchParams }: { searchParams: { type?: string } }) {
  const t = searchParams.type;
  redirect(t === "product" || t === "classified" || t === "service" ? `/sell?type=${t}` : "/sell");
}
