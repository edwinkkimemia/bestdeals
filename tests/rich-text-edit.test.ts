import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { toSafeHtml } from "../src/lib/richtext.ts";
import {
  insertMarkdownLink,
  normalizeHttpUrl,
  toggleLineStyle,
  wrapSelection,
} from "../src/lib/rich-text-edit.ts";

describe("description Markdown renderer", () => {
  it("renders headings, ordered lists and quotes", () => {
    assert.equal(toSafeHtml("## What's included\nCharger and case"), "<h2>What's included</h2><p>Charger and case</p>");
    assert.equal(toSafeHtml("1. Charger\n2. Case"), "<ol><li>Charger</li><li>Case</li></ol>");
    assert.equal(toSafeHtml("> Serious buyers only"), "<blockquote><p>Serious buyers only</p></blockquote>");
  });

  it("keeps raw HTML and unsafe links inert", () => {
    const html = toSafeHtml('<img src=x onerror=alert(1)> [click](javascript:alert(1))');
    assert.ok(!html.includes("<img"));
    assert.ok(!/href="javascript/i.test(html));
    assert.ok(html.includes("&lt;img"));
  });
});

describe("description editor transforms", () => {
  it("wraps a selection and unwraps it again", () => {
    const bold = wrapSelection("hello world", 6, 11, "**");
    assert.equal(bold.value, "hello **world**");
    assert.deepEqual([bold.start, bold.end], [8, 13]);

    const plain = wrapSelection(bold.value, bold.start, bold.end, "**");
    assert.equal(plain.value, "hello world");
    assert.deepEqual([plain.start, plain.end], [6, 11]);
  });

  it("inserts placeholder text for a cursor-only bold action", () => {
    const result = wrapSelection("Hello ", 6, 6, "**");
    assert.equal(result.value, "Hello **text**");
    assert.deepEqual([result.start, result.end], [8, 12]);
  });

  it("adds and removes bullet and numbered lists across selected lines", () => {
    const bullets = toggleLineStyle("one\ntwo", 0, 7, "bullet");
    assert.equal(bullets.value, "- one\n- two");

    const unbulleted = toggleLineStyle(bullets.value, 0, bullets.value.length, "bullet");
    assert.equal(unbulleted.value, "one\ntwo");

    const numbered = toggleLineStyle("one\ntwo", 0, 7, "number");
    assert.equal(numbered.value, "1. one\n2. two");
  });

  it("converts an existing list instead of nesting markers", () => {
    const numbered = toggleLineStyle("- one\n- two", 0, 11, "number");
    assert.equal(numbered.value, "1. one\n2. two");
  });

  it("replaces quote and heading blocks instead of stacking markers", () => {
    assert.equal(toggleLineStyle("> quoted", 0, 8, "bullet").value, "- quoted");
    assert.equal(toggleLineStyle("# Heading", 0, 9, "h3").value, "### Heading");
  });

  it("adds headings and quotes", () => {
    assert.equal(toggleLineStyle("Details", 0, 7, "h2").value, "## Details");
    assert.equal(toggleLineStyle("Details", 0, 7, "quote").value, "> Details");
  });

  it("inserts links at the selection and replaces selected text with the label", () => {
    const atCursor = insertMarkdownLink("See ", 4, 4, "example.com");
    assert.ok(atCursor);
    assert.equal(atCursor!.value, "See [link text](https://example.com/)");
    assert.deepEqual([atCursor!.start, atCursor!.end], [5, 14]);

    const selected = insertMarkdownLink("See site", 4, 8, "https://example.com");
    assert.ok(selected);
    assert.equal(selected!.value, "See [site](https://example.com/)");
  });

  it("rejects non-http link schemes", () => {
    assert.equal(normalizeHttpUrl("javascript:alert(1)"), null);
    assert.equal(insertMarkdownLink("x", 0, 0, "mailto:hi@example.com"), null);
  });
});
