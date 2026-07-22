import type { SpotifyHttp } from "../http.js";
import type { CurrentUser, Track, Artist, PagingObject } from "../types.js";

export type TimeRange = "short_term" | "medium_term" | "long_term";

export class LibraryResource {
    constructor(private readonly http: SpotifyHttp) {}

    async getMe(): Promise<CurrentUser> {
        return (await this.http.request<CurrentUser>("/me", undefined))!;
    }

    async getTopTracks(timeRange: TimeRange = "medium_term", limit = 20): Promise<Track[]> {
        const res = await this.http.request<PagingObject<Track>>("/me/top/tracks", {
            query: { time_range: timeRange, limit }
        });
        return res?.items ?? [];
    }

    async getTopArtists(timeRange: TimeRange = "medium_term", limit = 20): Promise<Artist[]> {
        const res = await this.http.request<PagingObject<Artist>>("/me/top/artists", {
            query: { time_range: timeRange, limit }
        });
        return res?.items ?? [];
    }

    async getSavedTracks(limit = 20, offset = 0): Promise<Track[]> {
        const res = await this.http.request<PagingObject<{ track: Track }>>("/me/tracks", {
            query: { limit, offset }
        });
        return (res?.items ?? []).map((i) => i.track);
    }

    async saveTracks(ids: string[]): Promise<void> {
        if (ids.length === 0) return;
        await this.http.request("/me/tracks", { method: "PUT", body: { ids } });
    }

    async removeSavedTracks(ids: string[]): Promise<void> {
        if (ids.length === 0) return;
        await this.http.request("/me/tracks", { method: "DELETE", body: { ids } });
    }
}
