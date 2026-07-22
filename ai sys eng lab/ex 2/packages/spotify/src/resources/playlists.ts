import type { SpotifyHttp } from "../http.js";
import type { Playlist, Track, PagingObject } from "../types.js";

export interface CreatePlaylistOptions {
    description?: string;
    public?: boolean;
}

export interface ReorderOptions {
    rangeStart: number;
    insertBefore: number;
    rangeLength?: number;
}

export interface UpdateDetailsOptions {
    name?: string;
    description?: string;
    public?: boolean;
}

const MAX_URIS_PER_REQUEST = 100;

function chunk<T>(items: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        out.push(items.slice(i, i + size));
    }
    return out;
}

export class PlaylistsResource {
    constructor(private readonly http: SpotifyHttp) {}

    async create(userId: string, name: string, opts: CreatePlaylistOptions = {}): Promise<Playlist> {
        return (await this.http.request<Playlist>(`/users/${userId}/playlists`, {
            method: "POST",
            body: { name, description: opts.description ?? "", public: opts.public ?? false }
        }))!;
    }

    async get(playlistId: string): Promise<Playlist> {
        return (await this.http.request<Playlist>(`/playlists/${playlistId}`, undefined))!;
    }

    async getMine(limit = 20, offset = 0): Promise<Playlist[]> {
        const res = await this.http.request<PagingObject<Playlist>>("/me/playlists", { query: { limit, offset } });
        return res?.items ?? [];
    }

    /** Fetch all tracks in a playlist, following pagination. */
    async getTracks(playlistId: string): Promise<Track[]> {
        const tracks: Track[] = [];
        let path: string | null = `/playlists/${playlistId}/tracks`;
        let query: Record<string, number> | undefined = { limit: 100, offset: 0 };

        while (path) {
            const page: PagingObject<{ track: Track }> | null = await this.http.request(path, query ? { query } : undefined);
            if (!page) break;
            for (const item of page.items) {
                if (item.track) tracks.push(item.track);
            }
            path = page.next;
            query = undefined; // `next` is a full URL already
        }
        return tracks;
    }

    /** Add tracks, automatically chunking to the 100-URI limit. */
    async addTracks(playlistId: string, uris: string[]): Promise<void> {
        if (uris.length === 0) return;
        for (const batch of chunk(uris, MAX_URIS_PER_REQUEST)) {
            await this.http.request(`/playlists/${playlistId}/tracks`, { method: "POST", body: { uris: batch } });
        }
    }

    async removeTracks(playlistId: string, uris: string[]): Promise<void> {
        if (uris.length === 0) return;
        for (const batch of chunk(uris, MAX_URIS_PER_REQUEST)) {
            await this.http.request(`/playlists/${playlistId}/tracks`, {
                method: "DELETE",
                body: { tracks: batch.map((uri) => ({ uri })) }
            });
        }
    }

    async reorderTracks(playlistId: string, opts: ReorderOptions): Promise<void> {
        const body: Record<string, number> = {
            range_start: opts.rangeStart,
            insert_before: opts.insertBefore
        };
        if (opts.rangeLength !== undefined) body.range_length = opts.rangeLength;
        await this.http.request(`/playlists/${playlistId}/tracks`, { method: "PUT", body });
    }

    async replaceTracks(playlistId: string, uris: string[]): Promise<void> {
        await this.http.request(`/playlists/${playlistId}/tracks`, {
            method: "PUT",
            body: { uris: uris.slice(0, MAX_URIS_PER_REQUEST) }
        });
    }

    async updateDetails(playlistId: string, opts: UpdateDetailsOptions): Promise<void> {
        const body: Record<string, unknown> = {};
        if (opts.name !== undefined) body.name = opts.name;
        if (opts.description !== undefined) body.description = opts.description;
        if (opts.public !== undefined) body.public = opts.public;
        await this.http.request(`/playlists/${playlistId}`, { method: "PUT", body });
    }

    async unfollow(playlistId: string): Promise<void> {
        await this.http.request(`/playlists/${playlistId}/followers`, { method: "DELETE" });
    }
}
