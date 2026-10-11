"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signinSchema } from "@/lib/validators";
import { AuthShell, PasswordField } from "../components";

function safeNext(raw: string | null): string | null {
  if (!raw) return null;
  // Only allow internal paths — blocks open-redirects like //evil.com or https:…
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

function SigninForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = safeNext(sp.get("next"));
  const justReset = sp.get("reset") === "1";
  const [err, setErr] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(signinSchema),
  });

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to Chap"
      subtitle="Manage listings, track orders and message buyers — all in one place."
      panelHeading="Your hustle, picked up where you left off."
      points={[
        { title: "Seller dashboard", text: "Listings, orders, enquiries and payouts at a glance." },
        { title: "Buyers across 47 counties", text: "Your products in front of the whole country." },
        { title: "Safe by design", text: "Verified badges, moderation and cash-on-delivery protection." },
      ]}
    >
      {justReset && <p role="status" className="mb-3 rounded-xl bg-green-50 p-3 text-sm text-green-800">Password updated ✓ — sign in with your new password.</p>}
      <form
        className="space-y-4"
        onSubmit={handleSubmit(async (data) => {
          setErr("");
          const r = await fetch("/api/auth/signin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, email: data.email.trim().toLowerCase() }) });
          const j = await r.json();
          if (!r.ok) return setErr(j.error || "Sign-in failed");
          router.push(next ?? (j.role === "ADMIN" ? "/admin" : "/dashboard"));
          router.refresh();
        })}
      >
        <div>
          <label className="label-bd" htmlFor="email">Email address</label>
          <input id="email" className="input-bd" type="email" autoComplete="email" placeholder="you@example.co.ke" {...register("email")} />
          {errors.email && <p className="mt-1 text-xs text-red-600">{String(errors.email.message)}</p>}
        </div>
        <PasswordField
          id="pw"
          label="Password"
          autoComplete="current-password"
          field={register("password")}
          error={errors.password ? String(errors.password.message) : undefined}
        />
        <div className="flex justify-end">
          <Link href="/auth/password/request" className="link-bd text-sm">Forgot password?</Link>
        </div>
        {err && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
        <button className="btn-primary w-full !py-3" disabled={isSubmitting}>{isSubmitting ? "Signing in…" : "Sign in"}</button>
        <p className="text-center text-sm text-ink-500">
          New to Chap? <Link href={next ? `/auth/signup?next=${encodeURIComponent(next)}` : "/auth/signup"} className="link-bd font-semibold">Create a free account</Link>
        </p>
      </form>
    </AuthShell>
  );
}

export default function SigninPage() {
  return (
    <Suspense fallback={<div className="container-bd max-w-md py-12 text-sm text-ink-500">Loading…</div>}>
      <SigninForm />
    </Suspense>
  );
}
