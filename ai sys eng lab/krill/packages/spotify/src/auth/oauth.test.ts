import { describe, it, expect, vi } from "vitest";
import { buildAuthUrl, exchangeCode, refresh } from "./oauth.js";
import { AuthError } from "../errors.js";

const cfg = {
    clientId: "cid",
    redirectUri: "http://127.0.0.1:8888/callback",
    scopes: ["user-modify-playback-state", "playlist-modify-private"]
};

describe("buildAuthUrl", () => {
    it("builds a Spotify authorize URL with PKCE params", () => {
        const url = new URL(buildAuthUrl(cfg, "challenge123", "state456"));
        expect(url.origin + url.pathname).toBe("https://accounts.spotify.com/authorize");
        expect(url.searchParams.get("response_type")).toBe("code");
        expect(url.searchParams.get("client_id")).toBe("cid");
        expect(url.searchParams.get("redirect_uri")).toBe(cfg.redirectUri);
        expect(url.searchParams.get("code_challenge_method")).toBe("S256");
        expect(url.searchParams.get("code_challenge")).toBe("challenge123");
        expect(url.searchParams.get("state")).toBe("state456");
        expect(url.searchParams.get("scope")).toBe(cfg.scopes.join(" "));
    });
});

function mockFetch(status: number, body: unknown) {
    return vi.fn(async () => ({
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
        text: async () => JSON.stringify(body)
    })) as unknown as typeof fetch;
}

describe("exchangeCode", () => {
    it("posts form params and returns stored tokens with computed expiresAt", async () => {
        const now = 1_000_000;
        const fetchImpl = mockFetch(200, {
            access_token: "AT",
            refresh_token: "RT",
            expires_in: 3600,
            scope: "user-modify-playback-state"
        });
        const tokens = await exchangeCode(cfg, "authcode", "verifier", { fetchImpl, now: () => now });

        expect(tokens.accessToken).toBe("AT");
        expect(tokens.refreshToken).toBe("RT");
        expect(tokens.expiresAt).toBe(now + 3600 * 1000);
        expect(tokens.scope).toBe("user-modify-playback-state");

        const call = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(call[0]).toBe("https://accounts.spotify.com/api/token");
        const init = call[1] as RequestInit;
        const bodyStr = init.body!.toString();
        expect(bodyStr).toContain("grant_type=authorization_code");
        expect(bodyStr).toContain("code=authcode");
        expect(bodyStr).toContain("code_verifier=verifier");
        expect(bodyStr).toContain("client_id=cid");
    });

    it("throws AuthError on non-2xx", async () => {
        const fetchImpl = mockFetch(400, { error: "invalid_grant" });
        await expect(exchangeCode(cfg, "bad", "v", { fetchImpl })).rejects.toBeInstanceOf(AuthError);
    });
});

describe("refresh", () => {
    it("sends refresh_token grant and preserves existing refresh token when omitted", async () => {
        const now = 500;
        const fetchImpl = mockFetch(200, {
            access_token: "AT2",
            expires_in: 3600,
            scope: "s"
        });
        const tokens = await refresh(cfg, "oldRT", { fetchImpl, now: () => now });

        expect(tokens.accessToken).toBe("AT2");
        expect(tokens.refreshToken).toBe("oldRT"); // preserved
        expect(tokens.expiresAt).toBe(now + 3600 * 1000);

        const bodyStr = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body.toString();
        expect(bodyStr).toContain("grant_type=refresh_token");
        expect(bodyStr).toContain("refresh_token=oldRT");
    });

    it("uses a rotated refresh token when the response includes one", async () => {
        const fetchImpl = mockFetch(200, { access_token: "AT2", refresh_token: "newRT", expires_in: 10, scope: "s" });
        const tokens = await refresh(cfg, "oldRT", { fetchImpl });
        expect(tokens.refreshToken).toBe("newRT");
    });

    it("throws AuthError on failure", async () => {
        const fetchImpl = mockFetch(401, { error: "invalid_token" });
        await expect(refresh(cfg, "x", { fetchImpl })).rejects.toBeInstanceOf(AuthError);
    });
});
