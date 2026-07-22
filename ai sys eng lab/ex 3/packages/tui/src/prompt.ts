import readline from "node:readline";
import { theme } from "./ansi.js";

const EXIT_WORDS = new Set(["/exit", "exit", "/quit", ":q"]);

/**
 * Readline wrapper that resolves null on EOF or an exit command. UI-agnostic
 * building block used by app IO layers.
 */
export class LineReader {
    private readonly rl: readline.Interface;

    constructor(
        input: NodeJS.ReadableStream = process.stdin,
        output: NodeJS.WritableStream = process.stdout
    ) {
        this.rl = readline.createInterface({ input, output });
    }

    question(prompt: string): Promise<string | null> {
        return new Promise((resolve) => {
            this.rl.question(theme.cyan(prompt), (answer) => {
                const trimmed = answer.trim();
                resolve(EXIT_WORDS.has(trimmed) ? null : trimmed);
            });
        });
    }

    close(): void {
        this.rl.close();
    }
}
