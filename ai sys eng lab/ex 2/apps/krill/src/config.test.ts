import { describe, it, expect } from "vitest";
import { parseConfig } from "./config.js";

const complete = {
    CLOUDSWAY_BASE_URL: "https://genaiapi.cloudsway.net/v1",
    CLOUDSWAY_API_KEY: "k",
    CLOUDSWAY_MODEL: "model-x",
    ZEP_API_KEY: "z",
    SPOTIFY_CLIENT_ID: "cid",
    SPOTIFY_REDIRECT_URI: "http://127.0.0.1:8888/callback",
    KRILL_USER: "kottesh"
};

describe("parseConfig", () => {
    it("parses a complete environment", () => {
        const cfg = parseConfig(complete);
        expect(cfg.cloudsway.baseUrl).toBe(complete.CLOUDSWAY_BASE_URL);
        expect(cfg.cloudsway.apiKey).toBe("k");
        expect(cfg.cloudsway.model).toBe("model-x");
        expect(cfg.zepApiKey).toBe("z");
        expect(cfg.spotify.clientId).toBe("cid");
        expect(cfg.spotify.redirectUri).toBe(complete.SPOTIFY_REDIRECT_URI);
        expect(cfg.user).toBe("kottesh");
    });

    it("defaults the user to 'default' when unset", () => {
        const { KRILL_USER, ...rest } = complete;
        expect(parseConfig(rest).user).toBe("default");
    });

    it("throws listing every missing required variable", () => {
        expect(() => parseConfig({})).toThrow(/CLOUDSWAY_BASE_URL/);
        try {
            parseConfig({});
        } catch (e) {
            const msg = (e as Error).message;
            expect(msg).toContain("CLOUDSWAY_API_KEY");
            expect(msg).toContain("ZEP_API_KEY");
            expect(msg).toContain("SPOTIFY_CLIENT_ID");
        }
    });

    it("derives the callback port and path from the redirect URI", () => {
        const cfg = parseConfig(complete);
        expect(cfg.spotify.callbackPort).toBe(8888);
        expect(cfg.spotify.callbackPath).toBe("/callback");
    });

    it("rejects a redirect URI that is not a valid URL", () => {
        expect(() => parseConfig({ ...complete, SPOTIFY_REDIRECT_URI: "not a url" })).toThrow(/redirect/i);
    });
});
