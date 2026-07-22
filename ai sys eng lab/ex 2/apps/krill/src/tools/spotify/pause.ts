import { z } from "zod";
import { defineTool } from "@krill/agent-core";
import type { KrillCtx } from "../context.js";

export const pause = defineTool<KrillCtx, Record<string, never>>({
    name: "pause",
    description: "Pause the current playback.",
    parameters: z.object({}),
    async execute(_args, { deps: { spotify } }) {
        await spotify.player.pause();
        return { llm: { ok: true } };
    }
});
