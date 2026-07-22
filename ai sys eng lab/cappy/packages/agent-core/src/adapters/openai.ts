import type {
    ToolAdapter,
    NeutralMessage,
    NeutralToolCall,
    ChatResponse,
    StreamEvent,
    StreamAccumulator
} from "../provider.js";
import type { Tool } from "../tool.js";

interface OpenAIToolCall {
    id: string;
    function: { name: string; arguments: string };
}

interface OpenAIChoice {
    message: {
        content?: string | null;
        tool_calls?: OpenAIToolCall[] | null;
    };
}

/** Adapter for OpenAI-compatible chat completions (used by cloudsway). */
export const openaiAdapter: ToolAdapter = {
    encodeTools(tools: Tool[]): unknown {
        return tools.map((t) => ({
            type: "function",
            function: {
                name: t.name,
                description: t.description,
                parameters: t.jsonSchema
            }
        }));
    },

    encodeMessages(messages: NeutralMessage[]): unknown {
        return messages.map((m) => {
            if (m.role === "assistant" && m.toolCalls?.length) {
                return {
                    role: "assistant",
                    content: m.content || null,
                    tool_calls: m.toolCalls.map((c) => ({
                        id: c.id,
                        type: "function",
                        function: { name: c.name, arguments: JSON.stringify(c.args) }
                    }))
                };
            }
            if (m.role === "tool") {
                return { role: "tool", content: m.content, tool_call_id: m.toolCallId };
            }
            return { role: m.role, content: m.content };
        });
    },

    decodeResponse(raw: unknown): ChatResponse {
        const choice = (raw as { choices?: OpenAIChoice[] }).choices?.[0];
        const msg = choice?.message;
        const toolCalls: NeutralToolCall[] | undefined = msg?.tool_calls?.map((c) => ({
            id: c.id,
            name: c.function.name,
            args: parseArgs(c.function.arguments)
        }));
        return {
            content: msg?.content ?? undefined,
            toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined
        };
    },

    encodeToolResult(call: NeutralToolCall, result: unknown): unknown {
        return { role: "tool", tool_call_id: call.id, content: JSON.stringify(result) };
    },

    createStreamAccumulator(): StreamAccumulator {
        let text = "";
        let thinking = "";
        // tool calls keyed by their streamed index
        const toolParts = new Map<number, { id: string; name: string; args: string }>();

        return {
            push(chunk: unknown, emit: (event: StreamEvent) => void): void {
                const delta = (chunk as { choices?: Array<{ delta?: OpenAIDelta }> }).choices?.[0]?.delta;
                if (!delta) return;

                if (delta.reasoning_content) {
                    thinking += delta.reasoning_content;
                    emit({ type: "thinking", delta: delta.reasoning_content });
                }
                if (delta.content) {
                    text += delta.content;
                    emit({ type: "text", delta: delta.content });
                }
                if (delta.tool_calls) {
                    for (const tc of delta.tool_calls) {
                        const idx = tc.index ?? 0;
                        const part = toolParts.get(idx) ?? { id: "", name: "", args: "" };
                        if (tc.id) part.id = tc.id;
                        if (tc.function?.name) part.name = tc.function.name;
                        if (tc.function?.arguments) part.args += tc.function.arguments;
                        toolParts.set(idx, part);
                    }
                }
            },
            finish(): ChatResponse {
                const toolCalls: NeutralToolCall[] = [...toolParts.entries()]
                    .sort((a, b) => a[0] - b[0])
                    .map(([, p]) => ({ id: p.id, name: p.name, args: parseArgs(p.args) }));
                return {
                    content: text || undefined,
                    thinking: thinking || undefined,
                    toolCalls: toolCalls.length > 0 ? toolCalls : undefined
                };
            }
        };
    }
};

interface OpenAIDelta {
    content?: string | null;
    reasoning_content?: string | null;
    tool_calls?: Array<{
        index?: number;
        id?: string;
        function?: { name?: string; arguments?: string };
    }> | null;
}

function parseArgs(raw: string): unknown {
    if (!raw) return {};
    try {
        return JSON.parse(raw);
    } catch {
        return {};
    }
}
