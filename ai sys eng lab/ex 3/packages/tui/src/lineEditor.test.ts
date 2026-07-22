import { describe, expect, it } from "vitest";
import type { Terminal } from "./runtime.js";
import { LineEditor } from "./lineEditor.js";

class FakeTerminal implements Terminal {
    columns = 40;
    rows = 24;
    output = "";
    started = false;
    stopped = false;
    private input?: (data: string) => void;
    private resize?: () => void;

    start(onInput: (data: string) => void, onResize: () => void): void {
        this.started = true;
        this.input = onInput;
        this.resize = onResize;
    }

    stop(): void {
        this.stopped = true;
    }

    write(data: string): void { this.output += data; }

    send(data: string): void {
        this.input?.(data);
    }

    resizeTo(columns: number, rows: number): void {
        this.columns = columns;
        this.rows = rows;
        this.resize?.();
    }
}

async function settle(): Promise<void> {
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
}

async function run(keys: string[]) {
    const terminal = new FakeTerminal();
    const editor = new LineEditor({ terminal, prompt: "you ›", maxRows: 15 });
    const result = editor.read();
    await settle();
    for (const key of keys) {
        terminal.send(key);
        await settle();
    }
    return { result: await result, terminal };
}

describe("LineEditor", () => {
    it("submits typed text on Enter", async () => {
        const { result } = await run(["h", "i", "\r"]);
        expect(result).toBe("hi");
    });

    it("inserts a newline with Ctrl+J", async () => {
        const { result } = await run(["a", "\n", "b", "\r"]);
        expect(result).toBe("a\nb");
    });

    it("continues on trailing backslash + Enter", async () => {
        const { result } = await run(["a", "\\", "\r", "b", "\r"]);
        expect(result).toBe("a\nb");
    });

    it("supports Ctrl+A, Ctrl+E, and Ctrl+U", async () => {
        const { result } = await run(["hello", "\x01", "X", "\x05", "!", "\x15", "done", "\r"]);
        expect(result).toBe("done");
    });

    it("moves vertically inside multiline input without moving the component", async () => {
        const { result } = await run(["abc", "\n", "def", "\x1b[A", "X", "\r"]);
        expect(result).toBe("abcX\ndef");
    });

    it("returns null on Ctrl+D when empty", async () => {
        const { result } = await run(["\x04"]);
        expect(result).toBeNull();
    });

    it("clears nonempty input on first Ctrl+C and exits on the second", async () => {
        const { result } = await run(["draft", "\x03", "\x03"]);
        expect(result).toBeNull();
    });

    it("starts and stops the terminal cleanly", async () => {
        const { terminal } = await run(["ok", "\r"]);
        expect(terminal.started).toBe(true);
        expect(terminal.stopped).toBe(true);
        expect(terminal.output).toContain("\x1b[?2026h");
        expect(terminal.output).toContain("\x1b[?2026l");
    });

    it("uses synchronized differential rendering without full clears during typing", async () => {
        const terminal = new FakeTerminal();
        const editor = new LineEditor({ terminal });
        const result = editor.read();
        await settle();
        terminal.output = "";

        terminal.send("a");
        await settle();
        terminal.send("b");
        await settle();

        expect(terminal.output).toContain("\x1b[?2026h");
        expect(terminal.output).toContain("\x1b[?2026l");
        expect(terminal.output).not.toContain("\x1b[2J");

        terminal.send("\r");
        await result;
    });
});
