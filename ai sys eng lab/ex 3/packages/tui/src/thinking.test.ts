import { describe, it, expect, vi } from "vitest";
import { ThinkingView } from "./thinking.js";
import { stripAnsi } from "./ansi.js";

function capture() {
    const chunks: string[] = [];
    const write = (s: string) => {
        chunks.push(s);
    };
    return { write, chunks, text: () => stripAnsi(chunks.join("")) };
}

describe("ThinkingView", () => {
    it("prints a header once on the first thinking delta", () => {
        const c = capture();
        const v = new ThinkingView(c.write);
        v.thinking("reason ");
        v.thinking("more");
        const header = c.chunks.filter((s) => stripAnsi(s).includes("thinking")).length;
        expect(header).toBe(1);
        expect(c.text()).toContain("reason more");
    });

    it("closes the block with a divider when the answer starts", () => {
        const c = capture();
        const v = new ThinkingView(c.write);
        v.thinking("hmm");
        expect(v.active).toBe(true);
        v.endThinking();
        expect(v.active).toBe(false);
        // ending again is a no-op
        v.endThinking();
        expect(v.active).toBe(false);
    });

    it("does nothing if no thinking was ever emitted", () => {
        const c = capture();
        const v = new ThinkingView(c.write);
        v.endThinking();
        expect(c.chunks.length).toBe(0);
    });
});
