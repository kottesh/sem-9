import type { ToolAdapter, NeutralMessage, NeutralToolCall, ChatResponse } from "../provider.js";
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
    }
};

function parseArgs(raw: string): unknown {
    if (!raw) return {};
    try {
        return JSON.parse(raw);
    } catch {
        return {};
    }
}
