import { describe, it, expect } from "vitest";
import { Spinner, SPINNER_FRAMES } from "./spinner.js";

describe("Spinner", () => {
    it("cycles through frames on each tick", () => {
        const s = new Spinner();
        expect(s.frame()).toBe(SPINNER_FRAMES[0]);
        expect(s.frame()).toBe(SPINNER_FRAMES[1]);
    });

    it("wraps back to the first frame", () => {
        const s = new Spinner();
        for (let i = 0; i < SPINNER_FRAMES.length; i++) s.frame();
        expect(s.frame()).toBe(SPINNER_FRAMES[0]);
    });
});
