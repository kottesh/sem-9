import { NoActiveDeviceError } from "./errors.js";
import type { Device, SearchType } from "./types.js";
import type { PlayerResource } from "./resources/player.js";

const URI_RE = /^spotify:(track|album|artist|playlist|episode|show):([A-Za-z0-9]+)$/;
const URL_RE = /open\.spotify\.com\/(track|album|artist|playlist|episode|show)\/([A-Za-z0-9]+)/;

/** Normalize an id, spotify: URI, or open.spotify.com URL into a URI. */
export function toUri(idOrUriOrUrl: string, type: SearchType | "episode" | "show"): string {
    if (URI_RE.test(idOrUriOrUrl)) return idOrUriOrUrl;
    const urlMatch = idOrUriOrUrl.match(URL_RE);
    if (urlMatch) return `spotify:${urlMatch[1]}:${urlMatch[2]}`;
    return `spotify:${type}:${idOrUriOrUrl}`;
}

/** Parse a spotify: URI into its type and id, or null if not a URI. */
export function parseUri(uri: string): { type: string; id: string } | null {
    const m = uri.match(URI_RE);
    if (!m) return null;
    return { type: m[1]!, id: m[2]! };
}

/** Format a millisecond duration as m:ss. */
export function formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

type PlayerLike = Pick<PlayerResource, "getDevices" | "getPlaybackState" | "transferPlayback">;

/**
 * Ensure there is an active playback device.
 * Returns the active device id, transferring to the first available one if needed.
 */
export async function ensureActiveDevice(player: PlayerLike): Promise<string> {
    const state = await player.getPlaybackState();
    if (state?.device?.id && state.device.is_active) {
        return state.device.id;
    }

    const devices = await player.getDevices();
    const activeDevice = devices.find((d: Device) => d.is_active && d.id);
    if (activeDevice?.id) return activeDevice.id;

    const firstWithId = devices.find((d: Device) => d.id);
    if (!firstWithId?.id) {
        throw new NoActiveDeviceError();
    }

    await player.transferPlayback(firstWithId.id, false);
    return firstWithId.id;
}
