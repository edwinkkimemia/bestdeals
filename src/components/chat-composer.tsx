"use client";

import { useRef, useState } from "react";
import { RICH_TEXT_HINT, toSafeHtml } from "@/lib/richtext";

/** Rich-text chat composer: toolbar inserts markdown, preview renders it. */
export function ChatComposer({
  onSend,
  placeholder = "Write a message…",
}: {
  onSend: (text: string) => Promise<string | null>;
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  const surround = (before: string, after = "") => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const sel = value.slice(s, e) || "text";
    const next = `${value.slice(0, s)}${before}${sel}${after}${value.slice(e)}`;
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + before.length, s + before.length + sel.length);
    });
  };

  const listify = () => {
    const el = ref.current;
    if (!el) return setText((t) => (t ? `${t}\n- ` : "- "));
    const { selectionStart: s, value } = el;
    const lineStart = value.lastIndexOf("\n", s - 1) + 1;
    const next = `${value.slice(0, lineStart)}- ${value.slice(lineStart)}`;
    setText(next);
    requestAnimationFrame(() => el.focus());
  };

  const linkify = () => {
    const url = window.prompt("Link URL (https://…)", "https://");
    if (!url || !/^https?:\/\//.test(url)) return;
    const el = ref.current;
    const sel = el ? el.value.slice(el.selectionStart, el.selectionEnd) || "link text" : "link text";
    setText((t) => `${t}[${sel}](${url})`);
  };

  const send = async () => {
    if (!text.trim() || busy) return;
    setErr("");
    setBusy(true);
    try {
      const error = await onSend(text.trim());
      if (error) setErr(error);
      else {
        setText("");
        setPreview(false);
      }
    } finally {
      setBusy(false);
    }
  };

  const btn = "rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs font-bold text-ink-700 hover:bg-sand-50";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="Formatting">
        <button type="button" className={btn} onClick={() => surround("**")} aria-label="Bold"><strong>B</strong></button>
        <button type="button" className={btn} onClick={() => surround("*")} aria-label="Italic"><em>I</em></button>
        <button type="button" className={btn} onClick={() => surround("`")} aria-label="Code">{"</>"}</button>
        <button type="button" className={btn} onClick={linkify} aria-label="Insert link">Link</button>
        <button type="button" className={btn} onClick={listify} aria-label="Bullet list">• List</button>
        <button type="button" className={btn} onClick={() => setPreview((p) => !p)} aria-pressed={preview}>
          {preview ? "Edit" : "Preview"}
        </button>
        <span className="ml-auto hidden text-[11px] text-ink-400 sm:inline">{RICH_TEXT_HINT}</span>
      </div>
      {preview ? (
        <div className="input-bd min-h-24 prose-sm" dangerouslySetInnerHTML={{ __html: toSafeHtml(text || "Nothing to preview yet.") }} />
      ) : (
        <textarea
          ref={ref}
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 2000))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
          }}
          placeholder={`${placeholder} (Ctrl+Enter to send)`}
          aria-label="Message"
          className="input-bd"
        />
      )}
      {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
      <button onClick={send} disabled={busy || !text.trim()} className="btn-primary w-full">
        {busy ? "Sending…" : "Send message"}
      </button>
    </div>
  );
}
