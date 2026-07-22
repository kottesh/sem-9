import { z } from "zod";
import type { Tool, ToolResult } from "./tool.js";

/** Collects tools, exposes their neutral definitions, and dispatches calls. */
export class ToolRegistry<C> {
    private readonly tools = new Map<string, Tool<C>>();

    constructor(private readonly deps: C) {}

    register(...tools: Tool<C>[]): this {
        for (const t of tools) this.tools.set(t.name, t);
        return this;
    }

    /** Neutral tool list handed to a provider adapter. */
    list(): Tool<C>[] {
        return [...this.tools.values()];
    }

    /**
     * Validate args, execute the tool, and always resolve to a ToolResult.
     * Errors (unknown tool, bad args, thrown) become `{ llm: { error } }` so the
     * agent loop can surface them to the model and keep going.
     */
    async dispatch(name: string, rawArgs: unknown, signal?: AbortSignal): Promise<ToolResult> {
        const tool = this.tools.get(name);
        if (!tool) {
            return { llm: { error: `Unknown tool: ${name}` } };
        }

        let args: unknown;
        try {
            args = tool.parameters.parse(rawArgs);
        } catch (err) {
            return { llm: { error: formatZodError(err) } };
        }

        try {
            return await tool.execute(args as never, { deps: this.deps, signal });
        } catch (err) {
            return { llm: { error: err instanceof Error ? err.message : String(err) } };
        }
    }
}

function formatZodError(err: unknown): string {
    if (err instanceof z.ZodError) {
        return err.issues.map((i) => `${i.path.join(".") || "arg"}: ${i.message}`).join("; ");
    }
    return err instanceof Error ? err.message : String(err);
}
