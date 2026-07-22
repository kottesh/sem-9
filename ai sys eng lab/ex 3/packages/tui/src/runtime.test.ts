import { describe, expect, it } from "vitest";
import type { Component, Terminal } from "./runtime.js";
import { ScreenRenderer } from "./runtime.js";

class FakeTerminal implements Terminal {
    columns = 40;
    rows = 6;
    output = "";
    private input?: (data: string) => void;
    start(onInput: (data: string) => void): void { this.input = onInput; }
    stop(): void {}
    write(data: string): void { this.output += data; }
    send(data: string): void { this.input?.(data); }
}

class Lines implements Component {
    items = Array.from({ length: 12 }, (_, index) => `line ${index + 1}`);
    inputs: string[] = [];
    render(): string[] { return this.items; }
    handleInput(data: string): void { this.inputs.push(data); }
}

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe("ScreenRenderer scrollback", () => {
    it("shows the newest terminal-height lines by default", () => {
        const terminal = new FakeTerminal();
        const root = new Lines();
        const renderer = new ScreenRenderer(terminal, root);
        renderer.start();
        renderer.renderNow();
        expect(terminal.output).toContain("line 12");
        expect(terminal.output).not.toContain("line 1\x1b");
        renderer.stop();
    });

    it("PageUp opens history without forwarding the key to the component", async () => {
        const terminal = new FakeTerminal();
        const root = new Lines();
        const renderer = new ScreenRenderer(terminal, root);
        renderer.start();
        renderer.renderNow();
        terminal.output = "";
        terminal.send("\x1b[5~");
        await settle();
        expect(terminal.output).toContain("history");
        expect(terminal.output).toContain("line 3");
        expect(root.inputs).toEqual([]);
        renderer.stop();
    });

    it("keeps the same history content visible when new lines arrive", async () => {
        const terminal = new FakeTerminal();
        const root = new Lines();
        const renderer = new ScreenRenderer(terminal, root);
        renderer.start();
        renderer.renderNow();
        terminal.send("\x1b[5~");
        await settle();
        terminal.output = "";
        root.items.push("line 13", "line 14");
        renderer.requestRender();
        await settle();
        expect(terminal.output).not.toContain("line 13");
        expect(terminal.output).not.toContain("line 14");
        renderer.stop();
    });

    it("PageDown and End return toward the live bottom", async () => {
        const terminal = new FakeTerminal();
        const root = new Lines();
        const renderer = new ScreenRenderer(terminal, root);
        renderer.start();
        renderer.renderNow();
        terminal.send("\x1b[5~");
        await settle();
        terminal.output = "";
        terminal.send("\x1b[F");
        await settle();
        expect(terminal.output).toContain("line 12");
        expect(root.inputs).toEqual([]);
        renderer.stop();
    });

    it("normal typing returns live and is forwarded to the component", async () => {
        const terminal = new FakeTerminal();
        const root = new Lines();
        const renderer = new ScreenRenderer(terminal, root);
        renderer.start();
        renderer.renderNow();
        terminal.send("\x1b[5~");
        await settle();
        terminal.output = "";
        terminal.send("x");
        await settle();
        expect(root.inputs).toEqual(["x"]);
        expect(terminal.output).toContain("line 12");
        renderer.stop();
    });

    it("supports SGR mouse-wheel up and down", async () => {
        const terminal = new FakeTerminal();
        const root = new Lines();
        const renderer = new ScreenRenderer(terminal, root);
        renderer.start();
        renderer.renderNow();
        terminal.send("\x1b[<64;10;5M");
        await settle();
        expect(root.inputs).toEqual([]);
        terminal.output = "";
        terminal.send("\x1b[<65;10;5M");
        await settle();
        expect(terminal.output).toContain("line 12");
        renderer.stop();
    });

    it("handles multiple wheel events batched in one stdin chunk", async () => {
        const terminal = new FakeTerminal();
        const root = new Lines();
        const renderer = new ScreenRenderer(terminal, root);
        renderer.start();
        renderer.renderNow();
        terminal.output = "";
        terminal.send("\x1b[<64;10;5M\x1b[<64;10;5M");
        await settle();
        expect(terminal.output).toContain("history");
        expect(terminal.output).toContain("line 2");
        expect(root.inputs).toEqual([]);
        renderer.stop();
    });

    it("accepts modifier-bearing SGR wheel button codes", async () => {
        const terminal = new FakeTerminal();
        const root = new Lines();
        const renderer = new ScreenRenderer(terminal, root);
        renderer.start();
        renderer.renderNow();
        terminal.output = "";
        terminal.send("\x1b[<68;10;5M");
        await settle();
        expect(terminal.output).toContain("history");
        renderer.stop();
    });
});
