import { z } from "zod";
import { defineTool } from "@agent/core";
import type { CappyCtx } from "./context.js";

/** Persist a durable fact about the user (target role, industry, seniority, prior feedback). */
export const rememberContext = defineTool<CappyCtx, { fact: string }>({
    name: "remember_context",
    description:
        "Save a durable fact about the user for future sessions: target role, seniority, industry, or a resume preference.",
    parameters: z.object({ fact: z.string().describe("The fact to remember, phrased as a statement") }),
    async execute(args, { deps: { memory } }) {
        await memory.remember(args.fact);
        return { llm: { ok: true, remembered: args.fact } };
    }
});

/** Retrieve relevant remembered facts. */
export const recallContext = defineTool<CappyCtx, { query: string }>({
    name: "recall_context",
    description: "Recall previously saved facts about the user relevant to a query.",
    parameters: z.object({ query: z.string().describe("What to recall, e.g. 'career goals'") }),
    async execute(args, { deps: { memory } }) {
        const facts = await memory.recall(args.query);
        return { llm: { facts } };
    }
});
