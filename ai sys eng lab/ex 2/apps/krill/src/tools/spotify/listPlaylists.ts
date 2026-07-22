import { z } from "zod";
import { defineTool } from "@krill/agent-core";
import type { KrillCtx } from "../context.js";

export const listMyPlaylists = defineTool<KrillCtx, { limit?: number }>({
    name: "list_my_playlists",
    description: "List the current user's playlists.",
    parameters: z.object({ limit: z.number().int().min(1).max(50).optional() }),
    async execute(args, { deps: { spotify } }) {
        const playlists = await spotify.playlists.getMine(args.limit ?? 20);
        return {
            llm: { playlists: playlists.map((p) => ({ id: p.id, name: p.name, tracks: p.tracks.total })) }
        };
    }
});
