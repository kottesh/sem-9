import type { LLMProvider, ToolAdapter, ChatResponse, StreamEvent } from "../provider.js";

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

    const provider: LLMProvider = {
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
        },

        async chatStream({ messages, tools }, onEvent): Promise<ChatResponse> {
            const accumulator = opts.adapter.createStreamAccumulator?.();
            if (!accumulator) {
                // Provider adapter can't stream; fall back to a single response.
                return provider.chat({ messages, tools });
            }

            const body: Record<string, unknown> = {
                model: opts.model,
                messages: opts.adapter.encodeMessages(messages),
                stream: true,
                ...opts.params
            };
            if (tools.length > 0) body.tools = opts.adapter.encodeTools(tools);

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
                throw new Error(`LLM stream request failed (${res.status}): ${detail}`);
            }
            if (!res.body) throw new Error("LLM stream response had no body");

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            const handleEvent = (data: string): void => {
                const trimmed = data.trim();
                if (trimmed === "" || trimmed === "[DONE]") return;
                let parsed: unknown;
                try {
                    parsed = JSON.parse(trimmed);
                } catch {
                    return; // ignore keep-alives / partial noise
                }
                accumulator.push(parsed, onEvent);
            };

            // Read the SSE stream, splitting on blank-line frame boundaries.
            for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                let sep: number;
                while ((sep = buffer.indexOf("\n\n")) !== -1) {
                    const frame = buffer.slice(0, sep);
                    buffer = buffer.slice(sep + 2);
                    for (const line of frame.split("\n")) {
                        const m = /^data:\s?(.*)$/.exec(line);
                        if (m) handleEvent(m[1] ?? "");
                    }
                }
            }
            // Flush any trailing frame.
            if (buffer.trim() !== "") {
                for (const line of buffer.split("\n")) {
                    const m = /^data:\s?(.*)$/.exec(line);
                    if (m) handleEvent(m[1] ?? "");
                }
            }

            return accumulator.finish();
        }
    };

    return provider;
}
