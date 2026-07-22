export { SpotifyClient } from "./client.js";
export type { SpotifyClientOptions } from "./client.js";

export { SpotifyHttp } from "./http.js";
export type { SpotifyHttpDeps, CallOptions } from "./http.js";

export {
    SpotifyError,
    AuthError,
    NoActiveDeviceError,
    PremiumRequiredError,
    RateLimitError,
    fromHttpResponse
} from "./errors.js";

export { PlayerResource } from "./resources/player.js";
export type { PlayOptions } from "./resources/player.js";
export { PlaylistsResource } from "./resources/playlists.js";
export type { CreatePlaylistOptions, ReorderOptions, UpdateDetailsOptions } from "./resources/playlists.js";
export { CatalogResource } from "./resources/catalog.js";
export type { SearchOptions } from "./resources/catalog.js";
export { LibraryResource } from "./resources/library.js";
export type { TimeRange } from "./resources/library.js";

export { toUri, parseUri, formatDuration, ensureActiveDevice } from "./helpers.js";

export { buildAuthUrl, exchangeCode, refresh } from "./auth/oauth.js";
export type { OAuthConfig, OAuthDeps } from "./auth/oauth.js";
export { createVerifier, challengeFromVerifier } from "./auth/pkce.js";
export { FileTokenStore } from "./auth/tokenStore.js";
export type { TokenStore, StoredTokens } from "./auth/tokenStore.js";
export { waitForCallback } from "./auth/callbackServer.js";
export type { CallbackOptions, PendingCallback } from "./auth/callbackServer.js";

export type * from "./types.js";
