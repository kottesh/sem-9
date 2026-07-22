import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { dirname } from "node:path";

export interface StoredTokens {
    accessToken: string;
    refreshToken: string;
    /** Epoch millis at which the access token expires. */
    expiresAt: number;
    scope: string;
}

/** Pluggable persistence for OAuth tokens. */
export interface TokenStore {
    load(): Promise<StoredTokens | null>;
    save(tokens: StoredTokens): Promise<void>;
    clear(): Promise<void>;
}

/** Stores tokens as JSON on disk with owner-only (0600) permissions. */
export class FileTokenStore implements TokenStore {
    constructor(private readonly path: string) {}

    async load(): Promise<StoredTokens | null> {
        try {
            const raw = await readFile(this.path, "utf8");
            return JSON.parse(raw) as StoredTokens;
        } catch {
            return null;
        }
    }

    async save(tokens: StoredTokens): Promise<void> {
        await mkdir(dirname(this.path), { recursive: true });
        await writeFile(this.path, JSON.stringify(tokens, null, 2), { mode: 0o600 });
    }

    async clear(): Promise<void> {
        await rm(this.path, { force: true });
    }
}
