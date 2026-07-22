import { describe, it, expect } from "vitest";
import { wrap, truncate, padRight, indent } from "./text.js";

describe("wrap", () => {
    it("wraps text to the given width on word boundaries", () => {
        expect(wrap("the quick brown fox", 9)).toEqual(["the quick", "brown fox"]);
    });

    it("keeps a short line as a single row", () => {
        expect(wrap("short", 20)).toEqual(["short"]);
    });

    it("hard-breaks a word longer than the width", () => {
        expect(wrap("supercalifragilistic", 5)).toEqual(["super", "calif", "ragil", "istic"]);
    });

    it("preserves explicit newlines as separate paragraphs", () => {
        expect(wrap("a b\nc d", 3)).toEqual(["a b", "c d"]);
    });

    it("returns an empty array for empty input", () => {
        expect(wrap("", 10)).toEqual([]);
    });
});

describe("truncate", () => {
    it("leaves short strings untouched", () => {
        expect(truncate("hi", 10)).toBe("hi");
    });

    it("truncates with an ellipsis", () => {
        expect(truncate("hello world", 8)).toBe("hello w\u2026");
    });
});

describe("padRight", () => {
    it("pads to the target width", () => {
        expect(padRight("hi", 5)).toBe("hi   ");
    });

    it("does not shrink longer strings", () => {
        expect(padRight("hello", 3)).toBe("hello");
    });
});

describe("indent", () => {
    it("prefixes every line", () => {
        expect(indent("a\nb", "  ")).toBe("  a\n  b");
    });
});
