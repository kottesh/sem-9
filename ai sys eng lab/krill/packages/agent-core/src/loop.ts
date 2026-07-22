import type { LLMProvider, NeutralMessage } from "./provider.js";
import type { ToolRegistry } from "./registry.js";
import type { MemoryProvider } from "./memory.js";
import type { AgentIO } from "./io.js";

export interface RunTurnOptions<C> {
    provider: LLMProvider;
    registry: ToolRegistry<C>;
    memory: MemoryProvider;
    /** Mutable running conversation; the turn appends to it. */
    messages: NeutralMessage[];
    userInput: string;
    maxToolIterations?: number;
    io?: Pick<AgentIO, "onToolStart" | "onToolEnd">;
}

export interface TurnResult {
    assistant: string;
    stoppedReason?: "max_iterations";
}

/**
 * Run one conversational turn: append user input, drive the tool loop until the
 * model produces a final text answer (or the iteration guard trips), and record
 * both turns in memory. `messages` is mutated in place.
 */
export async function runTurn<C>(opts: RunTurnOptions<C>): Promise<TurnResult> {
    const { provider, registry, memory, messages, userInput } = opts;
    const maxToolIterations = opts.maxToolIterations ?? 8;

    await memory.addTurn("user", userInput);
    messages.push({ role: "user", content: userInput });

    const tools = registry.list();
    let stoppedReason: TurnResult["stoppedReason"];

    let res = await provider.chat({ messages, tools });
    let iterations = 0;

    while (res.toolCalls && res.toolCalls.length > 0) {
        if (iterations >= maxToolIterations) {
            stoppedReason = "max_iterations";
            break;
        }
        iterations++;

        // record the assistant's tool-call message so the provider has context
        messages.push({ role: "assistant", content: res.content ?? "", toolCalls: res.toolCalls });

        for (const call of res.toolCalls) {
            opts.io?.onToolStart?.(call.name, call.args);
            const result = await registry.dispatch(call.name, call.args);
            opts.io?.onToolEnd?.(call.name);
            result.render?.();
            messages.push({ role: "tool", content: JSON.stringify(result.llm), toolCallId: call.id });
        }

        res = await provider.chat({ messages, tools });
    }

    const assistant = res.content ?? "";
    messages.push({ role: "assistant", content: assistant });
    if (assistant) await memory.addTurn("assistant", assistant);

    return { assistant, stoppedReason };
}
