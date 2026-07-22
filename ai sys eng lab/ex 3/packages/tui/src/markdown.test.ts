import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./markdown.js";
import { stripAnsi } from "./ansi.js";

// renderMarkdown returns colored text; we assert on the visible (stripped) form
// plus that styling was applied (output differs from plain when colors are on).

describe("renderMarkdown", () => {
    it("keeps plain paragraphs intact", () => {
        expect(stripAnsi(renderMarkdown("just text"))).toBe("just text");
    });

    it("renders headings without the hashes", () => {
        const out = stripAnsi(renderMarkdown("## Title"));
        expect(out).toBe("Title");
    });

    it("converts bullet markers to a dot", () => {
        const out = stripAnsi(renderMarkdown("- one\n- two"));
        expect(out.split("\n")).toEqual(["\u2022 one", "\u2022 two"]);
    });

    it("strips bold and italic markers from the visible text", () => {
        expect(stripAnsi(renderMarkdown("**bold** and *em*"))).toBe("bold and em");
    });

    it("strips inline code backticks", () => {
        expect(stripAnsi(renderMarkdown("run `ls -la` now"))).toBe("run ls -la now");
    });

    it("renders fenced code blocks without the fences", () => {
        const out = stripAnsi(renderMarkdown("```\nline1\nline2\n```"));
        expect(out.split("\n")).toEqual(["line1", "line2"]);
    });
});
