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
