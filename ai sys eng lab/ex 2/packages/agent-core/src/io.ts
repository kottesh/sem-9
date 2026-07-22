/** Terminal I/O abstraction so the loop stays UI-agnostic. */
export interface AgentIO {
    /** Read one line of user input; resolves null on EOF/exit. */
    input(prompt: string): Promise<string | null>;
    /** Print an assistant message. */
    printAssistant(text: string): void;
    /** Print an informational/system note. */
    printInfo(text: string): void;
    /** Print an error. */
    printError(text: string): void;
    /** Show that a tool is running (optional visual). */
    onToolStart?(name: string, args: unknown): void;
    /** Signal a tool finished. */
    onToolEnd?(name: string): void;
}
