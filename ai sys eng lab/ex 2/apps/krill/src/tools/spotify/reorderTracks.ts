import { z } from "zod";
import { defineTool } from "@krill/agent-core";
import type { KrillCtx } from "../context.js";

export const reorderTracks = defineTool<
    KrillCtx,
    { playlistId: string; rangeStart: number; insertBefore: number; rangeLength?: number }
>({
    name: "reorder_tracks",
    description: "Reorder tracks within a playlist by moving a range to a new position.",
    parameters: z.object({
        playlistId: z.string(),
        rangeStart: z.number().int().min(0),
        insertBefore: z.number().int().min(0),
        rangeLength: z.number().int().min(1).optional()
    }),
    async execute(args, { deps: { spotify } }) {
        await spotify.playlists.reorderTracks(args.playlistId, {
            rangeStart: args.rangeStart,
            insertBefore: args.insertBefore,
            rangeLength: args.rangeLength
        });
        return { llm: { ok: true } };
    }
});
