import { describe, it, expect } from "vitest";
import {
    SpotifyError,
    AuthError,
    NoActiveDeviceError,
    PremiumRequiredError,
    RateLimitError,
    fromHttpResponse
} from "./errors.js";

describe("error hierarchy", () => {
    it("SpotifyError carries status and message", () => {
        const e = new SpotifyError("boom", 500);
        expect(e).toBeInstanceOf(Error);
        expect(e).toBeInstanceOf(SpotifyError);
        expect(e.status).toBe(500);
        expect(e.message).toBe("boom");
        expect(e.name).toBe("SpotifyError");
    });

    it("subclasses are instances of SpotifyError", () => {
        expect(new AuthError("x")).toBeInstanceOf(SpotifyError);
        expect(new NoActiveDeviceError()).toBeInstanceOf(SpotifyError);
        expect(new PremiumRequiredError()).toBeInstanceOf(SpotifyError);
        expect(new RateLimitError(3)).toBeInstanceOf(SpotifyError);
    });

    it("RateLimitError exposes retryAfter seconds", () => {
        const e = new RateLimitError(7);
        expect(e.retryAfter).toBe(7);
        expect(e.status).toBe(429);
    });

    it("NoActiveDeviceError has a helpful default message", () => {
        expect(new NoActiveDeviceError().message).toMatch(/device/i);
        expect(new NoActiveDeviceError().status).toBe(404);
    });
});

describe("fromHttpResponse", () => {
    it("maps 401 to AuthError", () => {
        const e = fromHttpResponse(401, {}, { error: { message: "bad token" } });
        expect(e).toBeInstanceOf(AuthError);
        expect(e.message).toBe("bad token");
    });

    it("maps 403 to PremiumRequiredError", () => {
        const e = fromHttpResponse(403, {}, { error: { message: "premium only" } });
        expect(e).toBeInstanceOf(PremiumRequiredError);
    });

    it("maps 404 with NO_ACTIVE_DEVICE reason to NoActiveDeviceError", () => {
        const e = fromHttpResponse(404, {}, { error: { reason: "NO_ACTIVE_DEVICE", message: "no device" } });
        expect(e).toBeInstanceOf(NoActiveDeviceError);
    });

    it("maps 429 to RateLimitError reading Retry-After header", () => {
        const e = fromHttpResponse(429, { "retry-after": "12" }, {});
        expect(e).toBeInstanceOf(RateLimitError);
        expect((e as RateLimitError).retryAfter).toBe(12);
    });

    it("RateLimitError defaults retryAfter to 1 when header missing", () => {
        const e = fromHttpResponse(429, {}, {});
        expect((e as RateLimitError).retryAfter).toBe(1);
    });

    it("falls back to generic SpotifyError for other statuses", () => {
        const e = fromHttpResponse(500, {}, { error: { message: "server ded" } });
        expect(e.constructor).toBe(SpotifyError);
        expect(e.status).toBe(500);
        expect(e.message).toBe("server ded");
    });

    it("uses a default message when body has none", () => {
        const e = fromHttpResponse(500, {}, {});
        expect(e.message).toMatch(/500/);
    });
});
