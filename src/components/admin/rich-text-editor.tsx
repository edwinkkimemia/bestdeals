"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Lightweight WYSIWYG editor for admin blog posts. contentEditable-based,
 * zero dependencies; HTML is sanitized server-side on save. Live word count
 * + Write/Preview tabs.
 */
export function RichTextEditor({
  initialHtml,
  onChange,
}: {
  initialHtml: string;
  onChange: (html: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [words, setWords] = useState(0);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== initialHtml) {
      ref.current.innerHTML = initialHtml || "";
      sync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sync = () => {
    const html = ref.current?.innerHTML ?? "";
    onChange(html);
    const text = ref.current?.innerText ?? "";
    setWords(text.trim() ? text.trim().split(/\s+/).length : 0);
  };

  const cmd = (command: string, value?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, value ?? undefined);
    sync();
  };

  const link = () => {
    const url = window.prompt("Link URL (https://…)", "https://");
    if (!url) return;
    cmd("createLink", url);
  };

  const tools: { label: string; hint: string; run: () => void; active?: boolean }[] = [
    { label: "H2", hint: "Heading", run: () => cmd("formatBlock", "h2") },
    { label: "H3", hint: "Subheading", run: () => cmd("formatBlock", "h3") },
    { label: "¶", hint: "Paragraph", run: () => cmd("formatBlock", "p") },
    { label: "B", hint: "Bold", run: () => cmd("bold") },
    { label: "I", hint: "Italic", run: () => cmd("italic") },
    { label: "U", hint: "Underline", run: () => cmd("underline") },
    { label: "•", hint: "Bullet list", run: () => cmd("insertUnorderedList") },
    { label: "1.", hint: "Numbered list", run: () => cmd("insertOrderedList") },
    { label: "❝", hint: "Quote", run: () => cmd("formatBlock", "blockquote") },
    { label: "🔗", hint: "Insert link", run: link },
    { label: "⌫", hint: "Clear formatting", run: () => cmd("removeFormat") },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-300 bg-white focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-600/20">
      <div className="flex flex-wrap items-center gap-1 border-b border-neutral-200 bg-sand-50 p-1.5" role="toolbar" aria-label="Formatting">
        {tools.map((t) => (
          <button
            key={t.hint}
            type="button"
            title={t.hint}
            aria-label={t.hint}
            onClick={t.run}
            className="min-w-8 rounded-lg px-2 py-1 text-sm font-bold text-ink-700 hover:bg-white hover:shadow-sm"
          >
            {t.label}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => setTab("write")}
            className={cn("rounded-lg px-2.5 py-1 font-semibold", tab === "write" ? "bg-ink-900 text-white" : "text-ink-500 hover:bg-white")}
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => { sync(); setTab("preview"); }}
            className={cn("rounded-lg px-2.5 py-1 font-semibold", tab === "preview" ? "bg-ink-900 text-white" : "text-ink-500 hover:bg-white")}
          >
            Preview
          </button>
        </span>
      </div>
      {tab === "write" ? (
        <div
          ref={ref}
          contentEditable
          role="textbox"
          aria-multiline
          aria-label="Article body"
          onInput={sync}
          className="prose-bd min-h-64 max-w-none p-4 text-[15px] leading-relaxed outline-none"
        />
      ) : (
        <PreviewPane getHtml={() => ref.current?.innerHTML ?? ""} />
      )}
      <p className="border-t border-neutral-100 px-4 py-1.5 text-xs text-ink-400">{words} words · links and formatting are cleaned automatically on save</p>
      <style jsx>{`
        .prose-bd h2 { font-size: 1.25rem; font-weight: 800; margin: 0.9em 0 0.4em; }
        .prose-bd h3 { font-size: 1.1rem; font-weight: 700; margin: 0.8em 0 0.35em; }
        .prose-bd p { margin: 0.5em 0; }
        .prose-bd ul { list-style: disc; padding-left: 1.4em; margin: 0.5em 0; }
        .prose-bd ol { list-style: decimal; padding-left: 1.4em; margin: 0.5em 0; }
        .prose-bd blockquote { border-left: 3px solid #0043d2; padding-left: 0.8em; color: #5b6a63; margin: 0.6em 0; }
        .prose-bd a { color: #0033a6; text-decoration: underline; }
      `}</style>
    </div>
  );
}

function PreviewPane({ getHtml }: { getHtml: () => string }) {
  const [html, setHtml] = useState("");
  useEffect(() => {
    setHtml(getHtml());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <article className="prose-bd min-h-64 max-w-none p-4 text-[15px] leading-relaxed">
      {html ? <div dangerouslySetInnerHTML={{ __html: html }} /> : <p className="text-ink-400">Nothing to preview yet.</p>}
      <style jsx>{`
        .prose-bd h2 { font-size: 1.25rem; font-weight: 800; margin: 0.9em 0 0.4em; }
        .prose-bd h3 { font-size: 1.1rem; font-weight: 700; margin: 0.8em 0 0.35em; }
        .prose-bd p { margin: 0.5em 0; }
        .prose-bd ul { list-style: disc; padding-left: 1.4em; margin: 0.5em 0; }
        .prose-bd ol { list-style: decimal; padding-left: 1.4em; margin: 0.5em 0; }
        .prose-bd blockquote { border-left: 3px solid #0043d2; padding-left: 0.8em; color: #5b6a63; margin: 0.6em 0; }
        .prose-bd a { color: #0033a6; text-decoration: underline; }
      `}</style>
    </article>
  );
}
