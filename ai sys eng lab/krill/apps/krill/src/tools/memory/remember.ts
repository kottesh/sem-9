import { z } from "zod";
import { defineTool } from "@krill/agent-core";
import type { KrillCtx } from "../context.js";

export const rememberPreference = defineTool<KrillCtx, { fact: string }>({
    name: "remember_preference",
    description:
        "Save a durable fact about the user's music taste (favorite artists, genres, moods, dislikes) for future sessions.",
    parameters: z.object({ fact: z.string().describe("A concise preference, e.g. 'loves shoegaze, dislikes country'") }),
    async execute(args, { deps: { memory } }) {
        await memory.remember(args.fact);
        return { llm: { ok: true } };
    }
});
