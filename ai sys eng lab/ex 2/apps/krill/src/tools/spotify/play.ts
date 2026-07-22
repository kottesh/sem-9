import { z } from "zod";
import { defineTool } from "@krill/agent-core";
import type { KrillCtx } from "../context.js";

export const play = defineTool<KrillCtx, { uri?: string; query?: string }>({
    name: "play",
    description:
        "Start or resume playback. Provide a track URI, or a search query to play the top match, or nothing to resume.",
    parameters: z.object({
        uri: z.string().optional().describe("A spotify:track:... / spotify:album:... / spotify:playlist:... URI"),
        query: z.string().optional().describe("Text to search and play the top track hit")
    }),
    async execute(args, { deps: { spotify, ui } }) {
        const deviceId = await spotify.ensureActiveDevice();

        if (!args.uri && args.query) {
            const [hit] = await spotify.catalog.searchTracks(args.query, { limit: 1 });
            if (!hit) {
                return { llm: { ok: false, reason: `No track found for "${args.query}"` } };
            }
            await spotify.player.play({ uris: [hit.uri], deviceId });
            return {
                llm: { ok: true, playing: `${hit.name} — ${hit.artists.map((a) => a.name).join(", ")}` },
                render: () => ui.nowPlaying(hit)
            };
        }

        if (args.uri) {
            await spotify.player.play({ uris: [args.uri], deviceId });
            return { llm: { ok: true, playing: args.uri } };
        }

        await spotify.player.play({ deviceId });
        return { llm: { ok: true, playing: "resumed" } };
    }
});
