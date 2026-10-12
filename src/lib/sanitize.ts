/**
 * Minimal server-side HTML sanitizer for admin-authored blog posts.
 * Allowlist of tags + attributes; everything else (scripts, event handlers,
 * javascript: URLs, style blocks) is stripped. Output is safe to inject.
 */

const MAX_HTML = 100_000;

const ALLOWED = new Set([
  "p", "br", "h2", "h3", "h4",
  "strong", "em", "u", "s",
  "blockquote", "ul", "ol", "li",
  "a", "code", "pre", "hr", "img",
]);

const isPublicImage = (u: string) =>
  u.startsWith("https://") || u.startsWith("/uploads/") || u.startsWith("/api/files/");

function escapeText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function sanitizeAttrs(tag: string, raw: string): string {
  const out: string[] = [];
  const re = /([a-zA-Z-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`>]+)))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const name = m[1].toLowerCase();
    const val = m[2] ?? m[3] ?? m[4] ?? "";
    if (name.startsWith("on") || name === "style" || name === "srcset") continue;
    if (tag === "a" && name === "href") {
      const href = val.trim();
      if (/^(https?:\/\/|mailto:)/i.test(href)) out.push(`href="${escapeAttr(href)}"`);
      continue;
    }
    if (tag === "a" && (name === "target" || name === "rel" || name === "title")) {
      out.push(`${name}="${escapeAttr(val)}"`);
      continue;
    }
    if (tag === "img" && name === "src") {
      if (isPublicImage(val.trim())) out.push(`src="${escapeAttr(val.trim())}"`);
      continue;
    }
    if (tag === "img" && name === "alt") {
      out.push(`alt="${escapeAttr(val)}"`);
      continue;
    }
  }
  if (tag === "a" && !/rel=/.test(out.join(" "))) out.push('rel="nofollow noopener"');
  return out.length ? ` ${out.join(" ")}` : "";
}

/** Allowlisted-HTML sanitize. Strips script/style content, comments, doctype. */
export function sanitizeHtml(input: string): string {
  let s = String(input ?? "").slice(0, MAX_HTML);
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<script[\s\S]*?<\/script\s*>/gi, "");
  s = s.replace(/<style[\s\S]*?<\/style\s*>/gi, "");
  const out: string[] = [];
  const re = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m[3] !== undefined) {
      out.push(escapeText(m[3]));
      continue;
    }
    const full = m[0];
    const tag = m[1].toLowerCase();
    const closing = full.startsWith("</");
    const selfClose = /\/\s*>$/.test(full);
    if (!ALLOWED.has(tag)) continue;
    if (closing) {
      if (tag !== "br" && tag !== "hr" && tag !== "img") out.push(`</${tag}>`);
      continue;
    }
    if (tag === "br" || tag === "hr") {
      out.push(tag === "br" ? "<br>" : "<hr>");
      continue;
    }
    if (tag === "img") {
      out.push(`<img${sanitizeAttrs(tag, m[2])}>`);
      continue;
    }
    out.push(`<${tag}${sanitizeAttrs(tag, m[2])}${selfClose ? "" : ""}>`);
  }
  return out.join("").trim();
}

/** Plain-text excerpt fallback when the author leaves the excerpt empty. */
export function htmlExcerpt(html: string, len = 160): string {
  const plain = String(html ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > len ? `${plain.slice(0, len - 1)}…` : plain;
}
