import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

export type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "max";

const THINKING_LEVELS: ThinkingLevel[] = ["off", "minimal", "low", "medium", "high", "max"];

export interface Config {
    provider: { baseUrl: string; apiKey: string; model: string };
    zep: { apiKey: string };
    thinking: ThinkingLevel;
    bash: { defaultTimeoutMs: number; maxTimeoutMs: number };
    user: string;
}

function reqString(obj: Record<string, unknown> | undefined, key: string, path: string): string {
    const v = obj?.[key];
    if (typeof v !== "string" || v.trim() === "") {
        throw new Error(`Config error: "${path}" is required and must be a non-empty string.`);
    }
    return v;
}

/**
 * Validate and shape a parsed JSON config object into a typed Config. Fails
 * loud with a clear message. Secrets live in cappy.json (gitignored); ship
 * cappy.json.example with blanks.
 */
export function parseConfig(raw: unknown): Config {
    const obj = (raw ?? {}) as Record<string, unknown>;
    const provider = obj.provider as Record<string, unknown> | undefined;
    const zep = obj.zep as Record<string, unknown> | undefined;

    if (!provider) throw new Error(`Config error: "provider" section is required.`);
    const providerCfg = {
        baseUrl: reqString(provider, "baseUrl", "provider.baseUrl"),
        apiKey: reqString(provider, "apiKey", "provider.apiKey"),
        model: reqString(provider, "model", "provider.model")
    };

    if (!zep) throw new Error(`Config error: "zep" section is required.`);
    const zepCfg = { apiKey: reqString(zep, "apiKey", "zep.apiKey") };

    const thinking = (obj.thinking as string | undefined) ?? "medium";
    if (!THINKING_LEVELS.includes(thinking as ThinkingLevel)) {
        throw new Error(
            `Config error: "thinking" must be one of ${THINKING_LEVELS.join(", ")} (got "${thinking}").`
        );
    }

    const bash = (obj.bash as Record<string, unknown> | undefined) ?? {};
    const defaultTimeoutMs = typeof bash.defaultTimeoutMs === "number" ? bash.defaultTimeoutMs : 30000;
    const maxTimeoutMs = typeof bash.maxTimeoutMs === "number" ? bash.maxTimeoutMs : 600000;

    const user = typeof obj.user === "string" && obj.user.trim() !== "" ? obj.user.trim() : "default";

    return Object.freeze({
        provider: providerCfg,
        zep: zepCfg,
        thinking: thinking as ThinkingLevel,
        bash: { defaultTimeoutMs, maxTimeoutMs },
        user
    });
}

/**
 * Locate cappy.json: explicit path arg -> CAPPY_CONFIG env -> ./cappy.json
 * (walking up from this module) -> ~/.cappy/cappy.json. Fails loud if none.
 */
export function findConfigPath(explicit?: string): string {
    const candidates: string[] = [];
    if (explicit) candidates.push(resolve(explicit));
    if (process.env.CAPPY_CONFIG) candidates.push(resolve(process.env.CAPPY_CONFIG));

    let dir = dirname(fileURLToPath(import.meta.url));
    for (let i = 0; i < 6; i++) {
        candidates.push(join(dir, "cappy.json"));
        const parent = dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    candidates.push(join(homedir(), ".cappy", "cappy.json"));

    for (const c of candidates) {
        if (existsSync(c)) return c;
    }
    throw new Error(
        `Config error: cappy.json not found. Copy cappy.json.example to cappy.json and fill it in.\nLooked in:\n  ${candidates.join("\n  ")}`
    );
}

/** Load + parse cappy.json from disk. */
export function loadConfig(explicit?: string): Config {
    const path = findConfigPath(explicit);
    let parsed: unknown;
    try {
        parsed = JSON.parse(readFileSync(path, "utf8"));
    } catch (err) {
        throw new Error(`Config error: failed to read/parse ${path}: ${err instanceof Error ? err.message : err}`);
    }
    return parseConfig(parsed);
}
