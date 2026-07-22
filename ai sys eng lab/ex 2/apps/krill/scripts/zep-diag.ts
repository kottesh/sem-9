import { config as loadEnv } from "dotenv";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ZepClient } from "@getzep/zep-cloud";

loadEnv({ path: join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", ".env") });

const apiKey = process.env.ZEP_API_KEY!;
const client = new ZepClient({ apiKey });

const userId = `krill-diag-${Date.now()}`;
const threadId = `${userId}-t`;

async function step<T>(label: string, fn: () => Promise<T>): Promise<T | undefined> {
    try {
        const out = await fn();
        console.log(`\u2713 ${label}`);
        return out;
    } catch (err: any) {
        console.error(`\u2717 ${label}: ${err?.statusCode ?? ""} ${err?.message ?? err}`);
        return undefined;
    }
}

async function main() {
    console.log("user:", userId, "thread:", threadId, "\n");

    await step("user.add", () => client.user.add({ userId }));
    await step("thread.create", () => client.thread.create({ threadId, userId }));
    await step("thread.addMessages (user)", () =>
        client.thread.addMessages(threadId, {
            messages: [{ role: "user", name: "user", content: "I love shoegaze and lo-fi for studying" }]
        })
    );
    await step("thread.addMessages (assistant)", () =>
        client.thread.addMessages(threadId, {
            messages: [{ role: "assistant", name: "krill", content: "Great, I'll remember shoegaze + lo-fi." }]
        })
    );

    await new Promise((r) => setTimeout(r, 2000));

    const msgs = await step("thread.get (messages)", () => client.thread.get(threadId));
    console.log("   -> messages stored:", (msgs as any)?.messages?.length ?? 0);

    const ctx = await step("thread.getUserContext", () => client.thread.getUserContext(threadId));
    console.log("   -> context:", JSON.stringify((ctx as any)?.context ?? "").slice(0, 160));

    await step("graph.add (fact)", () => client.graph.add({ userId, type: "text", data: "prefers shoegaze" }));
}

main().catch((e) => {
    console.error("fatal:", e);
    process.exit(1);
});
