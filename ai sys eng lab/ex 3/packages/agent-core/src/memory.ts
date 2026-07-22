/** Long-term memory abstraction the agent loop uses (implementation is injected). */
export interface MemoryProvider {
    /** Record a conversational turn. */
    addTurn(role: "user" | "assistant", content: string): Promise<void>;
    /** Return a summarized memory block to inject into the system prompt. */
    getContext(): Promise<string>;
    /** Persist a durable fact (e.g. a taste preference). */
    remember(fact: string): Promise<void>;
    /** Retrieve relevant facts for a query. */
    recall(query: string): Promise<string>;
}

/** A no-op memory used when no backend is configured. */
export const nullMemory: MemoryProvider = {
    async addTurn() {},
    async getContext() {
        return "";
    },
    async remember() {},
    async recall() {
        return "";
    }
};
