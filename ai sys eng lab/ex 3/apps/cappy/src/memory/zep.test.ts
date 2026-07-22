import { describe, it, expect, vi } from "vitest";
import { CappyMemory } from "./zep.js";

function fakeClient() {
    return {
        user: { add: vi.fn(async () => {}) },
        thread: {
            create: vi.fn(async () => {}),
            addMessages: vi.fn(async () => {}),
            getUserContext: vi.fn(async () => ({ context: "CTX" }))
        },
        graph: {
            add: vi.fn(async () => {}),
            search: vi.fn(async () => ({ edges: [{ fact: "targets senior SWE roles" }] }))
        }
    };
}

function mem(client: any) {
    const m = new CappyMemory({ apiKey: "k", user: "alice" });
    (m as any).client = client;
    return m;
}

describe("CappyMemory", () => {
    it("uses a cappy-namespaced user + thread", async () => {
        const client = fakeClient();
        const m = mem(client);
        await m.addTurn("user", "hi");
        expect(client.user.add).toHaveBeenCalledWith({ userId: "cappy-alice" });
        const threadArg = client.thread.create.mock.calls[0][0];
        expect(threadArg.userId).toBe("cappy-alice");
        expect(threadArg.threadId).toMatch(/^cappy-alice-/);
    });

    it("adds a message turn with the right role", async () => {
        const client = fakeClient();
        const m = mem(client);
        await m.addTurn("assistant", "reply");
        const call = client.thread.addMessages.mock.calls[0][1];
        expect(call.messages[0]).toMatchObject({ role: "assistant", content: "reply" });
    });

    it("returns the context block", async () => {
        const m = mem(fakeClient());
        expect(await m.getContext()).toBe("CTX");
    });

    it("stores durable facts via graph.add", async () => {
        const client = fakeClient();
        const m = mem(client);
        await m.remember("targets senior SWE roles");
        expect(client.graph.add).toHaveBeenCalledWith({ userId: "cappy-alice", type: "text", data: "targets senior SWE roles" });
    });

    it("recalls facts from graph.search", async () => {
        const m = mem(fakeClient());
        expect(await m.recall("career goals")).toContain("senior SWE");
    });

    it("fails soft when the client throws", async () => {
        const client = fakeClient();
        client.thread.getUserContext = vi.fn(async () => {
            throw new Error("zep down");
        });
        const m = mem(client);
        await expect(m.getContext()).resolves.toBe("");
    });
});
