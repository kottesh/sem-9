import type { SpotifyHttp } from "../http.js";
import type { PlaybackState, Track, Device, RepeatMode } from "../types.js";

export interface PlayOptions {
    /** Track/episode URIs to play. */
    uris?: string[];
    /** Context URI (album/playlist/artist) to play. */
    contextUri?: string;
    /** Target device id. */
    deviceId?: string;
    /** Position within the context. */
    offset?: { position?: number; uri?: string };
    positionMs?: number;
}

function clamp(n: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, n));
}

export class PlayerResource {
    constructor(private readonly http: SpotifyHttp) {}

    async getPlaybackState(): Promise<PlaybackState | null> {
        return await this.http.request<PlaybackState>("/me/player");
    }

    async getCurrentlyPlaying(): Promise<PlaybackState | null> {
        return await this.http.request<PlaybackState>("/me/player/currently-playing");
    }

    async play(opts: PlayOptions = {}): Promise<void> {
        const body: Record<string, unknown> | undefined =
            opts.uris || opts.contextUri || opts.offset || opts.positionMs !== undefined
                ? {
                      ...(opts.uris ? { uris: opts.uris } : {}),
                      ...(opts.contextUri ? { context_uri: opts.contextUri } : {}),
                      ...(opts.offset ? { offset: opts.offset } : {}),
                      ...(opts.positionMs !== undefined ? { position_ms: opts.positionMs } : {})
                  }
                : undefined;

        const req: Record<string, unknown> = { method: "PUT", body };
        if (opts.deviceId) req.query = { device_id: opts.deviceId };
        await this.http.request("/me/player/play", req);
    }

    async pause(): Promise<void> {
        await this.http.request("/me/player/pause", { method: "PUT" });
    }

    async next(): Promise<void> {
        await this.http.request("/me/player/next", { method: "POST" });
    }

    async previous(): Promise<void> {
        await this.http.request("/me/player/previous", { method: "POST" });
    }

    async seek(positionMs: number): Promise<void> {
        await this.http.request("/me/player/seek", { method: "PUT", query: { position_ms: positionMs } });
    }

    async setVolume(percent: number): Promise<void> {
        await this.http.request("/me/player/volume", {
            method: "PUT",
            query: { volume_percent: clamp(Math.round(percent), 0, 100) }
        });
    }

    async setRepeat(state: RepeatMode): Promise<void> {
        await this.http.request("/me/player/repeat", { method: "PUT", query: { state } });
    }

    async setShuffle(state: boolean): Promise<void> {
        await this.http.request("/me/player/shuffle", { method: "PUT", query: { state } });
    }

    async getDevices(): Promise<Device[]> {
        const res = await this.http.request<{ devices: Device[] }>("/me/player/devices");
        return res?.devices ?? [];
    }

    async transferPlayback(deviceId: string, play = false): Promise<void> {
        await this.http.request("/me/player", { method: "PUT", body: { device_ids: [deviceId], play } });
    }

    async addToQueue(uri: string): Promise<void> {
        await this.http.request("/me/player/queue", { method: "POST", query: { uri } });
    }

    async getRecentlyPlayed(limit = 20): Promise<Track[]> {
        const res = await this.http.request<{ items: Array<{ track: Track }> }>("/me/player/recently-played", {
            query: { limit }
        });
        return (res?.items ?? []).map((i) => i.track);
    }
}
