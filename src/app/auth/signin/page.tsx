"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signinSchema } from "@/lib/validators";

export default function SigninPage() {
  const router = useRouter();
  const [err, setErr] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(signinSchema),
  });

  return (
    <div className="container-bd max-w-md py-12">
      <h1 className="text-2xl font-bold">Welcome back</h1>
      <p className="text-sm text-ink-500">Sign in to manage listings, orders and messages.</p>
      <form
        className="card mt-5 space-y-3 p-5"
        onSubmit={handleSubmit(async (data) => {
          setErr("");
          const r = await fetch("/api/auth/signin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
          const j = await r.json();
          if (!r.ok) return setErr(j.error || "Sign-in failed");
          router.push(j.role === "ADMIN" ? "/admin" : "/dashboard");
          router.refresh();
        })}
      >
        <div><label className="label-bd" htmlFor="email">Email</label><input id="email" className="input-bd" type="email" {...register("email")} />{errors.email && <p className="text-xs text-red-600">{String(errors.email.message)}</p>}</div>
        <div><label className="label-bd" htmlFor="pw">Password</label><input id="pw" className="input-bd" type="password" {...register("password")} />{errors.password && <p className="text-xs text-red-600">{String(errors.password.message)}</p>}</div>
        {err && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{err}</p>}
        <button className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting ? "Signing in…" : "Sign in"}</button>
        <p className="text-center text-sm">New here? <Link href="/auth/signup" className="link-bd">Create an account</Link></p>
      </form>
    </div>
  );
}
