import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { makeProvider } from "./httpProvider.js";
import { openaiAdapter } from "../adapters/openai.js";
import { defineTool } from "../tool.js";

const tool = defineTool({
    name: "play",
    description: "d",
    parameters: z.object({ uri: z.string() }),
    async execute() {
        return { llm: {} };
    }
});

function mockFetch(status: number, body: unknown) {
    return vi.fn(async () => ({
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
        text: async () => JSON.stringify(body)
    })) as unknown as typeof fetch;
}

function mockStreamFetch(sseLines: string[]) {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
        start(controller) {
            for (const line of sseLines) controller.enqueue(encoder.encode(line));
            controller.close();
        }
    });
    return vi.fn(async () => ({
        ok: true,
        status: 200,
        body
    })) as unknown as typeof fetch;
}

describe("makeProvider.chatStream", () => {
    it("streams text + thinking events and resolves the final response", async () => {
        const fetchImpl = mockStreamFetch([
            'data: {"choices":[{"delta":{"reasoning_content":"think "}}]}\n\n',
            'data: {"choices":[{"delta":{"content":"Hel"}}]}\n\n',
            'data: {"choices":[{"delta":{"content":"lo"}}]}\n\n',
            "data: [DONE]\n\n"
        ]);
        const provider = makeProvider({ baseUrl: "b", apiKey: "k", model: "m", adapter: openaiAdapter, fetchImpl });
        const events: any[] = [];
        const res = await provider.chatStream!({ messages: [], tools: [] }, (e) => events.push(e));

        expect(events).toEqual([
            { type: "thinking", delta: "think " },
            { type: "text", delta: "Hel" },
            { type: "text", delta: "lo" }
        ]);
        expect(res.content).toBe("Hello");
        expect(res.thinking).toBe("think ");

        const sent = JSON.parse((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
        expect(sent.stream).toBe(true);
    });

    it("handles SSE frames split across chunk boundaries", async () => {
        const fetchImpl = mockStreamFetch([
            'data: {"choices":[{"delta":{"con',
            'tent":"AB"}}]}\n\n',
            "data: [DONE]\n\n"
        ]);
        const provider = makeProvider({ baseUrl: "b", apiKey: "k", model: "m", adapter: openaiAdapter, fetchImpl });
        const events: any[] = [];
        const res = await provider.chatStream!({ messages: [], tools: [] }, (e) => events.push(e));
        expect(res.content).toBe("AB");
        expect(events).toEqual([{ type: "text", delta: "AB" }]);
    });
});

describe("makeProvider", () => {
    it("posts encoded messages+tools and decodes the response", async () => {
        const fetchImpl = mockFetch(200, {
            choices: [{ message: { content: "hi there", tool_calls: null } }]
        });
        const provider = makeProvider({
            baseUrl: "https://api.example/v1",
            apiKey: "KEY",
            model: "m1",
            adapter: openaiAdapter,
            fetchImpl
        });

        const res = await provider.chat({
            messages: [{ role: "user", content: "hello" }],
            tools: [tool]
        });

        expect(res.content).toBe("hi there");

        const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(url).toBe("https://api.example/v1/chat/completions");
        expect((init.headers as Record<string, string>).Authorization).toBe("Bearer KEY");
        const sent = JSON.parse(init.body);
        expect(sent.model).toBe("m1");
        expect(sent.messages).toEqual([{ role: "user", content: "hello" }]);
        expect(sent.tools[0].function.name).toBe("play");
    });

    it("returns decoded tool calls", async () => {
        const fetchImpl = mockFetch(200, {
            choices: [
                { message: { content: null, tool_calls: [{ id: "c1", function: { name: "play", arguments: "{\"uri\":\"u\"}" } }] } }
            ]
        });
        const provider = makeProvider({ baseUrl: "b", apiKey: "k", model: "m", adapter: openaiAdapter, fetchImpl });
        const res = await provider.chat({ messages: [], tools: [tool] });
        expect(res.toolCalls).toEqual([{ id: "c1", name: "play", args: { uri: "u" } }]);
    });

    it("throws on non-2xx responses", async () => {
        const fetchImpl = mockFetch(500, { error: "server" });
        const provider = makeProvider({ baseUrl: "b", apiKey: "k", model: "m", adapter: openaiAdapter, fetchImpl });
        await expect(provider.chat({ messages: [], tools: [] })).rejects.toThrow(/500/);
    });

    it("omits the tools field when there are no tools", async () => {
        const fetchImpl = mockFetch(200, { choices: [{ message: { content: "x" } }] });
        const provider = makeProvider({ baseUrl: "b", apiKey: "k", model: "m", adapter: openaiAdapter, fetchImpl });
        await provider.chat({ messages: [{ role: "user", content: "hi" }], tools: [] });
        const sent = JSON.parse((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
        expect(sent.tools).toBeUndefined();
    });
});
