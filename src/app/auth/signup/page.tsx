"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema } from "@/lib/validators";
import { AuthShell, PasswordField } from "../components";

function safeNext(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

function SignupForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = safeNext(sp.get("next"));
  const ref = (sp.get("ref") ?? "").trim();
  const initialKind = sp.get("kind") === "business" ? "business" : "individual";
  const [err, setErr] = useState("");
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: { sellerKind: initialKind } as never,
  });
  const kind = (watch("sellerKind") as string | undefined) ?? initialKind;
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docFile2, setDocFile2] = useState<File | null>(null);
  const isBusiness = kind === "business";

  const checkFile = (f: File): string | null => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) return "Document must be a JPG, PNG or WebP photo.";
    if (f.size > 5 * 1024 * 1024) return "Document photo must be 5MB or less.";
    return null;
  };

  const docInput = (
    id: string,
    label: string,
    file: File | null,
    setFile: (f: File | null) => void
  ) => (
    <div>
      <label className="label-bd" htmlFor={id}>
        {label} <span className="text-red-600">*</span>
      </label>
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="w-full text-sm text-ink-600 file:mr-3 file:rounded-xl file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
      />
      {file && (
        <p className="mt-1 flex items-center justify-between gap-2 text-xs text-ink-600">
          <span className="truncate">📎 {file.name} ({Math.max(1, Math.round(file.size / 1024))} KB)</span>
          <button type="button" onClick={() => setFile(null)} className="link-bd shrink-0">Remove</button>
        </p>
      )}
    </div>
  );

  return (
    <AuthShell
      eyebrow="Join free"
      title="Create your account"
      subtitle="Free for individuals and starters. Businesses open a shop after verifying."
      panelHeading="Sell to buyers in all 47 counties."
      points={[
        { title: "Free to start", text: "List products in minutes, straight from your phone." },
        { title: "Verified ✓ badge", text: "ID-checked sellers earn buyer trust and better placement." },
        { title: "Cash on delivery", text: "Buyers pay on arrival — no advance-payment scams." },
      ]}
    >
      {ref && (
        <p className="mb-4 rounded-xl bg-brand-50 p-3 text-sm text-brand-700">
          🎉 You were invited by a friend — verify your account and you both earn rewards (they get a free Featured boost).
        </p>
      )}
      <form
        className="space-y-4"
        onSubmit={handleSubmit(async (data) => {
          setErr("");
          const business = data.sellerKind === "business";
          if (!docFile) {
            return setErr(
              business
                ? "Please attach your business permit photo — it's required for verification."
                : "Please attach your national ID photo — it's required for verification."
            );
          }
          if (business && !docFile2) {
            return setErr("Please also attach the owner ID photo — businesses need both documents.");
          }
          for (const f of business ? [docFile, docFile2!] : [docFile]) {
            const problem = checkFile(f);
            if (problem) return setErr(problem);
          }
          const payload = {
            ...data,
            name: data.name.trim(),
            email: data.email.trim().toLowerCase(),
            phone: data.phone.trim(),
            ref,
          };
          const r = await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
          const j = await r.json();
          if (!r.ok) return setErr(j.error || "Signup failed");
          // Account created (and signed in) — now file the verification request.
          const goNext = () => {
            if (j.role === "ADMIN") {
              router.push("/admin");
            } else if (next) {
              router.push(next);
            } else {
              // Businesses land on shop setup (with business verification preselected); individuals go to the dashboard.
              router.push(data.sellerKind === "business" ? "/dashboard/shop?new=business" : "/dashboard");
            }
            router.refresh();
          };
          try {
            const fd = new FormData();
            fd.append("private", "1");
            fd.append("files", docFile);
            if (business && docFile2) fd.append("files", docFile2);
            const up = await fetch("/api/upload", { method: "POST", body: fd });
            const uj = await up.json();
            if (!up.ok) throw new Error(uj.error || "Document upload failed.");
            const v = await fetch("/api/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                kind: business ? "business" : "id",
                phone: payload.phone,
                docPath: uj.urls[0],
                fileName: docFile.name,
                ...(business && docFile2
                  ? { docPath2: uj.urls[1], fileName2: docFile2.name }
                  : {}),
              }),
            });
            const vj = await v.json();
            if (!v.ok) throw new Error(vj.error || "Verification filing failed.");
            goNext();
          } catch {
            // Account exists — land on Verification to retry the document step.
            router.push(data.sellerKind === "business" ? "/dashboard/verify?kind=business" : "/dashboard/verify");
            router.refresh();
          }
        })}
      >
        <div>
          <span className="label-bd" id="kind-label">I&apos;m registering as</span>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby="kind-label">
            <label className={`cursor-pointer rounded-xl border-2 p-3 text-sm transition ${kind === "individual" ? "border-brand-600 bg-brand-50" : "border-neutral-200 hover:border-neutral-300"}`}>
              <input type="radio" value="individual" className="sr-only" {...register("sellerKind")} />
              <span className="font-bold">Individual</span>
              <span className="mt-0.5 block text-xs text-ink-500">Sell pre-owned & new · ID verification</span>
            </label>
            <label className={`cursor-pointer rounded-xl border-2 p-3 text-sm transition ${kind === "business" ? "border-brand-600 bg-brand-50" : "border-neutral-200 hover:border-neutral-300"}`}>
              <input type="radio" value="business" className="sr-only" {...register("sellerKind")} />
              <span className="font-bold">Business</span>
              <span className="mt-0.5 block text-xs text-ink-500">Open a shop · permit + owner ID</span>
            </label>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label-bd" htmlFor="name">Full name</label>
            <input id="name" className="input-bd" autoComplete="name" placeholder="Jane Wanjiku" {...register("name")} />
            {errors.name && <p className="mt-1 text-xs text-red-600">{String(errors.name.message)}</p>}
          </div>
          <div>
            <label className="label-bd" htmlFor="phone">Phone (M-Pesa)</label>
            <input id="phone" className="input-bd" placeholder="0712345678" autoComplete="tel" {...register("phone")} />
            {errors.phone && <p className="mt-1 text-xs text-red-600">{String(errors.phone.message)}</p>}
          </div>
        </div>
        {isBusiness && (
          <div>
            <label className="label-bd" htmlFor="businessName">Business name <span className="text-red-600">*</span></label>
            <input id="businessName" className="input-bd" autoComplete="organization" placeholder="e.g. FonZone Nairobi" {...register("businessName")} />
            <p className="mt-1 text-xs text-ink-500">Shown publicly on your shop, listings and verification review.</p>
            {errors.businessName && <p className="mt-1 text-xs text-red-600">{String(errors.businessName.message)}</p>}
          </div>
        )}
        <div>
          <label className="label-bd" htmlFor="email">Email address</label>
          <input id="email" className="input-bd" type="email" autoComplete="email" placeholder="you@example.co.ke" {...register("email")} />
          {errors.email && <p className="mt-1 text-xs text-red-600">{String(errors.email.message)}</p>}
        </div>
        <PasswordField
          id="pw"
          label="Password (min 8 characters)"
          autoComplete="new-password"
          field={register("password")}
          error={errors.password ? String(errors.password.message) : undefined}
        />
        <div className="space-y-3">
          <p className="text-xs text-ink-500">
            Required for the ✓ verified badge — admins review {isBusiness ? "both documents" : "it"} before you can post. Stored privately, never shown publicly.
          </p>
          {isBusiness ? (
            <>
              {docInput("doc-permit", "Business permit photo", docFile, setDocFile)}
              {docInput("doc-owner", "Owner national ID photo", docFile2, setDocFile2)}
            </>
          ) : (
            docInput("doc", "National ID photo", docFile, setDocFile)
          )}
        </div>
        <label className="flex items-start gap-2 text-sm text-ink-600">
          <input type="checkbox" {...register("acceptTerms")} className="mt-1" />
          <span>I accept the <Link href="/terms" className="link-bd">Terms</Link> and <Link href="/privacy" className="link-bd">Privacy Policy</Link>.</span>
        </label>
        {errors.acceptTerms && <p className="text-xs text-red-600">You must accept the Terms</p>}
        {err && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
        <button className="btn-primary w-full !py-3" disabled={isSubmitting}>{isSubmitting ? "Creating account…" : "Create free account"}</button>
        <p className="text-center text-sm text-ink-500">
          Have an account? <Link href={next ? `/auth/signin?next=${encodeURIComponent(next)}` : "/auth/signin"} className="link-bd font-semibold">Sign in</Link>
        </p>
      </form>
    </AuthShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="container-bd max-w-md py-12 text-sm text-ink-500">Loading…</div>}>
      <SignupForm />
    </Suspense>
  );
}
