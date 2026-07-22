import { SpotifyHttp } from "./http.js";
import { PlayerResource } from "./resources/player.js";
import { PlaylistsResource } from "./resources/playlists.js";
import { CatalogResource } from "./resources/catalog.js";
import { LibraryResource } from "./resources/library.js";
import { ensureActiveDevice } from "./helpers.js";
import { refresh as refreshTokens } from "./auth/oauth.js";
import type { OAuthConfig } from "./auth/oauth.js";
import type { TokenStore } from "./auth/tokenStore.js";

export interface SpotifyClientOptions {
    oauth: OAuthConfig;
    tokenStore: TokenStore;
    fetchImpl?: typeof fetch;
}

/** High-level Spotify client composing the resource modules over one HTTP layer. */
export class SpotifyClient {
    readonly player: PlayerResource;
    readonly playlists: PlaylistsResource;
    readonly catalog: CatalogResource;
    readonly library: LibraryResource;

    constructor(private readonly opts: SpotifyClientOptions) {
        const http = new SpotifyHttp({
            getTokens: () => opts.tokenStore.load(),
            saveTokens: (t) => opts.tokenStore.save(t),
            refresh: (rt) => refreshTokens(opts.oauth, rt, { fetchImpl: opts.fetchImpl }),
            fetchImpl: opts.fetchImpl as never
        });
        this.player = new PlayerResource(http);
        this.playlists = new PlaylistsResource(http);
        this.catalog = new CatalogResource(http);
        this.library = new LibraryResource(http);
    }

    /** Ensure a playback device is active; returns its id. */
    ensureActiveDevice(): Promise<string> {
        return ensureActiveDevice(this.player);
    }
}
