import { visibleWidth } from "./ansi.js";
import { splitKeys } from "./keymap.js";

export const CURSOR_MARKER = "\x1b_cappy:cursor\x07";

export interface Component {
    render(width: number): string[];
    handleInput?(data: string): void;
    invalidate?(): void;
}

export interface Terminal {
    readonly columns: number;
    readonly rows: number;
    start(onInput: (data: string) => void, onResize: () => void): void;
    stop(): void;
    write(data: string): void;
}

/** Real raw-mode terminal. Escape sequences are confined to this adapter. */
export class ProcessTerminal implements Terminal {
    private wasRaw = false;
    private input?: (data: Buffer | string) => void;
    private resize?: () => void;

    get columns(): number { return process.stdout.columns || 80; }
    get rows(): number { return process.stdout.rows || 24; }

    start(onInput: (data: string) => void, onResize: () => void): void {
        this.wasRaw = Boolean(process.stdin.isRaw);
        process.stdin.setEncoding("utf8");
        process.stdin.setRawMode?.(true);
        process.stdin.resume();
        this.input = (data) => onInput(String(data));
        this.resize = onResize;
        process.stdin.on("data", this.input);
        process.stdout.on("resize", this.resize);
        // Alternate screen, bracketed paste, mouse tracking + SGR coordinates,
        // and hidden cursor. 1002 covers terminals that report wheel/motion only
        // while a button is active; 1000 covers ordinary press/wheel events.
        this.write("\x1b[?1049h\x1b[?2004h\x1b[?1000h\x1b[?1002h\x1b[?1006h\x1b[?1007h\x1b[?25l");
    }

    stop(): void {
        if (this.input) process.stdin.removeListener("data", this.input);
        if (this.resize) process.stdout.removeListener("resize", this.resize);
        process.stdin.pause();
        process.stdin.setRawMode?.(this.wasRaw);
        this.input = undefined;
        this.resize = undefined;
        // Restore mouse/paste modes, cursor, styling, and original screen.
        this.write("\x1b[?1007l\x1b[?1006l\x1b[?1002l\x1b[?1000l\x1b[?2004l\x1b[0m\x1b[?25h\x1b[?1049l");
    }

    write(data: string): void {
        process.stdout.write(data);
    }
}

/**
 * Central painter. Components return lines; this class alone addresses terminal
 * cells. Every frame is atomic (CSI 2026) and uses absolute positions.
 */
export class ScreenRenderer {
    private previous: string[] = [];
    private previousContentLength = 0;
    private scrollOffset = 0;
    private started = false;
    private requested = false;

    constructor(
        readonly terminal: Terminal,
        private readonly root: Component
    ) {}

    start(): void {
        if (this.started) return;
        this.started = true;
        this.terminal.start(
            (data) => this.handleInput(data),
            () => this.requestRender(true)
        );
        this.requestRender(true);
    }

    stop(): void {
        if (!this.started) return;
        this.started = false;
        this.previous = [];
        this.previousContentLength = 0;
        this.scrollOffset = 0;
        this.terminal.stop();
    }

    private handleInput(data: string): void {
        // stdin is a byte stream, not a key-event API. Real terminals often put
        // several wheel/key sequences in one chunk, so frame every event first.
        for (const event of splitKeys(data)) this.handleInputEvent(event);
    }

    private handleInputEvent(data: string): void {
        const page = Math.max(1, this.terminal.rows - 1);
        const wheelUp = /^\x1b\[<6(?:4|8);\d+;\d+[Mm]$/.test(data);
        const wheelDown = /^\x1b\[<6(?:5|9);\d+;\d+[Mm]$/.test(data);
        const pageUp = /^\x1b\[5(?:;\d+)?~$/.test(data) || /^\x1b\[1;[235]A$/.test(data);
        const pageDown = /^\x1b\[6(?:;\d+)?~$/.test(data) || /^\x1b\[1;[235]B$/.test(data);
        const end = data === "\x1b[F" || data === "\x1b[4~" || data === "\x1b[8~";

        if (pageUp || wheelUp) {
            const step = wheelUp ? 3 : page;
            const maxOffset = Math.max(0, this.previousContentLength - 1);
            this.scrollOffset = Math.min(maxOffset, this.scrollOffset + step);
            this.requestRender();
            return;
        }
        if ((pageDown || wheelDown) && this.scrollOffset > 0) {
            const step = wheelDown ? 3 : page;
            this.scrollOffset = Math.max(0, this.scrollOffset - step);
            this.requestRender();
            return;
        }
        if (end && this.scrollOffset > 0) {
            this.scrollOffset = 0;
            this.requestRender();
            return;
        }

        // Editing while browsing history returns to the live viewport first.
        if (this.scrollOffset > 0) this.scrollOffset = 0;
        this.root.handleInput?.(data);
        this.requestRender();
    }

    requestRender(force = false): void {
        if (!this.started) return;
        if (force) this.previous = [];
        if (this.requested) return;
        this.requested = true;
        queueMicrotask(() => {
            this.requested = false;
            if (this.started) this.renderNow();
        });
    }

    renderNow(): void {
        const width = Math.max(1, this.terminal.columns);
        const height = Math.max(1, this.terminal.rows);
        const rendered = this.root.render(width);

        // Keep the same historical content anchored when new output arrives.
        if (this.scrollOffset > 0 && rendered.length > this.previousContentLength) {
            this.scrollOffset += rendered.length - this.previousContentLength;
        }
        const maxOffset = Math.max(0, rendered.length - 1);
        this.scrollOffset = Math.min(this.scrollOffset, maxOffset);
        this.previousContentLength = rendered.length;

        let lines: string[];
        if (this.scrollOffset > 0) {
            const contentHeight = Math.max(1, height - 1);
            const end = Math.max(0, rendered.length - this.scrollOffset);
            const start = Math.max(0, end - contentHeight);
            const indicatorText = `↑ history · ${this.scrollOffset} newer lines · PageDown/End to return`;
            const indicator = indicatorText.slice(0, width);
            lines = [indicator, ...rendered.slice(start, end)];
        } else {
            lines = rendered.slice(Math.max(0, rendered.length - height));
        }
        const cleaned = lines.map((line) => line.replaceAll(CURSOR_MARKER, ""));

        for (const line of cleaned) {
            if (visibleWidth(line) > width) {
                throw new Error(`Component rendered ${visibleWidth(line)} columns into a ${width}-column terminal.`);
            }
        }

        let frame = "\x1b[?2026h";
        if (this.previous.length === 0) frame += "\x1b[2J";
        const count = Math.max(cleaned.length, this.previous.length);
        for (let row = 0; row < count && row < height; row++) {
            const next = cleaned[row] ?? "";
            if (next === (this.previous[row] ?? "")) continue;
            frame += `\x1b[${row + 1};1H\x1b[2K${next}`;
        }
        frame += "\x1b[?2026l";
        this.terminal.write(frame);
        this.previous = cleaned;
    }
}
