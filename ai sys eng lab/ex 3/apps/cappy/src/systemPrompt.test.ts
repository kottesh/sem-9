import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "./systemPrompt.js";

describe("buildSystemPrompt", () => {
    it("establishes the resume-reviewer persona", () => {
        const p = buildSystemPrompt("");
        expect(p).toMatch(/cappy/i);
        expect(p).toMatch(/resume|cv/i);
    });

    it("mentions the available tools and reading first", () => {
        const p = buildSystemPrompt("");
        expect(p).toMatch(/read_file/);
        expect(p).toMatch(/bash/);
    });

    it("injects the memory context block when present", () => {
        const p = buildSystemPrompt("User targets senior SWE roles.");
        expect(p).toContain("User targets senior SWE roles.");
    });

    it("omits the memory section when context is empty", () => {
        const p = buildSystemPrompt("   ");
        expect(p).not.toMatch(/What you remember/);
    });
});
