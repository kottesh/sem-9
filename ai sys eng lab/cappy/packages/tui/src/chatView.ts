import { theme } from "./ansi.js";
import { EditorView } from "./editorView.js";
import { ProcessTerminal, ScreenRenderer, type Component, type Terminal } from "./runtime.js";
import { MarkdownView, TextView, titleLine } from "./viewComponents.js";

export interface ChatViewOptions {
    title: string;
    subtitle?: string;
    prompt?: string;
    maxEditorRows?: number;
    terminal?: Terminal;
}

class ChatRoot implements Component {
    readonly messages: Component[] = [];

    constructor(
        private readonly title: string,
        private readonly subtitle: string | undefined,
        readonly editor: EditorView
    ) {}

    add(component: Component): void { this.messages.push(component); }

    render(width: number): string[] {
        const lines = [titleLine(this.title, width)];
        if (this.subtitle) lines.push(theme.dim(this.subtitle.slice(0, width)));
        lines.push("");
        for (const message of this.messages) lines.push(...message.render(width));
        lines.push(...this.editor.render(width));
        return lines;
    }

    handleInput(data: string): void { this.editor.handleInput(data); }
}

/** Persistent chat UI rendered entirely by our component/runtime implementation. */
export class ChatView {
    private readonly renderer: ScreenRenderer;
    private readonly root: ChatRoot;
    private inputResolve: ((value: string | null) => void) | null = null;
    private answer: MarkdownView | null = null;
    private thinking: TextView | null = null;
    private answerText = "";
    private thinkingText = "";
    private activeTools = new Map<string, TextView>();
    private queuedInputs: string[] = [];
    private started = false;

    constructor(opts: ChatViewOptions) {
        const terminal = opts.terminal ?? new ProcessTerminal();
        const editor = new EditorView({
            label: opts.prompt ?? "you ›",
            maxRows: opts.maxEditorRows ?? 15,
            onSubmit: (text) => {
                if (!text) return;
                this.addUser(text);
                if (this.inputResolve) this.resolveInput(text);
                else this.queuedInputs.push(text);
            },
            onCancel: () => this.resolveInput(null),
            onClearScreen: () => this.renderer.requestRender(true),
            onChange: () => this.renderer.requestRender()
        });
        this.root = new ChatRoot(opts.title, opts.subtitle, editor);
        this.renderer = new ScreenRenderer(terminal, this.root);
    }

    start(): void {
        if (this.started) return;
        this.started = true;
        this.renderer.start();
    }

    read(): Promise<string | null> {
        this.start();
        if (this.inputResolve) throw new Error("ChatView.read() already pending");
        const queued = this.queuedInputs.shift();
        if (queued !== undefined) return Promise.resolve(queued);
        return new Promise((resolve) => { this.inputResolve = resolve; });
    }

    private resolveInput(value: string | null): void {
        const resolve = this.inputResolve;
        if (!resolve) return;
        this.inputResolve = null;
        resolve(value);
    }

    private add(component: Component): void {
        this.start();
        this.root.add(component);
        this.renderer.requestRender();
    }

    addUser(text: string): void {
        this.add(new TextView(`you\n${text}`, 1, (value) => theme.accent(value)));
        this.add(new TextView(""));
    }

    addInfo(text: string): void { this.add(new TextView(text, 1, theme.dim)); }
    addWarning(text: string): void { this.add(new TextView(text, 1, theme.warn)); }
    addError(text: string): void { this.add(new TextView(text, 1, theme.error)); }

    addMarkdown(text: string): void {
        this.add(new TextView("cappy", 1, (value) => theme.primary(theme.bold(value))));
        this.add(new MarkdownView(text, 1));
        this.add(new TextView(""));
    }

    appendThinking(delta: string): void {
        if (!this.thinking) {
            this.thinkingText = "";
            this.thinking = new TextView("", 1, (value) => theme.dim(theme.italic(value)));
            this.add(this.thinking);
        }
        this.thinkingText += delta;
        this.thinking.setText(`thinking\n${this.thinkingText}`);
        this.renderer.requestRender();
    }

    appendAnswer(delta: string): void {
        if (!this.answer) {
            this.answerText = "";
            this.add(new TextView("cappy", 1, (value) => theme.primary(theme.bold(value))));
            this.answer = new MarkdownView("", 1);
            this.add(this.answer);
        }
        this.answerText += delta;
        this.answer.setText(this.answerText);
        this.renderer.requestRender();
    }

    finishAnswer(): void {
        if (this.answer || this.thinking) this.add(new TextView(""));
        this.answer = null;
        this.thinking = null;
        this.answerText = "";
        this.thinkingText = "";
    }

    toolStart(name: string): void {
        // A tool call ends the current assistant segment. Any later streamed
        // text is a new component, so it appears after the tool/result rows.
        this.answer = null;
        this.answerText = "";
        this.thinking = null;
        this.thinkingText = "";
        const line = new TextView(`⚙ ${name}…`, 1, theme.dim);
        this.activeTools.set(name, line);
        this.add(line);
    }

    toolEnd(name: string): void {
        const line = this.activeTools.get(name);
        if (!line) return;
        line.setText(`✓ ${name}`);
        this.activeTools.delete(name);
        this.renderer.requestRender();
    }

    addToolOutput(title: string, content: string, error = false): void {
        const body = content.trim() || "(no output)";
        this.add(new TextView(`${title}\n${body}`, 2, error ? theme.error : theme.dim));
    }

    stop(): void {
        if (!this.started) return;
        this.resolveInput(null);
        this.renderer.stop();
        this.started = false;
    }
}
