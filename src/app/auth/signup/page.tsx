"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema } from "@/lib/validators";

function safeNext(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

function SignupForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = safeNext(sp.get("next"));
  const initialKind = sp.get("kind") === "business" ? "business" : "individual";
  const [err, setErr] = useState("");
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: { sellerKind: initialKind } as never,
  });
  const kind = (watch("sellerKind") as string | undefined) ?? initialKind;

  return (
    <div className="container-bd max-w-md py-12">
      <h1 className="text-2xl font-bold">Create your account</h1>
      <p className="text-sm text-ink-500">Free for individuals. Businesses open a shop after verifying. Only necessary details collected.</p>
      <form
        className="card mt-5 space-y-3 p-5"
        onSubmit={handleSubmit(async (data) => {
          setErr("");
          const payload = {
            ...data,
            name: data.name.trim(),
            email: data.email.trim().toLowerCase(),
            phone: data.phone.trim(),
          };
          const r = await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
          const j = await r.json();
          if (!r.ok) return setErr(j.error || "Signup failed");
          if (j.role === "ADMIN") {
            router.push("/admin");
          } else if (next) {
            router.push(next);
          } else {
            // Businesses land on shop setup (with business verification preselected); individuals go to the dashboard.
            router.push(data.sellerKind === "business" ? "/dashboard/shop?new=business" : "/dashboard");
          }
          router.refresh();
        })}
      >
        <div>
          <span className="label-bd" id="kind-label">I&apos;m registering as</span>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby="kind-label">
            <label className={`cursor-pointer rounded-xl border p-3 text-sm ${kind === "individual" ? "border-brand-600 bg-brand-50" : "border-neutral-200"}`}>
              <input type="radio" value="individual" className="sr-only" {...register("sellerKind")} />
              <span className="font-bold">Individual</span>
              <span className="mt-0.5 block text-xs text-ink-500">Sell pre-owned & new items · verify with national ID</span>
            </label>
            <label className={`cursor-pointer rounded-xl border p-3 text-sm ${kind === "business" ? "border-brand-600 bg-brand-50" : "border-neutral-200"}`}>
              <input type="radio" value="business" className="sr-only" {...register("sellerKind")} />
              <span className="font-bold">Business</span>
              <span className="mt-0.5 block text-xs text-ink-500">Open a shop · verify with permit / KRA PIN</span>
            </label>
          </div>
        </div>
        <div><label className="label-bd" htmlFor="name">Full name</label><input id="name" className="input-bd" autoComplete="name" {...register("name")} />{errors.name && <p className="text-xs text-red-600">{String(errors.name.message)}</p>}</div>
        <div><label className="label-bd" htmlFor="email">Email</label><input id="email" className="input-bd" type="email" autoComplete="email" {...register("email")} />{errors.email && <p className="text-xs text-red-600">{String(errors.email.message)}</p>}</div>
        <div><label className="label-bd" htmlFor="phone">Phone (M-Pesa)</label><input id="phone" className="input-bd" placeholder="0712345678" autoComplete="tel" {...register("phone")} />{errors.phone && <p className="text-xs text-red-600">{String(errors.phone.message)}</p>}</div>
        <div><label className="label-bd" htmlFor="pw">Password (min 8 chars)</label><input id="pw" className="input-bd" type="password" autoComplete="new-password" {...register("password")} />{errors.password && <p className="text-xs text-red-600">{String(errors.password.message)}</p>}</div>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" {...register("acceptTerms")} className="mt-1" /> I accept the <Link href="/terms" className="link-bd">Terms</Link> and <Link href="/privacy" className="link-bd">Privacy Policy</Link>.</label>
        {errors.acceptTerms && <p className="text-xs text-red-600">You must accept the Terms</p>}
        {err && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{err}</p>}
        <button className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting ? "Creating…" : "Create account"}</button>
        <p className="text-center text-sm">Have an account? <Link href={next ? `/auth/signin?next=${encodeURIComponent(next)}` : "/auth/signin"} className="link-bd">Sign in</Link></p>
      </form>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="container-bd max-w-md py-12 text-sm text-ink-500">Loading…</div>}>
      <SignupForm />
    </Suspense>
  );
}
