import { ZepClient } from "@getzep/zep-cloud";
import type { MemoryProvider } from "@agent/core";

export interface CappyMemoryOptions {
    apiKey: string;
    user: string;
    debug?: boolean;
}

/**
 * Zep Cloud memory for cappy (v3 thread + graph API), namespaced separately
 * from any other agent via the `cappy-` prefix. Fails soft: if Zep is
 * unreachable the agent keeps working with empty context.
 */
export class CappyMemory implements MemoryProvider {
    private readonly client: ZepClient;
    private readonly userId: string;
    private readonly threadId: string;
    private readonly debug: boolean;
    private ready: Promise<void> | null = null;

    constructor(opts: CappyMemoryOptions) {
        this.client = new ZepClient({ apiKey: opts.apiKey });
        this.userId = `cappy-${opts.user}`;
        this.threadId = `cappy-${opts.user}-${Date.now()}`;
        this.debug = opts.debug ?? false;
    }

    private warn(err: unknown): void {
        if (this.debug) console.error("[zep]", err instanceof Error ? err.message : err);
    }

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
                messages: [{ role, name: role === "user" ? "user" : "cappy", content }]
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
