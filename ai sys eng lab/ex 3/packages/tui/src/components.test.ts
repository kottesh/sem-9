import { describe, it, expect } from "vitest";
import { banner, speakerLine, notice, warn, errorLine, bulletList, keyValue } from "./components.js";
import { stripAnsi } from "./ansi.js";

describe("components", () => {
    it("banner contains the title", () => {
        expect(stripAnsi(banner("cappy"))).toContain("cappy");
    });

    it("speakerLine prefixes with the speaker", () => {
        const out = stripAnsi(speakerLine("cappy", "hello"));
        expect(out).toContain("cappy");
        expect(out).toContain("hello");
    });

    it("notice/warn/error prefix appropriately", () => {
        expect(stripAnsi(notice("info"))).toContain("info");
        expect(stripAnsi(warn("careful"))).toContain("careful");
        expect(stripAnsi(errorLine("boom"))).toContain("boom");
    });

    it("bulletList renders each item with a marker", () => {
        const out = stripAnsi(bulletList(["a", "b"]));
        expect(out.split("\n")).toEqual(["\u2022 a", "\u2022 b"]);
    });

    it("keyValue aligns keys", () => {
        const out = stripAnsi(keyValue([["name", "cappy"], ["role", "reviewer"]]));
        expect(out).toContain("name");
        expect(out).toContain("cappy");
        expect(out).toContain("role");
    });
});
