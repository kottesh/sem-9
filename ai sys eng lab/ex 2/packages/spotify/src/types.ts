/** Spotify Web API response models (only the fields krill uses). */

export interface Image {
    url: string;
    height: number | null;
    width: number | null;
}

export interface ArtistRef {
    id: string;
    name: string;
    uri: string;
}

export interface Artist extends ArtistRef {
    genres?: string[];
    popularity?: number;
    images?: Image[];
}

export interface AlbumRef {
    id: string;
    name: string;
    uri: string;
    images?: Image[];
    release_date?: string;
}

export interface Track {
    id: string;
    name: string;
    uri: string;
    duration_ms: number;
    explicit: boolean;
    popularity?: number;
    artists: ArtistRef[];
    album?: AlbumRef;
}

export interface Album extends AlbumRef {
    artists: ArtistRef[];
    total_tracks?: number;
}

export interface Device {
    id: string | null;
    name: string;
    type: string;
    is_active: boolean;
    volume_percent: number | null;
}

export interface PlaybackState {
    device: Device | null;
    is_playing: boolean;
    progress_ms: number | null;
    item: Track | null;
    shuffle_state?: boolean;
    repeat_state?: "off" | "track" | "context";
}

export interface Playlist {
    id: string;
    name: string;
    uri: string;
    description: string | null;
    public: boolean | null;
    owner: { id: string; display_name?: string };
    tracks: { total: number };
    external_urls?: { spotify?: string };
}

export interface PagingObject<T> {
    items: T[];
    total: number;
    limit: number;
    offset: number;
    next: string | null;
    previous: string | null;
}

export interface CurrentUser {
    id: string;
    display_name: string | null;
    product?: string;
}

export type SearchType = "track" | "artist" | "album" | "playlist";

export interface SearchResult {
    tracks?: PagingObject<Track>;
    artists?: PagingObject<Artist>;
    albums?: PagingObject<AlbumRef>;
    playlists?: PagingObject<Playlist>;
}

export type RepeatMode = "off" | "track" | "context";

/** Options passed to the low-level HTTP layer. */
export interface RequestOptions {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    query?: Record<string, string | number | boolean | undefined>;
    body?: unknown;
}
