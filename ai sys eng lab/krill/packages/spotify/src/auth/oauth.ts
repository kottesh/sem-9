import { AuthError } from "../errors.js";
import type { StoredTokens } from "./tokenStore.js";

const AUTH_URL = "https://accounts.spotify.com/authorize";
const TOKEN_URL = "https://accounts.spotify.com/api/token";

export interface OAuthConfig {
    clientId: string;
    redirectUri: string;
    scopes: string[];
}

export interface OAuthDeps {
    fetchImpl?: typeof fetch;
    now?: () => number;
}

interface TokenResponse {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
}

/** Build the Spotify authorize URL for the PKCE flow. */
export function buildAuthUrl(cfg: OAuthConfig, codeChallenge: string, state: string): string {
    const params = new URLSearchParams({
        response_type: "code",
        client_id: cfg.clientId,
        redirect_uri: cfg.redirectUri,
        code_challenge_method: "S256",
        code_challenge: codeChallenge,
        state,
        scope: cfg.scopes.join(" ")
    });
    return `${AUTH_URL}?${params.toString()}`;
}

async function postToken(
    body: URLSearchParams,
    existingRefreshToken: string | undefined,
    deps: OAuthDeps
): Promise<StoredTokens> {
    const fetchImpl = deps.fetchImpl ?? fetch;
    const now = deps.now ?? Date.now;

    const res = await fetchImpl(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body
    });

    if (!res.ok) {
        let detail = "";
        try {
            detail = await res.text();
        } catch {
            /* ignore */
        }
        throw new AuthError(`Token request failed (${res.status}): ${detail}`, res.status);
    }

    const data = (await res.json()) as TokenResponse;
    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? existingRefreshToken ?? "",
        expiresAt: now() + data.expires_in * 1000,
        scope: data.scope ?? ""
    };
}

/** Exchange an authorization code for tokens. */
export function exchangeCode(
    cfg: OAuthConfig,
    code: string,
    codeVerifier: string,
    deps: OAuthDeps = {}
): Promise<StoredTokens> {
    const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: cfg.redirectUri,
        client_id: cfg.clientId,
        code_verifier: codeVerifier
    });
    return postToken(body, undefined, deps);
}

/** Refresh an access token. Preserves the current refresh token unless rotated. */
export function refresh(cfg: OAuthConfig, refreshToken: string, deps: OAuthDeps = {}): Promise<StoredTokens> {
    const body = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: cfg.clientId
    });
    return postToken(body, refreshToken, deps);
}
