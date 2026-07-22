import type { LLMProvider, ToolAdapter, ChatResponse } from "../provider.js";

export interface ProviderOptions {
    baseUrl: string;
    apiKey: string;
    model: string;
    adapter: ToolAdapter;
    /** Path appended to baseUrl. Defaults to /chat/completions. */
    endpoint?: string;
    fetchImpl?: typeof fetch;
    /** Extra body fields (e.g. temperature, max_tokens). */
    params?: Record<string, unknown>;
}

/** Build an LLM provider from an adapter + HTTP transport. */
export function makeProvider(opts: ProviderOptions): LLMProvider {
    const fetchImpl = opts.fetchImpl ?? fetch;
    const url = opts.baseUrl.replace(/\/$/, "") + (opts.endpoint ?? "/chat/completions");

    return {
        async chat({ messages, tools }): Promise<ChatResponse> {
            const body: Record<string, unknown> = {
                model: opts.model,
                messages: opts.adapter.encodeMessages(messages),
                ...opts.params
            };
            if (tools.length > 0) {
                body.tools = opts.adapter.encodeTools(tools);
            }

            const res = await fetchImpl(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${opts.apiKey}`
                },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                let detail = "";
                try {
                    detail = await res.text();
                } catch {
                    /* ignore */
                }
                throw new Error(`LLM request failed (${res.status}): ${detail}`);
            }

            return opts.adapter.decodeResponse(await res.json());
        }
    };
}
