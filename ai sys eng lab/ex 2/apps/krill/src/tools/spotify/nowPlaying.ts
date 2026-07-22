import { z } from "zod";
import { defineTool } from "@krill/agent-core";
import type { KrillCtx } from "../context.js";

export const getNowPlaying = defineTool<KrillCtx, Record<string, never>>({
    name: "get_now_playing",
    description: "Get the currently playing track and playback state.",
    parameters: z.object({}),
    async execute(_args, { deps: { spotify, ui } }) {
        const state = await spotify.player.getPlaybackState();
        if (!state || !state.item) {
            return { llm: { playing: false } };
        }
        const t = state.item;
        return {
            llm: {
                playing: state.is_playing,
                track: `${t.name} — ${t.artists.map((a) => a.name).join(", ")}`,
                uri: t.uri
            },
            render: () => ui.nowPlaying(t, state)
        };
    }
});
