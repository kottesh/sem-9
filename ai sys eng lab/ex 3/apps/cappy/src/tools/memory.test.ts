import { describe, it, expect, vi } from "vitest";
import { rememberContext, recallContext } from "./memory.js";

const ctx = (over: any = {}) =>
    ({
        deps: {
            memory: {
                remember: vi.fn(async () => {}),
                recall: vi.fn(async () => "targets senior SWE roles"),
                ...over
            }
        }
    }) as any;

describe("rememberContext tool", () => {
    it("persists a fact via memory.remember", async () => {
        const c = ctx();
        const res = await rememberContext.execute({ fact: "wants a backend role" }, c);
        expect(c.deps.memory.remember).toHaveBeenCalledWith("wants a backend role");
        expect(res.llm).toMatchObject({ ok: true });
    });
});

describe("recallContext tool", () => {
    it("returns facts from memory.recall", async () => {
        const c = ctx();
        const res = await recallContext.execute({ query: "career goals" }, c);
        expect((res.llm as any).facts).toContain("senior SWE");
    });
});
