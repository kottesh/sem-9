import { ZepClient } from "@getzep/zep-cloud";
import type { MemoryProvider } from "@krill/agent-core";

export interface ZepMemoryOptions {
    apiKey: string;
    userId: string;
    debug?: boolean;
}

/**
 * Zep Cloud-backed memory (v3 thread + graph API). Fails soft: if Zep is
 * unreachable, the agent keeps working with empty context.
 */
export class ZepMemory implements MemoryProvider {
    private readonly client: ZepClient;
    private readonly userId: string;
    private readonly threadId: string;
    private readonly debug: boolean;
    private ready: Promise<void> | null = null;

    constructor(opts: ZepMemoryOptions) {
        this.client = new ZepClient({ apiKey: opts.apiKey });
        this.userId = `krill-${opts.userId}`;
        this.threadId = `krill-${opts.userId}-${Date.now()}`;
        this.debug = opts.debug ?? false;
    }

    private warn(err: unknown): void {
        if (this.debug) console.error("[zep]", err instanceof Error ? err.message : err);
    }

    /** Idempotently ensure the user + thread exist. */
    private ensure(): Promise<void> {
        if (!this.ready) {
            this.ready = (async () => {
                await this.client.user.add({ userId: this.userId }).catch(() => {});
                await this.client.thread
                    .create({ threadId: this.threadId, userId: this.userId })
                    .catch(() => {});
            })();
        }
        return this.ready;
    }

    async addTurn(role: "user" | "assistant", content: string): Promise<void> {
        try {
            await this.ensure();
            await this.client.thread.addMessages(this.threadId, {
                messages: [{ role, name: role === "user" ? "user" : "krill", content }]
            });
        } catch (err) {
            this.warn(err);
        }
    }

    async getContext(): Promise<string> {
        try {
            await this.ensure();
            const res = await this.client.thread.getUserContext(this.threadId);
            return res.context ?? "";
        } catch (err) {
            this.warn(err);
            return "";
        }
    }

    async remember(fact: string): Promise<void> {
        try {
            await this.ensure();
            await this.client.graph.add({ userId: this.userId, type: "text", data: fact });
        } catch (err) {
            this.warn(err);
        }
    }

    async recall(query: string): Promise<string> {
        try {
            await this.ensure();
            const res = await this.client.graph.search({ userId: this.userId, query, limit: 5 });
            return (res.edges ?? [])
                .map((e) => e.fact)
                .filter(Boolean)
                .join("\n");
        } catch (err) {
            this.warn(err);
            return "";
        }
    }
}
