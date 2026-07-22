import { makeProvider, openaiAdapter } from "@krill/agent-core";
import type { LLMProvider } from "@krill/agent-core";
import type { Config } from "./config.js";

/** Build the cloudsway LLM provider (OpenAI-compatible wire format). */
export function buildLLM(config: Config): LLMProvider {
    return makeProvider({
        baseUrl: config.cloudsway.baseUrl,
        apiKey: config.cloudsway.apiKey,
        model: config.cloudsway.model,
        adapter: openaiAdapter,
        params: { temperature: 0.7 }
    });
}
