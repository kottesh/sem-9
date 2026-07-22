import type { AgentIO } from "@agent/core";
import type { CappyUI } from "./cappyUI.js";

/** AgentIO adapter for cappy's persistent component-based chat surface. */
export class CappyIO implements AgentIO {
    constructor(private readonly ui: CappyUI) {}

    async input(_prompt: string): Promise<string | null> {
        const value = await this.ui.view.read();
        return value?.trim() === "/exit" ? null : value;
    }

    onThinking(delta: string): void {
        this.ui.view.appendThinking(delta);
    }

    onToken(delta: string): void {
        this.ui.view.appendAnswer(delta);
    }

    finishStream(): void {
        this.ui.view.finishAnswer();
    }

    printAssistant(text: string): void {
        this.ui.assistant(text);
    }

    printInfo(text: string): void {
        this.ui.info(text);
    }

    printError(text: string): void {
        this.ui.error(text);
    }

    onToolStart(name: string): void {
        this.ui.view.toolStart(name);
    }

    onToolEnd(name: string): void {
        this.ui.view.toolEnd(name);
    }

    close(): void {
        this.ui.view.stop();
    }
}
