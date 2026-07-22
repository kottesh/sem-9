import { describe, it, expect, vi } from "vitest";
import { SpotifyHttp } from "./http.js";
import { AuthError, RateLimitError, NoActiveDeviceError } from "./errors.js";
import type { StoredTokens } from "./auth/tokenStore.js";

function tokens(overrides: Partial<StoredTokens> = {}): StoredTokens {
    return {
        accessToken: "AT",
        refreshToken: "RT",
        expiresAt: 9_999_999_999_999,
        scope: "s",
        ...overrides
    };
}

interface FakeResponse {
    status: number;
    body?: unknown;
    /** Raw text body (overrides `body`); used to simulate non-JSON responses. */
    rawText?: string;
    headers?: Record<string, string>;
}

function makeFetch(responses: FakeResponse[]) {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    let i = 0;
    const impl = vi.fn(async (url: string, init: RequestInit) => {
        calls.push({ url, init });
        const r = responses[Math.min(i, responses.length - 1)];
        i++;
        // Default a JSON content-type when a structured body is provided, unless
        // the fixture overrides headers or supplies raw text.
        const headers: Record<string, string> = { ...r.headers };
        if (r.rawText === undefined && r.body !== undefined && !("content-type" in headers)) {
            headers["content-type"] = "application/json";
        }
        return {
            ok: r.status >= 200 && r.status < 300,
            status: r.status,
            headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
            json: async () => r.body ?? {},
            text: async () => (r.rawText !== undefined ? r.rawText : JSON.stringify(r.body ?? {}))
        };
    });
    return { impl: impl as unknown as typeof fetch, calls };
}

function makeHttp(opts: {
    responses: FakeResponse[];
    initial?: StoredTokens;
    refreshTo?: StoredTokens;
    now?: number;
}) {
    const { impl, calls } = makeFetch(opts.responses);
    let stored: StoredTokens | null = opts.initial ?? tokens();
    const saved: StoredTokens[] = [];
    const refreshFn = vi.fn(async () => {
        const next = opts.refreshTo ?? tokens({ accessToken: "AT2" });
        return next;
    });
    const http = new SpotifyHttp({
        getTokens: async () => stored,
        saveTokens: async (t) => {
            stored = t;
            saved.push(t);
        },
        refresh: refreshFn,
        fetchImpl: impl,
        now: () => opts.now ?? 0,
        sleep: async () => {} // no real delays in tests
    });
    return { http, calls, refreshFn, saved, getStored: () => stored };
}

describe("SpotifyHttp.request", () => {
    it("adds Bearer auth and parses JSON body", async () => {
        const { http, calls } = makeHttp({ responses: [{ status: 200, body: { hello: "world" } }] });
        const out = await http.request<{ hello: string }>("/me");
        expect(out).toEqual({ hello: "world" });
        expect(calls[0].url).toBe("https://api.spotify.com/v1/me");
        expect((calls[0].init.headers as Record<string, string>).Authorization).toBe("Bearer AT");
    });

    it("serializes query params", async () => {
        const { http, calls } = makeHttp({ responses: [{ status: 200, body: {} }] });
        await http.request("/search", { query: { q: "daft punk", limit: 5, skip: undefined } });
        expect(calls[0].url).toBe("https://api.spotify.com/v1/search?q=daft+punk&limit=5");
    });

    it("returns null on 204 No Content", async () => {
        const { http } = makeHttp({ responses: [{ status: 204 }] });
        expect(await http.request("/me/player/play", { method: "PUT" })).toBeNull();
    });

    it("returns null on a 200 with a non-JSON body (regression: playback endpoints)", async () => {
        // Spotify's pause/play/next often reply 200 with an opaque non-JSON body.
        const { http } = makeHttp({
            responses: [{ status: 200, rawText: "_XmSDyf-dm0k1", headers: { "content-type": "text/plain" } }]
        });
        await expect(http.request("/me/player/pause", { method: "PUT" })).resolves.toBeNull();
    });

    it("returns null on a 200 with an empty body", async () => {
        const { http } = makeHttp({ responses: [{ status: 200, rawText: "" }] });
        expect(await http.request("/me/player/next", { method: "POST" })).toBeNull();
    });

    it("does not throw if a JSON content-type has a malformed body", async () => {
        const { http } = makeHttp({
            responses: [{ status: 200, rawText: "{ broken", headers: { "content-type": "application/json" } }]
        });
        await expect(http.request("/me")).resolves.toBeNull();
    });

    it("proactively refreshes when the token is expired", async () => {
        const { http, refreshFn, calls } = makeHttp({
            responses: [{ status: 200, body: {} }],
            initial: tokens({ expiresAt: 0 }),
            now: 1_000_000
        });
        await http.request("/me");
        expect(refreshFn).toHaveBeenCalledOnce();
        expect((calls[0].init.headers as Record<string, string>).Authorization).toBe("Bearer AT2");
    });

    it("refreshes once and retries on a 401", async () => {
        const { http, refreshFn, calls } = makeHttp({
            responses: [
                { status: 401, body: { error: { message: "expired" } } },
                { status: 200, body: { ok: true } }
            ]
        });
        const out = await http.request<{ ok: boolean }>("/me");
        expect(out).toEqual({ ok: true });
        expect(refreshFn).toHaveBeenCalledOnce();
        expect(calls).toHaveLength(2);
        expect((calls[1].init.headers as Record<string, string>).Authorization).toBe("Bearer AT2");
    });

    it("throws AuthError if the retry after refresh still 401s", async () => {
        const { http } = makeHttp({
            responses: [
                { status: 401, body: {} },
                { status: 401, body: { error: { message: "still bad" } } }
            ]
        });
        await expect(http.request("/me")).rejects.toBeInstanceOf(AuthError);
    });

    it("retries on 429 respecting Retry-After, then succeeds", async () => {
        const { http, calls } = makeHttp({
            responses: [
                { status: 429, headers: { "retry-after": "2" } },
                { status: 200, body: { done: true } }
            ]
        });
        const out = await http.request<{ done: boolean }>("/me");
        expect(out).toEqual({ done: true });
        expect(calls).toHaveLength(2);
    });

    it("gives up on 429 after max retries with RateLimitError", async () => {
        const { http } = makeHttp({
            responses: [{ status: 429, headers: { "retry-after": "1" } }]
        });
        await expect(http.request("/me", { maxRateLimitRetries: 2 })).rejects.toBeInstanceOf(RateLimitError);
    });

    it("maps 404 NO_ACTIVE_DEVICE to NoActiveDeviceError", async () => {
        const { http } = makeHttp({
            responses: [{ status: 404, body: { error: { reason: "NO_ACTIVE_DEVICE", message: "no dev" } } }]
        });
        await expect(http.request("/me/player/play", { method: "PUT" })).rejects.toBeInstanceOf(NoActiveDeviceError);
    });
});
