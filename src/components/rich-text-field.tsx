"use client";

import { useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import {
  Bold,
  Code2,
  Eye,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pencil,
  Quote,
} from "lucide-react";
import { toSafeHtml } from "@/lib/richtext";
import {
  insertMarkdownLink,
  toggleLineStyle,
  wrapSelection,
  type LineStyle,
  type RichEditResult,
} from "@/lib/rich-text-edit";
import { cn } from "@/lib/utils";

/**
 * Markdown description field with a selection-aware formatting toolbar,
 * Write/Preview tabs and a live character count. Store text stays Markdown,
 * so listing pages stay safe and unchanged.
 */
export function RichTextField({
  id,
  label,
  value,
  onChange,
  error,
  rows = 6,
  maxLength = 5000,
  minLength = 20,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  rows?: number;
  maxLength?: number;
  minLength?: number;
  hint?: string;
}) {
  const [mode, setMode] = useState<"write" | "preview">("write");
  const ref = useRef<HTMLTextAreaElement>(null);
  const trimmedLength = value.trim().length;
  const minMet = trimmedLength >= minLength;

  const applyResult = (result: RichEditResult) => {
    const el = ref.current;
    if (!el) return;
    onChange(result.value);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(result.start, result.end);
    });
  };

  const run = (transform: (value: string, start: number, end: number) => RichEditResult | null) => {
    const el = ref.current;
    if (!el) return;
    const result = transform(el.value, el.selectionStart, el.selectionEnd);
    if (result) applyResult(result);
  };

  const wrap = (before: string, after = before, placeholder = "text") => {
    run((text, start, end) => wrapSelection(text, start, end, before, after, placeholder, maxLength));
  };

  const lineStyle = (style: LineStyle) => {
    run((text, start, end) => toggleLineStyle(text, start, end, style, maxLength));
  };

  const linkify = () => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const entered = window.prompt("Link URL (https://…)", "https://");
    if (entered === null) return;
    const result = insertMarkdownLink(el.value, start, end, entered, "link text", maxLength);
    if (!result) {
      window.alert("Enter a valid link starting with https:// (for example https://example.com).");
      return;
    }
    applyResult(result);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === "b") {
      event.preventDefault();
      wrap("**", "**", "bold text");
    } else if (key === "i") {
      event.preventDefault();
      wrap("*", "*", "italic text");
    } else if (key === "k") {
      event.preventDefault();
      linkify();
    }
  };

  const toolButton =
    "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-600 transition hover:bg-white hover:text-ink-900 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600";
  const keepSelection = (event: MouseEvent) => event.preventDefault();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="label-bd mb-0" htmlFor={id}>
          {label}
        </label>
        <div className="inline-flex shrink-0 rounded-lg border border-neutral-200 bg-white p-0.5" role="group" aria-label="Description editor mode">
          <button
            type="button"
            aria-pressed={mode === "write"}
            onClick={() => setMode("write")}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition",
              mode === "write" ? "bg-ink-900 text-white" : "text-ink-500 hover:bg-sand-50"
            )}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Write
          </button>
          <button
            type="button"
            aria-pressed={mode === "preview"}
            onClick={() => setMode("preview")}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition",
              mode === "preview" ? "bg-ink-900 text-white" : "text-ink-500 hover:bg-sand-50"
            )}
          >
            <Eye className="h-3.5 w-3.5" aria-hidden="true" /> Preview
          </button>
        </div>
      </div>

      <div
        className={cn(
          "mt-1.5 overflow-hidden rounded-xl border bg-white transition focus-within:ring-2",
          error
            ? "border-red-300 focus-within:border-red-500 focus-within:ring-red-500/15"
            : "border-neutral-300 focus-within:border-brand-600 focus-within:ring-brand-600/20"
        )}
      >
        {mode === "write" && (
          <div
            className="flex flex-wrap items-center gap-0.5 border-b border-neutral-200 bg-sand-50 p-1.5"
            role="toolbar"
            aria-label="Description formatting"
            aria-controls={id}
          >
            <button type="button" className={toolButton} title="Bold (Ctrl+B)" aria-label="Bold" aria-keyshortcuts="Control+B Meta+B" onMouseDown={keepSelection} onClick={() => wrap("**", "**", "bold text")}>
              <Bold className="h-4 w-4" aria-hidden="true" />
            </button>
            <button type="button" className={toolButton} title="Italic (Ctrl+I)" aria-label="Italic" aria-keyshortcuts="Control+I Meta+I" onMouseDown={keepSelection} onClick={() => wrap("*", "*", "italic text")}>
              <Italic className="h-4 w-4" aria-hidden="true" />
            </button>
            <button type="button" className={toolButton} title="Inline code" aria-label="Inline code" onMouseDown={keepSelection} onClick={() => wrap("`", "`", "code")}>
              <Code2 className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="mx-1 h-4 w-px bg-neutral-300" aria-hidden="true" />
            <button type="button" className={toolButton} title="Heading" aria-label="Heading" onMouseDown={keepSelection} onClick={() => lineStyle("h2")}>
              <Heading2 className="h-4 w-4" aria-hidden="true" />
            </button>
            <button type="button" className={toolButton} title="Bulleted list" aria-label="Bulleted list" onMouseDown={keepSelection} onClick={() => lineStyle("bullet")}>
              <List className="h-4 w-4" aria-hidden="true" />
            </button>
            <button type="button" className={toolButton} title="Numbered list" aria-label="Numbered list" onMouseDown={keepSelection} onClick={() => lineStyle("number")}>
              <ListOrdered className="h-4 w-4" aria-hidden="true" />
            </button>
            <button type="button" className={toolButton} title="Quote" aria-label="Quote" onMouseDown={keepSelection} onClick={() => lineStyle("quote")}>
              <Quote className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="mx-1 h-4 w-px bg-neutral-300" aria-hidden="true" />
            <button type="button" className={toolButton} title="Insert link (Ctrl+K)" aria-label="Insert link" aria-keyshortcuts="Control+K Meta+K" onMouseDown={keepSelection} onClick={linkify}>
              <Link2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {mode === "write" ? (
          <textarea
            ref={ref}
            id={id}
            rows={rows}
            value={value}
            onChange={(event) => onChange(event.target.value.slice(0, maxLength))}
            onKeyDown={onKeyDown}
            maxLength={maxLength}
            placeholder="Condition, what's included, pickup/delivery, reason for selling… (min 20 characters)"
            aria-invalid={Boolean(error)}
            aria-describedby={`${id}-help ${id}-count${error ? ` ${id}-error` : ""}`}
            className="block min-h-36 w-full resize-y border-0 bg-transparent p-3.5 text-sm leading-relaxed text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-0"
          />
        ) : (
          <div className="rich-text min-h-36 p-3.5 text-sm leading-relaxed text-ink-700">
            {value.trim() ? (
              <div dangerouslySetInnerHTML={{ __html: toSafeHtml(value, maxLength) }} />
            ) : (
              <p className="text-ink-400">Nothing to preview yet.</p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-neutral-100 bg-sand-50/60 px-3 py-1.5 text-[11px] text-ink-400">
          <span id={`${id}-help`}>
            {hint ?? "Use the toolbar or Markdown. Links must start with https://."}
          </span>
          <span id={`${id}-count`} className={cn("tabular-nums", minMet && "font-semibold text-green-700")}>
            {!minMet && minLength > 0 ? `${minLength - trimmedLength} more · ` : ""}
            {value.length}/{maxLength}
          </span>
        </div>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
