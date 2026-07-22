import { describe, it, expect } from "vitest";
import { z } from "zod";
import { openaiAdapter } from "./openai.js";
import { defineTool } from "../tool.js";
import type { NeutralMessage, NeutralToolCall } from "../provider.js";

const sampleTool = defineTool({
    name: "play",
    description: "play a track",
    parameters: z.object({ uri: z.string() }),
    async execute() {
        return { llm: {} };
    }
});

describe("openaiAdapter.encodeTools", () => {
    it("wraps tools in the OpenAI function schema", () => {
        const encoded = openaiAdapter.encodeTools([sampleTool]) as any[];
        expect(encoded[0]).toEqual({
            type: "function",
            function: {
                name: "play",
                description: "play a track",
                parameters: sampleTool.jsonSchema
            }
        });
    });
});

describe("openaiAdapter.encodeMessages", () => {
    it("maps neutral roles to OpenAI messages", () => {
        const msgs: NeutralMessage[] = [
            { role: "system", content: "sys" },
            { role: "user", content: "hi" }
        ];
        expect(openaiAdapter.encodeMessages(msgs)).toEqual([
            { role: "system", content: "sys" },
            { role: "user", content: "hi" }
        ]);
    });

    it("encodes assistant tool calls with stringified arguments", () => {
        const msgs: NeutralMessage[] = [
            {
                role: "assistant",
                content: "",
                toolCalls: [{ id: "c1", name: "play", args: { uri: "u" } }]
            }
        ];
        const [m] = openaiAdapter.encodeMessages(msgs) as any[];
        expect(m.role).toBe("assistant");
        expect(m.tool_calls[0]).toEqual({
            id: "c1",
            type: "function",
            function: { name: "play", arguments: JSON.stringify({ uri: "u" }) }
        });
    });

    it("encodes tool result messages with tool_call_id", () => {
        const msgs: NeutralMessage[] = [{ role: "tool", content: "{\"ok\":true}", toolCallId: "c1" }];
        const [m] = openaiAdapter.encodeMessages(msgs) as any[];
        expect(m).toEqual({ role: "tool", content: "{\"ok\":true}", tool_call_id: "c1" });
    });
});

describe("openaiAdapter.decodeResponse", () => {
    it("extracts text content", () => {
        const raw = { choices: [{ message: { content: "hello", tool_calls: null } }] };
        expect(openaiAdapter.decodeResponse(raw)).toEqual({ content: "hello", toolCalls: undefined });
    });

    it("parses tool calls with JSON arguments into neutral form", () => {
        const raw = {
            choices: [
                {
                    message: {
                        content: null,
                        tool_calls: [
                            { id: "c9", function: { name: "play", arguments: "{\"uri\":\"spotify:track:1\"}" } }
                        ]
                    }
                }
            ]
        };
        const out = openaiAdapter.decodeResponse(raw);
        expect(out.content).toBeUndefined();
        expect(out.toolCalls).toEqual([{ id: "c9", name: "play", args: { uri: "spotify:track:1" } }]);
    });

    it("tolerates empty/malformed arguments as {}", () => {
        const raw = {
            choices: [{ message: { tool_calls: [{ id: "c", function: { name: "x", arguments: "" } }] } }]
        };
        const out = openaiAdapter.decodeResponse(raw);
        expect(out.toolCalls![0].args).toEqual({});
    });
});

describe("openaiAdapter.encodeToolResult", () => {
    it("produces a tool-role message with stringified result", () => {
        const call: NeutralToolCall = { id: "c1", name: "play", args: {} };
        expect(openaiAdapter.encodeToolResult(call, { ok: true })).toEqual({
            role: "tool",
            tool_call_id: "c1",
            content: JSON.stringify({ ok: true })
        });
    });
});
