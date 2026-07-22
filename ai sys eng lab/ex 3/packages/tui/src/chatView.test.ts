import { describe, expect, it } from "vitest";
import type { Terminal } from "./runtime.js";
import { stripAnsi } from "./ansi.js";
import { ChatView } from "./chatView.js";

class FakeTerminal implements Terminal {
    columns = 72;
    rows = 24;
    output = "";
    private input?: (data: string) => void;
    start(onInput: (data: string) => void): void { this.input = onInput; }
    stop(): void {}
    write(data: string): void { this.output += data; }
    send(data: string): void { this.input?.(data); }
}

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 25));

describe("ChatView", () => {
    it("renders Markdown messages inside the persistent component tree", async () => {
        const terminal = new FakeTerminal();
        const view = new ChatView({ title: "cappy", terminal });
        view.addMarkdown("# Review\n\n- **Quantify** the impact\n- use `metrics`");
        await settle();
        const plain = stripAnsi(terminal.output);
        expect(plain).toContain("Review");
        expect(plain).toContain("Quantify");
        expect(plain).toContain("metrics");
        view.stop();
    });

    it("updates streamed Markdown differentially without clearing the screen", async () => {
        const terminal = new FakeTerminal();
        const view = new ChatView({ title: "cappy", terminal });
        view.start();
        await settle();
        terminal.output = "";
        view.appendAnswer("**strong");
        await settle();
        view.appendAnswer(" result**");
        await settle();
        expect(stripAnsi(terminal.output)).toContain("strong result");
        expect(terminal.output).toContain("\x1b[?2026h");
        expect(terminal.output).not.toContain("\x1b[2J");
        view.stop();
    });

    it("renders thinking and transitions a tool from running to done", async () => {
        const terminal = new FakeTerminal();
        const view = new ChatView({ title: "cappy", terminal });
        view.appendThinking("Inspecting experience bullets");
        view.toolStart("read_file");
        await settle();
        view.toolEnd("read_file");
        await settle();
        const plain = stripAnsi(terminal.output);
        expect(plain).toContain("thinking");
        expect(plain).toContain("Inspecting experience bullets");
        expect(plain).toContain("✓ read_file");
        view.stop();
    });

    it("keeps the editor active and resolves submitted input", async () => {
        const terminal = new FakeTerminal();
        const view = new ChatView({ title: "cappy", terminal });
        const input = view.read();
        await settle();
        terminal.send("review this");
        await settle();
        terminal.send("\r");
        expect(await input).toBe("review this");
        await settle();
        expect(stripAnsi(terminal.output)).toContain("review this");
        view.stop();
    });

    it("places the final assistant segment after completed tool output", async () => {
        const terminal = new FakeTerminal();
        const view = new ChatView({ title: "cappy", terminal });
        view.appendAnswer("I will inspect it.");
        view.toolStart("bash");
        view.addToolOutput("$ echo result", "result");
        view.toolEnd("bash");
        view.appendAnswer("Here is the final answer.");
        await settle();

        const plain = stripAnsi(terminal.output);
        expect(plain.indexOf("I will inspect it.")).toBeLessThan(plain.indexOf("$ echo result"));
        expect(plain.indexOf("$ echo result")).toBeLessThan(plain.indexOf("Here is the final answer."));
        view.stop();
    });

    it("accepts and queues the next prompt while the agent is working", async () => {
        const terminal = new FakeTerminal();
        const view = new ChatView({ title: "cappy", terminal });
        const first = view.read();
        await settle();
        terminal.send("first prompt");
        terminal.send("\r");
        expect(await first).toBe("first prompt");

        // No read() is pending now: this simulates the agent still working.
        terminal.send("next prompt");
        terminal.send("\r");
        await settle();

        // The next loop iteration receives the already-submitted prompt.
        await expect(view.read()).resolves.toBe("next prompt");
        expect(stripAnsi(terminal.output)).toContain("next prompt");
        view.stop();
    });
});
