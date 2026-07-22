import { describe, it, expect } from "vitest";
import { parseConfig } from "./config.js";

const valid = {
    provider: { baseUrl: "https://api/v1", apiKey: "KEY", model: "M" },
    zep: { apiKey: "ZKEY" }
};

describe("parseConfig", () => {
    it("parses a valid config and applies defaults", () => {
        const c = parseConfig(valid);
        expect(c.provider).toEqual({ baseUrl: "https://api/v1", apiKey: "KEY", model: "M" });
        expect(c.zep.apiKey).toBe("ZKEY");
        expect(c.thinking).toBe("medium");
        expect(c.bash.defaultTimeoutMs).toBe(30000);
        expect(c.bash.maxTimeoutMs).toBe(600000);
        expect(c.user).toBe("default");
    });

    it("honors provided overrides", () => {
        const c = parseConfig({
            ...valid,
            thinking: "high",
            bash: { defaultTimeoutMs: 5000, maxTimeoutMs: 60000 },
            user: "alice"
        });
        expect(c.thinking).toBe("high");
        expect(c.bash.defaultTimeoutMs).toBe(5000);
        expect(c.bash.maxTimeoutMs).toBe(60000);
        expect(c.user).toBe("alice");
    });

    it("throws when provider fields are missing", () => {
        expect(() => parseConfig({ zep: { apiKey: "z" } })).toThrow(/provider/i);
        expect(() => parseConfig({ provider: { baseUrl: "b", apiKey: "" }, zep: { apiKey: "z" } })).toThrow();
    });

    it("throws when zep apiKey is missing", () => {
        expect(() => parseConfig({ provider: valid.provider })).toThrow(/zep/i);
    });

    it("rejects an invalid thinking level", () => {
        expect(() => parseConfig({ ...valid, thinking: "turbo" })).toThrow(/thinking/i);
    });
});
