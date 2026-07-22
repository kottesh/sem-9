import { z } from "zod";
import { defineTool } from "@krill/agent-core";
import type { KrillCtx } from "../context.js";

export const search = defineTool<KrillCtx, { query: string; limit?: number }>({
    name: "search_music",
    description: "Search Spotify for tracks matching a query. Returns track URIs to use with other tools.",
    parameters: z.object({
        query: z.string().describe("Free-text search, e.g. 'chill tame impala' or 'artist:Radiohead'"),
        limit: z.number().int().min(1).max(20).optional().describe("Max results, default 8")
    }),
    async execute(args, { deps: { spotify, ui } }) {
        const tracks = await spotify.catalog.searchTracks(args.query, { limit: args.limit ?? 8 });
        return {
            llm: {
                results: tracks.map((t) => ({
                    uri: t.uri,
                    name: t.name,
                    artist: t.artists.map((a) => a.name).join(", ")
                }))
            },
            render: () => ui.trackList(tracks)
        };
    }
});
