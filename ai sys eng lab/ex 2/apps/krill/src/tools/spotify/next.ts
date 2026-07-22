import { z } from "zod";
import { defineTool } from "@krill/agent-core";
import type { KrillCtx } from "../context.js";

export const nextTrack = defineTool<KrillCtx, Record<string, never>>({
    name: "next_track",
    description: "Skip to the next track.",
    parameters: z.object({}),
    async execute(_args, { deps: { spotify } }) {
        await spotify.player.next();
        return { llm: { ok: true } };
    }
});
