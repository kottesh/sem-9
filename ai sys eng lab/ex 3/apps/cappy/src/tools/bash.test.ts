import { describe, it, expect } from "vitest";
import { bashTool } from "./bash.js";

const ctx = (over: Partial<{ defaultTimeoutMs: number; maxTimeoutMs: number }> = {}) =>
    ({
        deps: {
            bash: { defaultTimeoutMs: over.defaultTimeoutMs ?? 5000, maxTimeoutMs: over.maxTimeoutMs ?? 60000 },
            ui: { bashResult: () => {} }
        }
    }) as any;

describe("bash tool", () => {
    it("runs a command and returns stdout + exitCode", async () => {
        const res = await bashTool.execute({ command: "echo hello" }, ctx());
        expect(res.llm).toMatchObject({ exitCode: 0, timedOut: false });
        expect((res.llm as any).stdout.trim()).toBe("hello");
    });

    it("captures stderr and a nonzero exit code", async () => {
        const res = await bashTool.execute({ command: "echo oops >&2; exit 3" }, ctx());
        expect((res.llm as any).exitCode).toBe(3);
        expect((res.llm as any).stderr.trim()).toBe("oops");
    });

    it("is not cwd-locked: can read the real working directory", async () => {
        const res = await bashTool.execute({ command: "pwd" }, ctx());
        expect((res.llm as any).stdout.trim().length).toBeGreaterThan(0);
    });

    it("times out and reports timedOut when the command exceeds the limit", async () => {
        const res = await bashTool.execute({ command: "sleep 5", timeoutMs: 200 }, ctx());
        expect((res.llm as any).timedOut).toBe(true);
    });

    it("clamps an agent-requested timeout to maxTimeoutMs", async () => {
        // request a huge timeout but a fast command; it should still finish fine
        const res = await bashTool.execute({ command: "echo ok", timeoutMs: 999999999 }, ctx({ maxTimeoutMs: 1000 }));
        expect((res.llm as any).exitCode).toBe(0);
        expect((res.llm as any).requestedTimeoutMs).toBe(1000);
    });

    it("truncates very large output", async () => {
        const res = await bashTool.execute({ command: "yes x | head -c 200000" }, ctx());
        expect((res.llm as any).stdout.length).toBeLessThan(200000);
        expect((res.llm as any).truncated).toBe(true);
    });
});
