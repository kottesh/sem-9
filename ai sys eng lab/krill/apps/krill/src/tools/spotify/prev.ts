import { z } from "zod";
import { defineTool } from "@krill/agent-core";
import type { KrillCtx } from "../context.js";

export const previousTrack = defineTool<KrillCtx, Record<string, never>>({
    name: "previous_track",
    description: "Go back to the previous track.",
    parameters: z.object({}),
    async execute(_args, { deps: { spotify } }) {
        await spotify.player.previous();
        return { llm: { ok: true } };
    }
});
