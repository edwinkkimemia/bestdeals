"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

/**
 * Shared auth chrome: split-screen brand panel + form card.
 * Keeps sign-in / sign-up visually one product while each form keeps its logic.
 */
export function AuthShell({
  eyebrow,
  title,
  subtitle,
  panelHeading,
  points,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  panelHeading: string;
  points: { title: string; text: string }[];
  children: ReactNode;
}) {
  return (
    <div className="bg-gradient-to-b from-brand-50 via-white to-white">
      <div className="container-bd grid items-stretch gap-5 py-10 lg:grid-cols-[1fr_1.05fr] lg:py-14">
        {/* Brand panel */}
        <div className="relative hidden overflow-hidden rounded-3xl bg-brand-700 p-8 text-white lg:flex lg:flex-col">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand-500/40 blur-2xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-brand-900/60 blur-2xl"
          />
          <Link href="/" className="relative inline-flex w-fit items-center rounded-xl bg-white px-3 py-2" aria-label="Chap home">
            <Image src="/chaplogo.png" alt="chap.co.ke" width={1147} height={287} className="h-7 w-auto" />
          </Link>
          <p className="relative mt-8 text-xs font-bold uppercase tracking-widest text-brand-200">{eyebrow}</p>
          <h2 className="relative mt-2 text-3xl font-extrabold leading-tight">{panelHeading}</h2>
          <ul className="relative mt-6 space-y-4">
            {points.map((p) => (
              <li key={p.title} className="flex gap-3">
                <span aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-bold">✓</span>
                <span>
                  <span className="block text-sm font-bold">{p.title}</span>
                  <span className="block text-sm text-brand-100">{p.text}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="relative mt-auto pt-8 text-xs text-brand-200">
            Kenya&apos;s marketplace for everything · Find it. Sell it. Get the best deal.
          </p>
        </div>

        {/* Form card */}
        <div className="min-w-0">
          <div className="mb-4 lg:hidden">
            <Link href="/" className="inline-flex items-center rounded-xl border border-neutral-200 bg-white px-3 py-2" aria-label="Chap home">
              <Image src="/chaplogo.png" alt="chap.co.ke" width={1147} height={287} className="h-7 w-auto" />
            </Link>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-ink-500">{subtitle}</p>
          <div className="card mt-5 p-5 sm:p-7">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** Password input with show/hide toggle. */
export function PasswordField({
  id,
  label,
  autoComplete,
  field,
  error,
}: {
  id: string;
  label: string;
  autoComplete: string;
  field: Record<string, unknown>;
  error?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="label-bd" htmlFor={id}>{label}</label>
      <div className="relative">
        <input
          id={id}
          className="input-bd pr-11"
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          {...field}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-400 hover:bg-sand-100 hover:text-ink-700"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
