import { ToolRegistry, runTurn, makeProvider, openaiAdapter } from "@agent/core";
import type { NeutralMessage, LLMProvider } from "@agent/core";
import { loadConfig } from "./config.js";
import type { Config } from "./config.js";
import { CappyMemory } from "./memory/zep.js";
import { CappyUI } from "./ui/cappyUI.js";
import { CappyIO } from "./ui/io.js";
import { buildCappyTools } from "./tools/index.js";
import { buildSystemPrompt } from "./systemPrompt.js";
import type { CappyCtx } from "./tools/context.js";

function buildLLM(config: Config): LLMProvider {
    return makeProvider({
        baseUrl: config.provider.baseUrl,
        apiKey: config.provider.apiKey,
        model: config.provider.model,
        adapter: openaiAdapter,
        params: { temperature: 0.4, reasoning_effort: config.thinking }
    });
}

async function main(): Promise<void> {
    let config: Config;
    try {
        config = loadConfig();
    } catch (err) {
        console.error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
        return;
    }

    const ui = new CappyUI();
    ui.banner();

    const memory = new CappyMemory({ apiKey: config.zep.apiKey, user: config.user });
    const llm = buildLLM(config);

    const ctx: CappyCtx = { memory, ui, bash: config.bash };
    const registry = new ToolRegistry<CappyCtx>(ctx).register(...buildCappyTools());

    const io = new CappyIO(ui);
    ui.info("Ask me to review a resume section. Point me at a file, or paste the text. Type /exit to quit.\n");

    const messages: NeutralMessage[] = [];

    const shutdown = () => {
        io.close();
        process.exit(0);
    };
    process.on("SIGINT", shutdown);

    for (;;) {
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
                io,
                stream: true,
                onToken: (t) => io.onToken(t),
                onThinking: (t) => io.onThinking(t)
            });
            io.finishStream();
            if (result.stoppedReason === "max_iterations") {
                ui.warn("(stopped after too many tool steps)");
            }
            if (!result.assistant) ui.assistant("(no response)");

            messages.length = 0;
            messages.push(...turnMessages.filter((m) => m.role !== "system"));
        } catch (err) {
            io.finishStream();
            ui.error(err instanceof Error ? err.message : String(err));
        }
    }

    io.close();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
