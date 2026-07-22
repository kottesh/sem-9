import { z } from "zod";
import { defineTool } from "@krill/agent-core";
import type { KrillCtx } from "../context.js";

export const getArtistTopTracks = defineTool<KrillCtx, { artistQuery: string }>({
    name: "get_artist_top_tracks",
    description: "Find an artist by name and return their top tracks (useful for discovery).",
    parameters: z.object({ artistQuery: z.string().describe("Artist name to search for") }),
    async execute(args, { deps: { spotify, ui } }) {
        const result = await spotify.catalog.search(args.artistQuery, ["artist"], { limit: 1 });
        const artist = result.artists?.items?.[0];
        if (!artist) {
            return { llm: { ok: false, reason: `No artist found for "${args.artistQuery}"` } };
        }
        const tracks = await spotify.catalog.getArtistTopTracks(artist.id);
        return {
            llm: {
                artist: artist.name,
                tracks: tracks.map((t) => ({ uri: t.uri, name: t.name }))
            },
            render: () => ui.trackList(tracks)
        };
    }
});
