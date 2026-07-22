import type { Tool } from "./tool.js";

export type Role = "system" | "user" | "assistant" | "tool";

export interface NeutralToolCall {
    id: string;
    name: string;
    args: unknown;
}

export interface NeutralMessage {
    role: Role;
    content: string;
    /** Present on assistant messages that requested tool calls. */
    toolCalls?: NeutralToolCall[];
    /** Present on tool-result messages, linking back to the call. */
    toolCallId?: string;
}

export interface ChatResponse {
    content?: string;
    /** Reasoning/thinking text, when the provider emits it. */
    thinking?: string;
    toolCalls?: NeutralToolCall[];
}

/** An incremental event emitted while streaming a response. */
export type StreamEvent =
    | { type: "text"; delta: string }
    | { type: "thinking"; delta: string };

/** Accumulates streamed provider chunks into a final ChatResponse. */
export interface StreamAccumulator {
    /** Process one parsed provider chunk, emitting neutral stream events. */
    push(chunk: unknown, emit: (event: StreamEvent) => void): void;
    /** Assemble the final response after the stream ends. */
    finish(): ChatResponse;
}

/**
 * Converts the neutral tool/message shapes to and from a specific provider's
 * wire format. Adding a new provider means implementing this interface only.
 */
export interface ToolAdapter {
    encodeTools(tools: Tool[]): unknown;
    encodeMessages(messages: NeutralMessage[]): unknown;
    decodeResponse(raw: unknown): ChatResponse;
    encodeToolResult(call: NeutralToolCall, result: unknown): unknown;
    /** Optional: build an accumulator for streaming (SSE) responses. */
    createStreamAccumulator?(): StreamAccumulator;
}

/** Transport-level provider the agent loop talks to (neutral in/out). */
export interface LLMProvider {
    chat(input: { messages: NeutralMessage[]; tools: Tool[] }): Promise<ChatResponse>;
    /** Optional streaming variant; emits events and resolves the final response. */
    chatStream?(
        input: { messages: NeutralMessage[]; tools: Tool[] },
        onEvent: (event: StreamEvent) => void
    ): Promise<ChatResponse>;
}
