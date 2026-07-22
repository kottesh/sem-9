import { z } from "zod";
import { defineTool } from "@krill/agent-core";
import type { KrillCtx } from "../context.js";

/**
 * Spotify's Web API has NO endpoint to clear/remove the queue. The reliable
 * workaround is to restart playback of a fresh context, which drops the
 * manually-queued items. We replay the currently playing track (in its album
 * context, from the current position) so the user keeps listening seamlessly
 * while the pending queue is flushed.
 */
export const clearQueue = defineTool<KrillCtx, Record<string, never>>({
    name: "clear_queue",
    description:
        "Clear the up-next queue. Spotify has no native clear-queue endpoint, so this flushes queued items by restarting the current track fresh (playback continues from where it is).",
    parameters: z.object({}),
    async execute(_args, { deps: { spotify } }) {
        const state = await spotify.player.getPlaybackState();
        const track = state?.item;
        if (!track) {
            return {
                llm: {
                    ok: false,
                    reason: "Nothing is playing, so there's no active queue to clear. Start something first."
                }
            };
        }

        const deviceId = await spotify.ensureActiveDevice();
        const positionMs = state?.progress_ms ?? 0;

        if (track.album?.uri) {
            await spotify.player.play({
                contextUri: track.album.uri,
                offset: { uri: track.uri },
                positionMs,
                deviceId
            });
        } else {
            await spotify.player.play({ uris: [track.uri], positionMs, deviceId });
        }

        return {
            llm: {
                ok: true,
                note: "Queue flushed by restarting the current track. Spotify's API can't remove queued items directly.",
                nowPlaying: `${track.name} — ${track.artists.map((a) => a.name).join(", ")}`
            }
        };
    }
});
