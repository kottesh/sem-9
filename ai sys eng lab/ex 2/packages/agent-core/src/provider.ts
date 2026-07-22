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
    toolCalls?: NeutralToolCall[];
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
}

/** Transport-level provider the agent loop talks to (neutral in/out). */
export interface LLMProvider {
    chat(input: { messages: NeutralMessage[]; tools: Tool[] }): Promise<ChatResponse>;
}
