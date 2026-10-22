/**
 * Selection-aware Markdown transforms for the listing description editor.
 * Pure helpers so the toolbar, keyboard shortcuts and tests all share the
 * same cursor/selection rules.
 */

export type RichEditResult = { value: string; start: number; end: number };
export type LineStyle = "bullet" | "number" | "quote" | "h2" | "h3";

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

function range(value: string, start: number, end: number) {
  const a = clamp(start, 0, value.length);
  const b = clamp(end, 0, value.length);
  return a <= b ? { start: a, end: b } : { start: b, end: a };
}

function finish(value: string, start: number, end: number, maxLength: number): RichEditResult {
  const next = value.slice(0, Math.max(0, maxLength));
  return {
    value: next,
    start: clamp(start, 0, next.length),
    end: clamp(end, 0, next.length),
  };
}

function addPrefix(line: string, prefix: string) {
  const indent = line.match(/^\s*/)?.[0] ?? "";
  return `${indent}${prefix}${line.slice(indent.length)}`;
}

/** Replace the existing block marker so styles never stack into unrenderable text. */
function stripLineStyle(line: string) {
  return line.replace(/^(\s*)(?:#{1,6}\s+|>\s?|(?:[-*+•]|\d+[.)])\s+)/, "$1");
}

function hasLineStyle(line: string, style: LineStyle) {
  if (style === "bullet") return /^\s*[-*+•]\s+/.test(line);
  if (style === "number") return /^\s*\d+[.)]\s+/.test(line);
  if (style === "quote") return /^\s*>\s?/.test(line);
  if (style === "h2") return /^\s*##\s+/.test(line);
  return /^\s*###\s+/.test(line);
}

function linePrefix(style: LineStyle, index: number) {
  if (style === "bullet") return "- ";
  if (style === "number") return `${index + 1}. `;
  if (style === "quote") return "> ";
  if (style === "h2") return "## ";
  return "### ";
}

/** Wrap or unwrap the current selection with Markdown markers. */
export function wrapSelection(
  value: string,
  start: number,
  end: number,
  before: string,
  after = before,
  placeholder = "text",
  maxLength = 5000
): RichEditResult {
  const selectedRange = range(value, start, end);
  const s = selectedRange.start;
  const e = selectedRange.end;
  const selected = value.slice(s, e);

  // Markers immediately outside the selection → remove them.
  const outerStart = s - before.length;
  const outerEnd = e + after.length;
  if (
    outerStart >= 0 &&
    value.slice(outerStart, s) === before &&
    value.slice(e, outerEnd) === after
  ) {
    const next = value.slice(0, outerStart) + selected + value.slice(outerEnd);
    return finish(next, outerStart, outerStart + selected.length, maxLength);
  }

  // Markers included in the selection → remove them.
  if (
    selected.length >= before.length + after.length &&
    selected.startsWith(before) &&
    selected.endsWith(after)
  ) {
    const inner = selected.slice(before.length, selected.length - after.length);
    const next = value.slice(0, s) + inner + value.slice(e);
    return finish(next, s, s + inner.length, maxLength);
  }

  const body = selected || placeholder;
  const inserted = `${before}${body}${after}`;
  const next = value.slice(0, s) + inserted + value.slice(e);
  const contentStart = s + before.length;
  return finish(next, contentStart, contentStart + body.length, maxLength);
}

/**
 * Apply or remove a line-level style (list, quote, heading) on every line the
 * selection touches. Toggling the same style twice restores the original text.
 */
export function toggleLineStyle(
  value: string,
  start: number,
  end: number,
  style: LineStyle,
  maxLength = 5000
): RichEditResult {
  const selectedRange = range(value, start, end);
  const s = selectedRange.start;
  const e = selectedRange.end;
  const lineStart = value.lastIndexOf("\n", s - 1) + 1;
  // Don't pull in the next line when the selection ends exactly on a newline.
  const contentEnd = e > s && value[e - 1] === "\n" ? e - 1 : e;
  const newline = value.indexOf("\n", contentEnd);
  const lineEnd = newline === -1 ? value.length : newline;
  const block = value.slice(lineStart, lineEnd);
  const lines = block.split("\n");
  const filled = lines.filter((line) => line.trim().length > 0);
  const allStyled = filled.length > 0 && filled.every((line) => hasLineStyle(line, style));

  let itemIndex = 0;
  const nextLines = lines.map((line) => {
    if (!line.trim()) return line;
    if (allStyled) return stripLineStyle(line);
    const base = stripLineStyle(line);
    const prefix = linePrefix(style, itemIndex++);
    return addPrefix(base, prefix);
  });

  const nextBlock = nextLines.join("\n");
  const next = value.slice(0, lineStart) + nextBlock + value.slice(lineEnd);
  const blockEnd = lineStart + nextBlock.length;
  return finish(next, s === e ? blockEnd : lineStart, s === e ? blockEnd : blockEnd, maxLength);
}

/** Validate and normalise a user-entered link; only http(s) is accepted. */
export function normalizeHttpUrl(raw: string): string | null {
  let text = raw.trim();
  if (!text) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(text)) text = `https://${text.replace(/^\/+/, "")}`;
  try {
    const url = new URL(text);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Insert a Markdown link at the cursor, or turn the selection into its label. */
export function insertMarkdownLink(
  value: string,
  start: number,
  end: number,
  rawUrl: string,
  placeholder = "link text",
  maxLength = 5000
): RichEditResult | null {
  const url = normalizeHttpUrl(rawUrl);
  if (!url) return null;
  const selectedRange = range(value, start, end);
  const s = selectedRange.start;
  const e = selectedRange.end;
  const hadSelection = s !== e;
  const fallback = placeholder.replace(/[\[\]\n]/g, " ").replace(/\s+/g, " ").trim() || "link text";
  const label =
    value
      .slice(s, e)
      .replace(/[\[\]\n]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80) || fallback;
  const safeUrl = url.replace(/\)/g, "%29").replace(/\s/g, "%20");
  const inserted = `[${label}](${safeUrl})`;
  const next = value.slice(0, s) + inserted + value.slice(e);
  const labelStart = s + 1;
  return finish(
    next,
    hadSelection ? s + inserted.length : labelStart,
    hadSelection ? s + inserted.length : labelStart + label.length,
    maxLength
  );
}
