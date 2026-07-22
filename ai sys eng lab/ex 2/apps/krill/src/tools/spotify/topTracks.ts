import { z } from "zod";
import { defineTool } from "@krill/agent-core";
import type { KrillCtx } from "../context.js";

export const getTopTracks = defineTool<KrillCtx, { timeRange?: "short_term" | "medium_term" | "long_term" }>({
    name: "get_top_tracks",
    description: "Get the user's most-listened tracks. Great for understanding their taste.",
    parameters: z.object({
        timeRange: z.enum(["short_term", "medium_term", "long_term"]).optional().describe("Default medium_term (~6 months)")
    }),
    async execute(args, { deps: { spotify, ui } }) {
        const tracks = await spotify.library.getTopTracks(args.timeRange ?? "medium_term", 20);
        return {
            llm: {
                tracks: tracks.map((t) => ({ uri: t.uri, name: t.name, artist: t.artists.map((a) => a.name).join(", ") }))
            },
            render: () => ui.trackList(tracks)
        };
    }
});
