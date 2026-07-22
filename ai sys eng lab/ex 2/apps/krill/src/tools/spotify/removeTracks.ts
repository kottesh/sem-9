import { z } from "zod";
import { defineTool } from "@krill/agent-core";
import type { KrillCtx } from "../context.js";

export const removeTracks = defineTool<KrillCtx, { playlistId: string; uris: string[] }>({
    name: "remove_tracks",
    description: "Remove track URIs from a playlist.",
    parameters: z.object({ playlistId: z.string(), uris: z.array(z.string()) }),
    async execute(args, { deps: { spotify } }) {
        await spotify.playlists.removeTracks(args.playlistId, args.uris);
        return { llm: { ok: true, removed: args.uris.length } };
    }
});
