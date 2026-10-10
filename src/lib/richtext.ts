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
export function toSafeHtml(input: string): string {
  const lines = String(input ?? "").slice(0, MAX).split("\n");
  const out: string[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) {
      out.push(`<ul>${list.map((li) => `<li>${li}</li>`).join("")}</ul>`);
      list = [];
    }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const m = line.match(/^\s*[-•]\s+(.+)$/);
    if (m) {
      list.push(inline(m[1]));
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
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > len ? `${plain.slice(0, len - 1)}…` : plain;
}

export const RICH_TEXT_HINT = "**bold** · *italic* · `code` · [link](https://…) · - list";
