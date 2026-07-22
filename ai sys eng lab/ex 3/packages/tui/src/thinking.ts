import { theme } from "./ansi.js";
import type { WriteFn } from "./stream.js";

/**
 * Renders streamed reasoning ("thinking") tokens in a dim, indented block that
 * is visually separated from the final answer. Prints a header once on the
 * first delta and a divider when the answer begins.
 */
export class ThinkingView {
    private started = false;
    private atLineStart = true;

    constructor(private readonly sink: WriteFn = (s) => process.stdout.write(s)) {}

    /** Whether a thinking block is currently open. */
    get active(): boolean {
        return this.started;
    }

    thinking(delta: string): void {
        if (delta === "") return;
        if (!this.started) {
            this.started = true;
            this.sink(theme.dim(theme.italic("\u{1f4ad} thinking\n")));
            this.atLineStart = true;
        }
        // Indent each new line of the reasoning stream.
        const text = delta.replace(/\n/g, () => {
            this.atLineStart = true;
            return "\n";
        });
        const prefixed = this.atLineStart ? "  " + text : text;
        this.atLineStart = text.endsWith("\n");
        this.sink(theme.dim(theme.italic(prefixed)));
    }

    /** Close the thinking block with a divider (no-op if never started). */
    endThinking(): void {
        if (!this.started) return;
        this.started = false;
        this.sink(theme.dim("\n\u2500\u2500\u2500\n"));
    }
}
