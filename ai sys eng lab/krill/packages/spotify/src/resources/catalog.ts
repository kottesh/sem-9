import type { SpotifyHttp } from "../http.js";
import type { Track, Artist, Album, AlbumRef, SearchType, SearchResult, PagingObject } from "../types.js";

export interface SearchOptions {
    limit?: number;
    offset?: number;
    market?: string;
}

export class CatalogResource {
    constructor(private readonly http: SpotifyHttp) {}

    /** Raw search across one or more types. */
    async search(query: string, types: SearchType[], opts: SearchOptions = {}): Promise<SearchResult> {
        const q: Record<string, string | number | undefined> = {
            q: query,
            type: types.join(","),
            limit: opts.limit ?? 20,
            offset: opts.offset ?? 0
        };
        if (opts.market) q.market = opts.market;
        return (await this.http.request<SearchResult>("/search", { query: q })) ?? {};
    }

    /** Convenience: search for tracks and return the flat list. */
    async searchTracks(query: string, opts: SearchOptions = {}): Promise<Track[]> {
        const result = await this.search(query, ["track"], opts);
        return result.tracks?.items ?? [];
    }

    async getTrack(id: string): Promise<Track> {
        return (await this.http.request<Track>(`/tracks/${id}`, undefined))!;
    }

    async getTracks(ids: string[]): Promise<Track[]> {
        const res = await this.http.request<{ tracks: Track[] }>("/tracks", { query: { ids: ids.join(",") } });
        return res?.tracks ?? [];
    }

    async getArtist(id: string): Promise<Artist> {
        return (await this.http.request<Artist>(`/artists/${id}`, undefined))!;
    }

    async getArtistTopTracks(id: string, market = "US"): Promise<Track[]> {
        const res = await this.http.request<{ tracks: Track[] }>(`/artists/${id}/top-tracks`, { query: { market } });
        return res?.tracks ?? [];
    }

    async getArtistAlbums(id: string, opts: SearchOptions = {}): Promise<AlbumRef[]> {
        const res = await this.http.request<PagingObject<AlbumRef>>(`/artists/${id}/albums`, {
            query: { limit: opts.limit ?? 20, offset: opts.offset ?? 0 }
        });
        return res?.items ?? [];
    }

    async getAlbum(id: string): Promise<Album> {
        return (await this.http.request<Album>(`/albums/${id}`, undefined))!;
    }

    async getAlbumTracks(id: string, opts: SearchOptions = {}): Promise<Track[]> {
        const res = await this.http.request<PagingObject<Track>>(`/albums/${id}/tracks`, {
            query: { limit: opts.limit ?? 50, offset: opts.offset ?? 0 }
        });
        return res?.items ?? [];
    }
}
