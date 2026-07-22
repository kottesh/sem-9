import { ChatView } from "@agent/tui";

export interface BashResultView {
    stdout: string;
    stderr: string;
    exitCode: number | null;
    timedOut: boolean;
    truncated: boolean;
    requestedTimeoutMs: number;
}

/** Thin cappy-specific adapter over the reusable persistent ChatView. */
export class CappyUI {
    readonly view: ChatView;

    constructor(view?: ChatView) {
        this.view = view ?? new ChatView({
            title: "cappy",
            subtitle: "resume review agent · Ctrl+J newline · Enter send · PageUp/Down scroll · /exit quit",
            prompt: "you ›",
            maxEditorRows: 15
        });
    }

    banner(): void {
        this.view.start();
    }

    info(text: string): void {
        this.view.addInfo(text);
    }

    warn(text: string): void {
        this.view.addWarning(text);
    }

    error(text: string): void {
        this.view.addError(text);
    }

    assistant(text: string): void {
        this.view.addMarkdown(text);
    }

    fileView(path: string, content: string): void {
        const numbered = content
            .split("\n")
            .map((line, index) => `${String(index + 1).padStart(4)} │ ${line}`)
            .join("\n");
        this.view.addToolOutput(`read ${path}`, numbered);
    }

    bashResult(command: string, result: BashResultView): void {
        const status = result.timedOut
            ? `timed out after ${result.requestedTimeoutMs}ms`
            : `exit ${result.exitCode}`;
        const chunks = [result.stdout.trimEnd(), result.stderr.trimEnd()].filter(Boolean);
        if (result.truncated) chunks.push("… output truncated");
        this.view.addToolOutput(`$ ${command} · ${status}`, chunks.join("\n"), Boolean(result.stderr));
    }

    suggestions(items: string[]): void {
        this.view.addMarkdown(items.map((item) => `- ${item}`).join("\n"));
    }
}
