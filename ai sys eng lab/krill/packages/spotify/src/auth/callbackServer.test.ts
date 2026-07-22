import { describe, it, expect } from "vitest";
import { waitForCallback } from "./callbackServer.js";

async function hitCallback(port: number, path: string): Promise<number> {
    const res = await fetch(`http://127.0.0.1:${port}${path}`);
    return res.status;
}

describe("waitForCallback", () => {
    it("resolves with the code when the expected state matches", async () => {
        const pending = waitForCallback({ port: 0, path: "/callback", expectedState: "st1" });
        const { port } = await pending.ready;

        const status = await hitCallback(port, "/callback?code=AUTH123&state=st1");
        expect(status).toBe(200);

        const code = await pending.code;
        expect(code).toBe("AUTH123");
    });

    it("rejects when Spotify returns an error param", async () => {
        const pending = waitForCallback({ port: 0, path: "/callback", expectedState: "st2" });
        const rejection = expect(pending.code).rejects.toThrow(/access_denied/);
        const { port } = await pending.ready;

        await hitCallback(port, "/callback?error=access_denied&state=st2");
        await rejection;
    });

    it("rejects on state mismatch (CSRF guard)", async () => {
        const pending = waitForCallback({ port: 0, path: "/callback", expectedState: "good" });
        const rejection = expect(pending.code).rejects.toThrow(/state/i);
        const { port } = await pending.ready;

        await hitCallback(port, "/callback?code=X&state=evil");
        await rejection;
    });
});
