import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { runTurn } from "./loop.js";
import { ToolRegistry } from "./registry.js";
import { defineTool } from "./tool.js";
import { nullMemory } from "./memory.js";
import type { LLMProvider, ChatResponse, NeutralMessage } from "./provider.js";

function scriptedProvider(responses: ChatResponse[]): { provider: LLMProvider; calls: NeutralMessage[][] } {
    let i = 0;
    const calls: NeutralMessage[][] = [];
    const provider: LLMProvider = {
        async chat({ messages }) {
            calls.push(messages);
            return responses[Math.min(i++, responses.length - 1)];
        }
    };
    return { provider, calls };
}

const playTool = (spy?: (uri: string) => void) =>
    defineTool<{ marker: string }, { uri: string }>({
        name: "play",
        description: "play",
        parameters: z.object({ uri: z.string() }),
        async execute(args) {
            spy?.(args.uri);
            return { llm: { ok: true, playing: args.uri } };
        }
    });

describe("runTurn", () => {
    it("returns the assistant text when the model makes no tool calls", async () => {
        const { provider } = scriptedProvider([{ content: "here is a chill playlist idea" }]);
        const registry = new ToolRegistry({ marker: "m" });
        const messages: NeutralMessage[] = [{ role: "system", content: "sys" }];

        const out = await runTurn({ provider, registry, memory: nullMemory, messages, userInput: "suggest music" });

        expect(out.assistant).toBe("here is a chill playlist idea");
        // messages now contain the user input and the assistant reply
        expect(messages.at(-1)).toMatchObject({ role: "assistant", content: "here is a chill playlist idea" });
        expect(messages.some((m) => m.role === "user" && m.content === "suggest music")).toBe(true);
    });

    it("executes tool calls then continues to a final answer", async () => {
        const spy = vi.fn();
        const { provider, calls } = scriptedProvider([
            { toolCalls: [{ id: "c1", name: "play", args: { uri: "spotify:track:1" } }] },
            { content: "now playing your track" }
        ]);
        const registry = new ToolRegistry({ marker: "m" }).register(playTool(spy));
        const messages: NeutralMessage[] = [];

        const out = await runTurn({ provider, registry, memory: nullMemory, messages, userInput: "play it" });

        expect(spy).toHaveBeenCalledWith("spotify:track:1");
        expect(out.assistant).toBe("now playing your track");
        // second provider call must include the tool result message
        const secondCall = calls[1];
        expect(secondCall.some((m) => m.role === "tool" && m.toolCallId === "c1")).toBe(true);
    });

    it("invokes render side effects for tool results", async () => {
        const rendered = vi.fn();
        const renderTool = defineTool<{ marker: string }, Record<string, never>>({
            name: "show",
            description: "d",
            parameters: z.object({}),
            async execute() {
                return { llm: { ok: true }, render: rendered };
            }
        });
        const { provider } = scriptedProvider([
            { toolCalls: [{ id: "c1", name: "show", args: {} }] },
            { content: "done" }
        ]);
        const registry = new ToolRegistry({ marker: "m" }).register(renderTool);
        await runTurn({ provider, registry, memory: nullMemory, messages: [], userInput: "x" });
        expect(rendered).toHaveBeenCalledOnce();
    });

    it("stops after maxToolIterations to prevent infinite loops", async () => {
        // model always asks for a tool, never answers
        const { provider } = scriptedProvider([
            { toolCalls: [{ id: "c", name: "play", args: { uri: "u" } }] }
        ]);
        const registry = new ToolRegistry({ marker: "m" }).register(playTool());
        const out = await runTurn({
            provider,
            registry,
            memory: nullMemory,
            messages: [],
            userInput: "loop",
            maxToolIterations: 3
        });
        expect(out.stoppedReason).toBe("max_iterations");
    });

    it("records both turns in memory", async () => {
        const addTurn = vi.fn(async () => {});
        const memory = { ...nullMemory, addTurn };
        const { provider } = scriptedProvider([{ content: "reply" }]);
        const registry = new ToolRegistry({ marker: "m" });
        await runTurn({ provider, registry, memory, messages: [], userInput: "hi" });
        expect(addTurn).toHaveBeenNthCalledWith(1, "user", "hi");
        expect(addTurn).toHaveBeenNthCalledWith(2, "assistant", "reply");
    });

    it("notifies io hooks around tool execution", async () => {
        const onToolStart = vi.fn();
        const onToolEnd = vi.fn();
        const { provider } = scriptedProvider([
            { toolCalls: [{ id: "c1", name: "play", args: { uri: "u" } }] },
            { content: "ok" }
        ]);
        const registry = new ToolRegistry({ marker: "m" }).register(playTool());
        await runTurn({
            provider,
            registry,
            memory: nullMemory,
            messages: [],
            userInput: "x",
            io: { onToolStart, onToolEnd } as any
        });
        expect(onToolStart).toHaveBeenCalledWith("play", { uri: "u" });
        expect(onToolEnd).toHaveBeenCalledWith("play");
    });

    it("streams final-answer tokens via onToken when stream is enabled", async () => {
        const streamProvider: LLMProvider = {
            async chat() {
                return { content: "unused" };
            },
            async chatStream(_input, onEvent) {
                onEvent({ type: "thinking", delta: "pondering" });
                onEvent({ type: "text", delta: "Hel" });
                onEvent({ type: "text", delta: "lo" });
                return { content: "Hello", thinking: "pondering" };
            }
        };
        const registry = new ToolRegistry({ marker: "m" });
        const tokens: string[] = [];
        const thoughts: string[] = [];
        const out = await runTurn({
            provider: streamProvider,
            registry,
            memory: nullMemory,
            messages: [],
            userInput: "hi",
            stream: true,
            onToken: (t) => tokens.push(t),
            onThinking: (t) => thoughts.push(t)
        });
        expect(tokens.join("")).toBe("Hello");
        expect(thoughts.join("")).toBe("pondering");
        expect(out.assistant).toBe("Hello");
    });

    it("falls back to non-streaming chat when provider lacks chatStream", async () => {
        const { provider } = scriptedProvider([{ content: "plain" }]);
        const registry = new ToolRegistry({ marker: "m" });
        const tokens: string[] = [];
        const out = await runTurn({
            provider,
            registry,
            memory: nullMemory,
            messages: [],
            userInput: "hi",
            stream: true,
            onToken: (t) => tokens.push(t)
        });
        expect(out.assistant).toBe("plain");
    });
});
