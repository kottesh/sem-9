import { z } from "zod";
import { defineTool } from "@krill/agent-core";
import type { KrillCtx } from "../context.js";

export const addTracksToPlaylist = defineTool<KrillCtx, { playlistId: string; uris: string[] }>({
    name: "add_tracks_to_playlist",
    description: "Add one or more track URIs to a playlist (auto-chunks large lists).",
    parameters: z.object({
        playlistId: z.string(),
        uris: z.array(z.string()).describe("Track URIs, e.g. ['spotify:track:...']")
    }),
    async execute(args, { deps: { spotify } }) {
        await spotify.playlists.addTracks(args.playlistId, args.uris);
        return { llm: { ok: true, added: args.uris.length } };
    }
});
