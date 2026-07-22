import { describe, expect, it } from "vitest";
import { ChatView, stripAnsi } from "@agent/tui";
import { CappyUI } from "./cappyUI.js";

class FakeTerminal {
    columns = 72;
    rows = 24;
    output = "";
    start(): void {}
    stop(): void {}
    write(data: string): void { this.output += data; }
}

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 30));

describe("CappyUI", () => {
    it("renders every cappy surface through one persistent ChatView", async () => {
        const terminal = new FakeTerminal();
        const view = new ChatView({ title: "cappy", terminal: terminal as any });
        const ui = new CappyUI(view);

        ui.banner();
        ui.info("info");
        ui.warn("warn");
        ui.error("err");
        ui.assistant("## Review\n\n**hi** there");
        ui.fileView("resume.md", "line1\nline2");
        ui.bashResult("echo x", {
            stdout: "x\n",
            stderr: "",
            exitCode: 0,
            timedOut: false,
            truncated: false,
            requestedTimeoutMs: 5000
        });
        ui.suggestions(["quantify impact", "use action verbs"]);
        await settle();

        const plain = stripAnsi(terminal.output);
        for (const expected of [
            "info",
            "warn",
            "err",
            "Review",
            "hi there",
            "read resume.md",
            "line1",
            "$ echo x · exit 0",
            "quantify impact"
        ]) {
            expect(plain).toContain(expected);
        }
        view.stop();
    });
});
