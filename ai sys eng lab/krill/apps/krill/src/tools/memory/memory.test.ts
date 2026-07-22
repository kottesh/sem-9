import { describe, it, expect, vi } from "vitest";
import { rememberPreference } from "./remember.js";
import { recallPreferences } from "./recall.js";
import type { KrillCtx } from "../context.js";

function ctx() {
    const memory = {
        remember: vi.fn(async () => {}),
        recall: vi.fn(async () => "user likes lo-fi"),
        addTurn: vi.fn(),
        getContext: vi.fn()
    };
    return { spotify: {} as any, ui: {} as any, memory } as unknown as KrillCtx;
}

describe("rememberPreference tool", () => {
    it("stores a fact via memory.remember", async () => {
        const c = ctx();
        const res = await rememberPreference.execute({ fact: "likes jazz on rainy days" }, { deps: c });
        expect(c.memory.remember).toHaveBeenCalledWith("likes jazz on rainy days");
        expect(res.llm).toMatchObject({ ok: true });
    });
});

describe("recallPreferences tool", () => {
    it("queries memory.recall and returns the result", async () => {
        const c = ctx();
        const res = await recallPreferences.execute({ query: "what genres" }, { deps: c });
        expect(c.memory.recall).toHaveBeenCalledWith("what genres");
        expect(res.llm).toMatchObject({ context: "user likes lo-fi" });
    });
});
