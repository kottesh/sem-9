import { z } from "zod";
import { defineTool } from "@krill/agent-core";
import type { KrillCtx } from "../context.js";

export const recallPreferences = defineTool<KrillCtx, { query: string }>({
    name: "recall_preferences",
    description: "Look up what we know about the user's music taste, relevant to a query.",
    parameters: z.object({ query: z.string().describe("What to recall, e.g. 'workout music preferences'") }),
    async execute(args, { deps: { memory } }) {
        const context = await memory.recall(args.query);
        return { llm: { context: context || "(nothing remembered yet)" } };
    }
});
