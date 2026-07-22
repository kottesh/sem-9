import { z } from "zod";
import { defineTool } from "@krill/agent-core";
import type { KrillCtx } from "../context.js";

export const getRecentlyPlayed = defineTool<KrillCtx, { limit?: number }>({
    name: "get_recently_played",
    description: "Get the user's recently played tracks.",
    parameters: z.object({ limit: z.number().int().min(1).max(50).optional() }),
    async execute(args, { deps: { spotify, ui } }) {
        const tracks = await spotify.player.getRecentlyPlayed(args.limit ?? 20);
        return {
            llm: {
                tracks: tracks.map((t) => ({ uri: t.uri, name: t.name, artist: t.artists.map((a) => a.name).join(", ") }))
            },
            render: () => ui.trackList(tracks)
        };
    }
});
