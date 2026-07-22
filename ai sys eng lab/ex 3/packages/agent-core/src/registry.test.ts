import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { ToolRegistry } from "./registry.js";
import { defineTool } from "./tool.js";

interface Deps {
    marker: string;
}

const echo = defineTool<Deps, { text: string }>({
    name: "echo",
    description: "echo text",
    parameters: z.object({ text: z.string() }),
    async execute(args, ctx) {
        return { llm: { echoed: args.text, marker: ctx.deps.marker } };
    }
});

const boom = defineTool<Deps, Record<string, never>>({
    name: "boom",
    description: "always throws",
    parameters: z.object({}),
    async execute() {
        throw new Error("kaboom");
    }
});

describe("ToolRegistry", () => {
    it("registers tools and lists them", () => {
        const reg = new ToolRegistry<Deps>({ marker: "m" }).register(echo, boom);
        expect(reg.list().map((t) => t.name).sort()).toEqual(["boom", "echo"]);
    });

    it("dispatch validates args and injects deps", async () => {
        const reg = new ToolRegistry<Deps>({ marker: "M1" }).register(echo);
        const res = await reg.dispatch("echo", { text: "hi" });
        expect(res.llm).toEqual({ echoed: "hi", marker: "M1" });
    });

    it("dispatch returns an error result for an unknown tool", async () => {
        const reg = new ToolRegistry<Deps>({ marker: "m" });
        const res = await reg.dispatch("nope", {});
        expect(res.llm).toMatchObject({ error: expect.stringMatching(/unknown tool/i) });
    });

    it("dispatch returns a validation error result for bad args", async () => {
        const reg = new ToolRegistry<Deps>({ marker: "m" }).register(echo);
        const res = await reg.dispatch("echo", { text: 123 });
        expect(res.llm).toMatchObject({ error: expect.stringMatching(/text/i) });
    });

    it("dispatch catches thrown errors and returns them as data", async () => {
        const reg = new ToolRegistry<Deps>({ marker: "m" }).register(boom);
        const res = await reg.dispatch("boom", {});
        expect(res.llm).toMatchObject({ error: "kaboom" });
    });

    it("passes an abort signal through to execute", async () => {
        const seen = vi.fn();
        const spy = defineTool<Deps, Record<string, never>>({
            name: "spy",
            description: "d",
            parameters: z.object({}),
            async execute(_args, ctx) {
                seen(ctx.signal);
                return { llm: null };
            }
        });
        const ctrl = new AbortController();
        const reg = new ToolRegistry<Deps>({ marker: "m" }).register(spy);
        await reg.dispatch("spy", {}, ctrl.signal);
        expect(seen).toHaveBeenCalledWith(ctrl.signal);
    });
});
