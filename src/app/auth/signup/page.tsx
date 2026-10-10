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
  const [err, setErr] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(signupSchema),
  });

  return (
    <div className="container-bd max-w-md py-12">
      <h1 className="text-2xl font-bold">Create your account</h1>
      <p className="text-sm text-ink-500">Free for buyers & individual sellers. Only necessary details collected.</p>
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
          router.push(next ?? (j.role === "ADMIN" ? "/admin" : "/dashboard"));
          router.refresh();
        })}
      >
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
