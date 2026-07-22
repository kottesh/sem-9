import { describe, it, expect } from "vitest";
import { formatTrackLine, progressBar, stripAnsi } from "./render.js";

describe("formatTrackLine", () => {
    it("renders index, name, primary artist and duration", () => {
        const line = stripAnsi(
            formatTrackLine(1, {
                id: "t1",
                name: "Let It Happen",
                uri: "u",
                duration_ms: 467000,
                explicit: false,
                artists: [{ id: "a", name: "Tame Impala", uri: "u" }]
            })
        );
        expect(line).toContain("1.");
        expect(line).toContain("Let It Happen");
        expect(line).toContain("Tame Impala");
        expect(line).toContain("7:47");
    });

    it("joins multiple artists", () => {
        const line = stripAnsi(
            formatTrackLine(2, {
                id: "t",
                name: "Song",
                uri: "u",
                duration_ms: 60000,
                explicit: false,
                artists: [
                    { id: "a", name: "A", uri: "u" },
                    { id: "b", name: "B", uri: "u" }
                ]
            })
        );
        expect(line).toContain("A, B");
    });
});

describe("progressBar", () => {
    it("fills proportionally to progress", () => {
        const bar = stripAnsi(progressBar(50, 100, 10));
        // 10-cell bar, half filled
        expect(bar.length).toBe(10);
    });

    it("clamps when progress exceeds duration", () => {
        expect(() => progressBar(200, 100, 10)).not.toThrow();
        const bar = stripAnsi(progressBar(200, 100, 10));
        expect(bar.length).toBe(10);
    });

    it("handles zero duration without dividing by zero", () => {
        const bar = stripAnsi(progressBar(0, 0, 10));
        expect(bar.length).toBe(10);
    });
});
