import { z } from "zod";
import { defineTool } from "@krill/agent-core";
import type { KrillCtx } from "../context.js";

export const createPlaylist = defineTool<KrillCtx, { name: string; description?: string; public?: boolean }>({
    name: "create_playlist",
    description: "Create a new playlist owned by the current user.",
    parameters: z.object({
        name: z.string(),
        description: z.string().optional(),
        public: z.boolean().optional().describe("Whether the playlist is public, default false")
    }),
    async execute(args, { deps: { spotify, ui } }) {
        const me = await spotify.library.getMe();
        const playlist = await spotify.playlists.create(me.id, args.name, {
            description: args.description,
            public: args.public ?? false
        });
        return {
            llm: { ok: true, playlistId: playlist.id, uri: playlist.uri, name: playlist.name },
            render: () => ui.playlistCard(playlist, 0)
        };
    }
});
