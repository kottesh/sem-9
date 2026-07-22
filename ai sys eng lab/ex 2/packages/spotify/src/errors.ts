/** Typed error hierarchy for the Spotify SDK. */

export class SpotifyError extends Error {
    readonly status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = "SpotifyError";
        this.status = status;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class AuthError extends SpotifyError {
    constructor(message: string, status = 401) {
        super(message, status);
        this.name = "AuthError";
    }
}

export class NoActiveDeviceError extends SpotifyError {
    constructor(message = "No active Spotify device. Open Spotify on a device and try again.") {
        super(message, 404);
        this.name = "NoActiveDeviceError";
    }
}

export class PremiumRequiredError extends SpotifyError {
    constructor(message = "This action requires Spotify Premium.") {
        super(message, 403);
        this.name = "PremiumRequiredError";
    }
}

export class RateLimitError extends SpotifyError {
    readonly retryAfter: number;

    constructor(retryAfter: number) {
        super(`Rate limited. Retry after ${retryAfter}s.`, 429);
        this.name = "RateLimitError";
        this.retryAfter = retryAfter;
    }
}

type Headers = Record<string, string | undefined>;

interface ErrorBody {
    error?: { message?: string; reason?: string };
}

/** Map an HTTP status + headers + parsed body to the right SpotifyError subclass. */
export function fromHttpResponse(status: number, headers: Headers, body: unknown): SpotifyError {
    const b = (body ?? {}) as ErrorBody;
    const message = b.error?.message;
    const reason = b.error?.reason;

    switch (status) {
        case 401:
            return new AuthError(message ?? "Authentication failed.");
        case 403:
            return new PremiumRequiredError(message ?? undefined);
        case 404:
            if (reason === "NO_ACTIVE_DEVICE") {
                return new NoActiveDeviceError(message ?? undefined);
            }
            return new SpotifyError(message ?? "Not found (404).", 404);
        case 429: {
            const raw = headers["retry-after"] ?? headers["Retry-After"];
            const secs = raw ? Number.parseInt(raw, 10) : 1;
            return new RateLimitError(Number.isFinite(secs) && secs > 0 ? secs : 1);
        }
        default:
            return new SpotifyError(message ?? `Spotify request failed (${status}).`, status);
    }
}
