import { describe, it, expect } from "vitest";
import { createVerifier, challengeFromVerifier, base64UrlEncode } from "./pkce.js";

describe("base64UrlEncode", () => {
    it("produces url-safe base64 with no padding", () => {
        const out = base64UrlEncode(Buffer.from([251, 255, 191]));
        expect(out).not.toMatch(/[+/=]/);
    });

    it("is deterministic", () => {
        const buf = Buffer.from("hello world");
        expect(base64UrlEncode(buf)).toBe(base64UrlEncode(buf));
    });
});

describe("createVerifier", () => {
    it("returns a string within the PKCE length bounds (43-128)", () => {
        const v = createVerifier();
        expect(v.length).toBeGreaterThanOrEqual(43);
        expect(v.length).toBeLessThanOrEqual(128);
    });

    it("only contains unreserved URL characters", () => {
        const v = createVerifier();
        expect(v).toMatch(/^[A-Za-z0-9\-._~]+$/);
    });

    it("is different on each call", () => {
        expect(createVerifier()).not.toBe(createVerifier());
    });
});

describe("challengeFromVerifier", () => {
    it("computes the known RFC 7636 test vector", () => {
        // RFC 7636 Appendix B
        const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
        const challenge = challengeFromVerifier(verifier);
        expect(challenge).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
    });

    it("is url-safe", () => {
        const challenge = challengeFromVerifier(createVerifier());
        expect(challenge).toMatch(/^[A-Za-z0-9\-_]+$/);
    });
});
