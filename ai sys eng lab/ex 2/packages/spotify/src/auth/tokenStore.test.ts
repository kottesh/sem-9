import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileTokenStore } from "./tokenStore.js";
import type { StoredTokens } from "./tokenStore.js";

let dir: string;
let file: string;

const sample: StoredTokens = {
    accessToken: "at",
    refreshToken: "rt",
    expiresAt: 1_700_000_000_000,
    scope: "user-modify-playback-state"
};

beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "krill-tok-"));
    file = join(dir, "nested", "tokens.json");
});

afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
});

describe("FileTokenStore", () => {
    it("returns null when no file exists", async () => {
        const store = new FileTokenStore(file);
        expect(await store.load()).toBeNull();
    });

    it("persists tokens and creates parent dirs", async () => {
        const store = new FileTokenStore(file);
        await store.save(sample);
        expect(existsSync(file)).toBe(true);
        expect(await store.load()).toEqual(sample);
    });

    it("writes the file with 0600 permissions", async () => {
        const store = new FileTokenStore(file);
        await store.save(sample);
        const mode = statSync(file).mode & 0o777;
        expect(mode).toBe(0o600);
    });

    it("clear() removes the file and load() returns null after", async () => {
        const store = new FileTokenStore(file);
        await store.save(sample);
        await store.clear();
        expect(existsSync(file)).toBe(false);
        expect(await store.load()).toBeNull();
    });

    it("clear() is a no-op when file is absent", async () => {
        const store = new FileTokenStore(file);
        await expect(store.clear()).resolves.toBeUndefined();
    });

    it("returns null on corrupt json rather than throwing", async () => {
        const store = new FileTokenStore(file);
        await store.save(sample);
        const { writeFileSync } = await import("node:fs");
        writeFileSync(file, "{ not json");
        expect(await store.load()).toBeNull();
    });
});
