import { describe, it, expect } from "vitest";
import { box } from "./box.js";
import { stripAnsi } from "./ansi.js";

describe("box", () => {
    it("frames a single line", () => {
        const out = box(["hi"]).map(stripAnsi);
        expect(out[0]).toBe("\u256d\u2500\u2500\u2500\u2500\u256e");
        expect(out[1]).toBe("\u2502 hi \u2502");
        expect(out[2]).toBe("\u2570\u2500\u2500\u2500\u2500\u256f");
    });

    it("sizes to the widest line", () => {
        const out = box(["a", "bbbb"]).map(stripAnsi);
        // content width 4 -> inner width 6 (space padding both sides)
        expect(out[1]).toBe("\u2502 a    \u2502");
        expect(out[2]).toBe("\u2502 bbbb \u2502");
    });

    it("renders a title in the top border", () => {
        const out = box(["x"], { title: "T" }).map(stripAnsi);
        expect(out[0]).toContain("T");
        expect(out[0].startsWith("\u256d")).toBe(true);
        expect(out[0].endsWith("\u256e")).toBe(true);
    });
});
