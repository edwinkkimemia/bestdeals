/**
 * Tiny rich-text engine for in-app messages. Users write a safe markdown
 * subset (**bold**, *italic*, `code`, [links](https://…), "- " lists);
 * readers get sanitized HTML. Everything else renders as plain text —
 * raw HTML, scripts, and javascript: URLs can never execute.
 */

const MAX = 2000;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(src: string): string {
  // `code` first so markers inside code aren't parsed.
  const codes: string[] = [];
  let s = src.replace(/`([^`\n]{1,120})`/g, (_, c: string) => {
    codes.push(`<code>${escapeHtml(c)}</code>`);
    return `\u0000${codes.length - 1}\u0000`;
  });
  s = escapeHtml(s);
  // Links: [label](https://…) — http(s) only, rel + target hardened.
  s = s.replace(
    /\[([^\[\]\n]{1,80})\]\((https?:\/\/[^\s)]{1,300})\)/g,
    '<a href="$2" target="_blank" rel="nofollow noopener ugc">$1</a>'
  );
  s = s.replace(/\*\*([^*\n]{1,200})\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[\s(])\*([^*\n]{1,200})\*/g, "$1<em>$2</em>");
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i: string) => codes[Number(i)] ?? "");
  return s;
}

/** Markdown subset → sanitized HTML. Always safe to inject. */
export function toSafeHtml(input: string, maxLen = MAX): string {
  const lines = String(input ?? "").slice(0, maxLen).split("\n");
  const out: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let listItems: string[] = [];
  let quote: string[] = [];

  const flushList = () => {
    if (listType && listItems.length) {
      out.push(`<${listType}>${listItems.map((li) => `<li>${li}</li>`).join("")}</${listType}>`);
    }
    listType = null;
    listItems = [];
  };

  const flushQuote = () => {
    if (quote.length) {
      out.push(`<blockquote>${quote.map((line) => `<p>${line}</p>`).join("")}</blockquote>`);
    }
    quote = [];
  };

  const flush = () => {
    flushList();
    flushQuote();
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    const heading = line.match(/^\s*(#{1,3})\s+(.+?)\s*$/);
    if (heading) {
      flush();
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }

    const bullet = line.match(/^\s*[-*+•]\s+(.+)$/);
    if (bullet) {
      flushQuote();
      if (listType !== "ul") flushList();
      listType = "ul";
      listItems.push(inline(bullet[1]));
      continue;
    }

    const ordered = line.match(/^\s*\d{1,3}[.)]\s+(.+)$/);
    if (ordered) {
      flushQuote();
      if (listType !== "ol") flushList();
      listType = "ol";
      listItems.push(inline(ordered[1]));
      continue;
    }

    const quoted = line.match(/^\s*>\s?(.*)$/);
    if (quoted) {
      flushList();
      quote.push(inline(quoted[1]));
      continue;
    }

    flush();
    if (line.trim() === "") continue;
    out.push(`<p>${inline(line)}</p>`);
  }

  flush();
  return out.join("");
}

/** Plain-text excerpt for inbox previews and notifications. */
export function toExcerpt(input: string, len = 120): string {
  const plain = String(input ?? "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*`_]/g, "")
    .replace(/^\s*(?:[-•+*]|\d+[.)])\s+/gm, "")
    .replace(/^\s*#{1,3}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > len ? `${plain.slice(0, len - 1)}…` : plain;
}

export const RICH_TEXT_HINT = "**bold** · *italic* · `code` · [link](https://…) · - list";
