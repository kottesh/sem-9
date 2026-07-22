import readline from "node:readline";
import chalk from "chalk";
import type { AgentIO } from "@krill/agent-core";
import { KrillUI } from "./render.js";

/** Terminal I/O for the agent loop: readline input + chalk output. */
export class TerminalIO implements AgentIO {
    private readonly rl: readline.Interface;

    constructor(private readonly ui: KrillUI) {
        this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    }

    input(prompt: string): Promise<string | null> {
        return new Promise((resolve) => {
            this.rl.question(chalk.cyanBright(prompt), (answer) => {
                const trimmed = answer.trim();
                if (trimmed === "/exit" || trimmed === "exit" || trimmed === "/quit") {
                    resolve(null);
                } else {
                    resolve(trimmed);
                }
            });
        });
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
        this.ui.info(`  \u2699 ${name}\u2026`);
    }

    close(): void {
        this.rl.close();
    }
}
