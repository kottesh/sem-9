import { fromHttpResponse, AuthError, RateLimitError } from "./errors.js";
import type { StoredTokens } from "./auth/tokenStore.js";
import type { RequestOptions } from "./types.js";

const API_BASE = "https://api.spotify.com/v1";

/** Minimal shape of a fetch Response the http layer relies on. */
interface FetchLike {
    (url: string, init: RequestInit): Promise<{
        ok: boolean;
        status: number;
        headers: { get(name: string): string | null };
        json(): Promise<unknown>;
        text(): Promise<string>;
    }>;
}

export interface SpotifyHttpDeps {
    getTokens(): Promise<StoredTokens | null>;
    saveTokens(tokens: StoredTokens): Promise<void>;
    refresh(refreshToken: string): Promise<StoredTokens>;
    fetchImpl?: FetchLike;
    now?: () => number;
    sleep?: (ms: number) => Promise<void>;
}

export interface CallOptions extends RequestOptions {
    /** Max retries specifically for 429 responses. Default 3. */
    maxRateLimitRetries?: number;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Skew (ms) before real expiry at which we proactively refresh. */
const EXPIRY_SKEW_MS = 30_000;

export class SpotifyHttp {
    private readonly fetchImpl: FetchLike;
    private readonly now: () => number;
    private readonly sleep: (ms: number) => Promise<void>;

    constructor(private readonly deps: SpotifyHttpDeps) {
        this.fetchImpl = deps.fetchImpl ?? (fetch as unknown as FetchLike);
        this.now = deps.now ?? Date.now;
        this.sleep = deps.sleep ?? defaultSleep;
    }

    private buildUrl(path: string, query?: RequestOptions["query"]): string {
        const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
        if (!query) return url;
        const params = new URLSearchParams();
        for (const [k, v] of Object.entries(query)) {
            if (v !== undefined) params.set(k, String(v));
        }
        const qs = params.toString();
        return qs ? `${url}?${qs}` : url;
    }

    private async validAccessToken(): Promise<string> {
        let tokens = await this.deps.getTokens();
        if (!tokens) throw new AuthError("Not authenticated. Run the login flow first.");
        if (tokens.expiresAt - EXPIRY_SKEW_MS <= this.now()) {
            tokens = await this.deps.refresh(tokens.refreshToken);
            await this.deps.saveTokens(tokens);
        }
        return tokens.accessToken;
    }

    async request<T>(path: string, opts: CallOptions = {}): Promise<T | null> {
        const maxRateLimitRetries = opts.maxRateLimitRetries ?? 3;
        let refreshedOn401 = false;
        let rateLimitAttempts = 0;

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const accessToken = await this.validAccessToken();
            const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` };
            let body: string | undefined;
            if (opts.body !== undefined) {
                headers["Content-Type"] = "application/json";
                body = JSON.stringify(opts.body);
            }

            const res = await this.fetchImpl(this.buildUrl(path, opts.query), {
                method: opts.method ?? "GET",
                headers,
                body
            });

            if (res.status === 204 || res.status === 202) return null;

            if (res.ok) {
                // Spotify playback endpoints often return 200 with an empty or
                // non-JSON body. Only parse when it's actually JSON, and never
                // throw on an unparseable success body (the action succeeded).
                const contentType = res.headers.get("content-type") ?? "";
                if (!contentType.includes("application/json")) return null;
                const text = await res.text();
                if (!text) return null;
                try {
                    return JSON.parse(text) as T;
                } catch {
                    return null;
                }
            }

            // 401 → refresh once, then retry.
            if (res.status === 401 && !refreshedOn401) {
                refreshedOn401 = true;
                const current = await this.deps.getTokens();
                if (current) {
                    const next = await this.deps.refresh(current.refreshToken);
                    await this.deps.saveTokens(next);
                }
                continue;
            }

            // 429 → respect Retry-After, retry up to the limit.
            if (res.status === 429 && rateLimitAttempts < maxRateLimitRetries) {
                rateLimitAttempts++;
                const retryAfter = Number.parseInt(res.headers.get("retry-after") ?? "1", 10);
                await this.sleep((Number.isFinite(retryAfter) ? retryAfter : 1) * 1000);
                continue;
            }

            const parsed = await res.json().catch(() => ({}));
            const headerObj = { "retry-after": res.headers.get("retry-after") ?? undefined };
            throw fromHttpResponse(res.status, headerObj, parsed);
        }
    }
}

export { RateLimitError };
