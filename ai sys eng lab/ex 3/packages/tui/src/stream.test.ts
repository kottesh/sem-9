import { describe, it, expect, vi } from "vitest";
import { StreamWriter } from "./stream.js";

function capture() {
    const chunks: string[] = [];
    const write = vi.fn((s: string) => {
        chunks.push(s);
        return true;
    });
    return { write, chunks, text: () => chunks.join("") };
}

describe("StreamWriter", () => {
    it("writes chunks incrementally to the sink", () => {
        const c = capture();
        const w = new StreamWriter(c.write);
        w.write("Hel");
        w.write("lo");
        expect(c.text()).toBe("Hello");
    });

    it("tracks whether any content was written", () => {
        const c = capture();
        const w = new StreamWriter(c.write);
        expect(w.wrote).toBe(false);
        w.write("x");
        expect(w.wrote).toBe(true);
    });

    it("end() emits a trailing newline only when content lacks one", () => {
        const c = capture();
        const w = new StreamWriter(c.write);
        w.write("line");
        w.end();
        expect(c.text()).toBe("line\n");
    });

    it("end() does not double a trailing newline", () => {
        const c = capture();
        const w = new StreamWriter(c.write);
        w.write("line\n");
        w.end();
        expect(c.text()).toBe("line\n");
    });

    it("end() on empty output writes nothing", () => {
        const c = capture();
        const w = new StreamWriter(c.write);
        w.end();
        expect(c.text()).toBe("");
    });
});
