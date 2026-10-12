"use client";

import { useRef, useState } from "react";
import { RICH_TEXT_HINT, toSafeHtml } from "@/lib/richtext";

/**
 * Markdown description field with formatting toolbar + live preview.
 * Controlled via value/onChange so it plugs into any form library.
 */
export function RichTextField({
  id,
  label,
  value,
  onChange,
  error,
  rows = 6,
  maxLength = 5000,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  rows?: number;
  maxLength?: number;
  hint?: string;
}) {
  const [preview, setPreview] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  const surround = (before: string, after = "") => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value: v } = el;
    const sel = v.slice(s, e) || "text";
    onChange(`${v.slice(0, s)}${before}${sel}${after}${v.slice(e)}`.slice(0, maxLength));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + before.length, s + before.length + sel.length);
    });
  };

  const listify = () => {
    const el = ref.current;
    if (!el) return onChange(value ? `${value}\n- ` : "- ");
    const { selectionStart: s, value: v } = el;
    const lineStart = v.lastIndexOf("\n", s - 1) + 1;
    onChange(`${v.slice(0, lineStart)}- ${v.slice(lineStart)}`.slice(0, maxLength));
    requestAnimationFrame(() => el.focus());
  };

  const linkify = () => {
    const url = window.prompt("Link URL (https://…)", "https://");
    if (!url || !/^https?:\/\//.test(url)) return;
    const el = ref.current;
    const sel = el ? el.value.slice(el.selectionStart, el.selectionEnd) || "link text" : "link text";
    onChange(`${value}[${sel}](${url})`.slice(0, maxLength));
  };

  const btn =
    "rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs font-bold text-ink-700 hover:bg-sand-50";

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label className="label-bd" htmlFor={id}>{label}</label>
        <button
          type="button"
          className={btn}
          onClick={() => setPreview((p) => !p)}
          aria-pressed={preview}
        >
          {preview ? "Edit" : "Preview"}
        </button>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="Formatting">
        <button type="button" className={btn} onClick={() => surround("**")} aria-label="Bold"><strong>B</strong></button>
        <button type="button" className={btn} onClick={() => surround("*")} aria-label="Italic"><em>I</em></button>
        <button type="button" className={btn} onClick={() => surround("`")} aria-label="Code">{"</>"}</button>
        <button type="button" className={btn} onClick={linkify} aria-label="Insert link">Link</button>
        <button type="button" className={btn} onClick={listify} aria-label="Bullet list">• List</button>
        <span className="ml-auto text-[11px] text-ink-400">{RICH_TEXT_HINT}</span>
      </div>
      {preview ? (
        <div className="input-bd mt-2 min-h-24 prose-sm" dangerouslySetInnerHTML={{ __html: toSafeHtml(value || "Nothing to preview yet.") }} />
      ) : (
        <textarea
          ref={ref}
          id={id}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
          placeholder="Condition, what's included, pickup/delivery, reason for selling… (min 20 characters)"
          className="input-bd mt-2"
        />
      )}
      <div className="mt-1 flex items-center justify-between gap-2 text-xs">
        <span className="text-ink-400">{hint ?? "Markdown supported · links must be https://"}</span>
        <span className={value.trim().length < 20 ? "text-ink-400" : "font-semibold text-green-700"}>
          {value.trim().length}/{maxLength} {value.trim().length >= 20 ? "✓" : ""}
        </span>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
