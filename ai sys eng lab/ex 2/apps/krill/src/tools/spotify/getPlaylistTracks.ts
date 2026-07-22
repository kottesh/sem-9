import { z } from "zod";
import { defineTool } from "@krill/agent-core";
import type { KrillCtx } from "../context.js";

export const getPlaylistTracks = defineTool<KrillCtx, { playlistId: string }>({
    name: "get_playlist_tracks",
    description: "Get all tracks in a playlist.",
    parameters: z.object({ playlistId: z.string() }),
    async execute(args, { deps: { spotify, ui } }) {
        const tracks = await spotify.playlists.getTracks(args.playlistId);
        return {
            llm: {
                count: tracks.length,
                tracks: tracks.map((t) => ({ uri: t.uri, name: t.name, artist: t.artists.map((a) => a.name).join(", ") }))
            },
            render: () => ui.trackList(tracks)
        };
    }
});
