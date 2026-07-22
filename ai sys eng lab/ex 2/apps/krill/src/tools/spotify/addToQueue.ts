import { z } from "zod";
import { defineTool } from "@krill/agent-core";
import type { KrillCtx } from "../context.js";

export const addToQueue = defineTool<KrillCtx, { uri: string }>({
    name: "add_to_queue",
    description: "Add a track URI to the playback queue.",
    parameters: z.object({ uri: z.string().describe("spotify:track:... URI") }),
    async execute(args, { deps: { spotify } }) {
        await spotify.ensureActiveDevice();
        await spotify.player.addToQueue(args.uri);
        return { llm: { ok: true, queued: args.uri } };
    }
});
