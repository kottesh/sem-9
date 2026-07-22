import { EditorView } from "./editorView.js";
import { ProcessTerminal, ScreenRenderer, type Terminal } from "./runtime.js";

export interface LineEditorOptions {
    prompt?: string;
    maxRows?: number;
    terminal?: Terminal;
}

/** Standalone promise-based facade over our EditorView + ScreenRenderer. */
export class LineEditor {
    constructor(private readonly options: LineEditorOptions = {}) {}

    read(): Promise<string | null> {
        return new Promise((resolve) => {
            const terminal = this.options.terminal ?? new ProcessTerminal();
            let settled = false;
            let renderer: ScreenRenderer;
            const finish = (value: string | null) => {
                if (settled) return;
                settled = true;
                renderer.stop();
                resolve(value);
            };
            const editor = new EditorView({
                label: this.options.prompt ?? "you ›",
                maxRows: this.options.maxRows ?? 15,
                onSubmit: (text) => finish(text),
                onCancel: () => finish(null),
                onClearScreen: () => renderer.requestRender(true),
                onChange: () => renderer.requestRender()
            });
            renderer = new ScreenRenderer(terminal, editor);
            renderer.start();
        });
    }
}
