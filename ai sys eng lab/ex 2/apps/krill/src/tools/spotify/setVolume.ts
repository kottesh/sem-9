import { z } from "zod";
import { defineTool } from "@krill/agent-core";
import type { KrillCtx } from "../context.js";

export const setVolume = defineTool<KrillCtx, { percent: number }>({
    name: "set_volume",
    description: "Set playback volume (0-100).",
    parameters: z.object({ percent: z.number().int().min(0).max(100) }),
    async execute(args, { deps: { spotify } }) {
        await spotify.player.setVolume(args.percent);
        return { llm: { ok: true, volume: args.percent } };
    }
});
