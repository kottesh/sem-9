import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Load .env by walking up from this file until one is found (works regardless
// of the current working directory, e.g. when run via `npm -w krill`).
function loadDotenv(): void {
    let dir = dirname(fileURLToPath(import.meta.url));
    for (let i = 0; i < 6; i++) {
        const candidate = join(dir, ".env");
        if (existsSync(candidate)) {
            loadEnv({ path: candidate });
            return;
        }
        const parent = dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    loadEnv(); // fall back to default (cwd) lookup
}
loadDotenv();

import { ToolRegistry, runTurn } from "@krill/agent-core";
import type { NeutralMessage } from "@krill/agent-core";
import { parseConfig } from "./config.js";
import { buildLLM } from "./llm.js";
import { ZepMemory } from "./memory/zep.js";
import { KrillUI } from "./ui/render.js";
import { TerminalIO } from "./ui/prompt.js";
import { initSpotify } from "./auth.js";
import { buildKrillTools } from "./tools/index.js";
import { buildSystemPrompt } from "./systemPrompt.js";
import type { KrillCtx } from "./tools/context.js";

async function main(): Promise<void> {
    const ui = new KrillUI();

    let config;
    try {
        config = parseConfig(process.env);
    } catch (err) {
        ui.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
    }

    ui.banner();

    // Spotify (runs PKCE login on first use).
    const spotify = await initSpotify(config, ui);
    try {
        await spotify.ensureActiveDevice();
    } catch {
        ui.warn("No active Spotify device yet. Open Spotify on any device to enable playback.");
    }

    const memory = new ZepMemory({ apiKey: config.zepApiKey, userId: config.user, debug: config.debug });
    const llm = buildLLM(config);

    const ctx: KrillCtx = { spotify, memory, ui };
    const registry = new ToolRegistry<KrillCtx>(ctx).register(...buildKrillTools());

    const io = new TerminalIO(ui);
    ui.info("Ask me to play something, explore an artist, or build a playlist. Type /exit to quit.\n");

    const messages: NeutralMessage[] = [];

    const shutdown = () => {
        io.close();
        process.exit(0);
    };
    process.on("SIGINT", shutdown);

    // Rebuild the system prompt each turn so fresh memory context is injected.
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const userInput = await io.input("you \u203a ");
        if (userInput === null) break;
        if (userInput === "") continue;

        const context = await memory.getContext();
        const system: NeutralMessage = { role: "system", content: buildSystemPrompt(context) };
        const turnMessages: NeutralMessage[] = [system, ...messages];

        try {
            const result = await runTurn({
                provider: llm,
                registry,
                memory,
                messages: turnMessages,
                userInput,
                io
            });
            if (result.stoppedReason === "max_iterations") {
                ui.warn("(stopped after too many tool steps)");
            }
            ui.assistant(result.assistant || "(no response)");

            // Persist the running conversation (minus the system message).
            messages.length = 0;
            messages.push(...turnMessages.filter((m) => m.role !== "system"));
        } catch (err) {
            ui.error(err instanceof Error ? err.message : String(err));
        }
    }

    io.close();
    ui.info("\nbye \u266a");
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
