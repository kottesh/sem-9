import { theme, visibleWidth } from "./ansi.js";
import { EditorBuffer } from "./editorBuffer.js";
import { decodeKey, splitKeys } from "./keymap.js";
import type { Component } from "./runtime.js";

interface VisualLine {
    logicalRow: number;
    startCol: number;
    text: string;
}

export interface EditorViewOptions {
    label?: string;
    maxRows?: number;
    onSubmit?: (text: string) => void;
    onCancel?: () => void;
    onClearScreen?: () => void;
    onChange?: (text: string) => void;
}

/** Our multiline editor component. It returns lines and never moves the terminal cursor. */
export class EditorView implements Component {
    private buffer = new EditorBuffer();
    private width = 1;
    private preferredVisualCol: number | null = null;
    private cancelArmed = false;
    disabled = false;

    constructor(private readonly options: EditorViewOptions = {}) {}

    getText(): string { return this.buffer.text; }

    setText(text: string): void {
        this.buffer = new EditorBuffer();
        for (const char of text) char === "\n" ? this.buffer.newline() : this.buffer.insert(char);
        this.changed();
    }

    private changed(): void { this.options.onChange?.(this.buffer.text); }

    private layout(contentWidth: number): VisualLine[] {
        const result: VisualLine[] = [];
        for (let row = 0; row < this.buffer.lines.length; row++) {
            const line = this.buffer.lines[row] ?? "";
            if (line.length === 0) {
                result.push({ logicalRow: row, startCol: 0, text: "" });
                continue;
            }
            for (let col = 0; col < line.length; col += contentWidth) {
                result.push({ logicalRow: row, startCol: col, text: line.slice(col, col + contentWidth) });
            }
            if (this.buffer.cursor.row === row && this.buffer.cursor.col === line.length && line.length % contentWidth === 0) {
                result.push({ logicalRow: row, startCol: line.length, text: "" });
            }
        }
        return result;
    }

    private currentVisual(lines: VisualLine[]): number {
        const { row, col } = this.buffer.cursor;
        let found = 0;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i]!;
            if (line.logicalRow !== row) continue;
            found = i;
            if (col >= line.startCol && col <= line.startCol + line.text.length) {
                if (col === line.startCol + line.text.length && line.text.length === this.width) continue;
                return i;
            }
        }
        return found;
    }

    private moveVisual(direction: -1 | 1): void {
        const lines = this.layout(this.width);
        const current = this.currentVisual(lines);
        const target = lines[current + direction];
        const source = lines[current];
        if (!target || !source) return;
        const currentCol = this.buffer.cursor.col - source.startCol;
        const desired = this.preferredVisualCol ?? currentCol;
        this.preferredVisualCol = desired;
        this.buffer.moveTo(target.logicalRow, target.startCol + Math.min(desired, target.text.length));
    }

    private resetPreferred(): void { this.preferredVisualCol = null; }

    handleInput(data: string): void {
        if (this.disabled) return;
        for (const token of splitKeys(data)) {
            const command = decodeKey(token);
            if (command.type === "cancel") {
                if (this.buffer.text.length === 0 || this.cancelArmed) this.options.onCancel?.();
                else {
                    this.setText("");
                    this.cancelArmed = true;
                }
                continue;
            }
            this.cancelArmed = false;
            switch (command.type) {
                case "insert": this.buffer.insert(command.ch); this.resetPreferred(); this.changed(); break;
                case "newline": this.buffer.newline(); this.resetPreferred(); this.changed(); break;
                case "submit":
                    if (this.buffer.endsWithBackslash()) {
                        this.buffer.stripTrailingBackslashAndNewline();
                        this.changed();
                    } else {
                        const text = this.buffer.text.trim();
                        this.setText("");
                        this.options.onSubmit?.(text);
                    }
                    break;
                case "deleteBack": this.buffer.deleteBack(); this.resetPreferred(); this.changed(); break;
                case "deleteForward":
                    if (this.buffer.text.length === 0) this.options.onCancel?.();
                    else { this.buffer.deleteForward(); this.resetPreferred(); this.changed(); }
                    break;
                case "killToStart": this.buffer.killToStart(); this.resetPreferred(); this.changed(); break;
                case "killToEnd": this.buffer.killToEnd(); this.resetPreferred(); this.changed(); break;
                case "deleteWordBack": this.buffer.deleteWordBack(); this.resetPreferred(); this.changed(); break;
                case "moveStart": this.buffer.moveStart(); this.resetPreferred(); break;
                case "moveEnd": this.buffer.moveEnd(); this.resetPreferred(); break;
                case "moveLeft": this.buffer.moveLeft(); this.resetPreferred(); break;
                case "moveRight": this.buffer.moveRight(); this.resetPreferred(); break;
                case "moveUp": this.moveVisual(-1); break;
                case "moveDown": this.moveVisual(1); break;
                case "moveWordLeft": this.buffer.moveWordLeft(); this.resetPreferred(); break;
                case "moveWordRight": this.buffer.moveWordRight(); this.resetPreferred(); break;
                case "clear": this.options.onClearScreen?.(); break;
                case "eof": this.options.onCancel?.(); break;
                case "noop": break;
            }
        }
    }

    render(width: number): string[] {
        const contentWidth = Math.max(1, width - 2);
        this.width = contentWidth;
        const visual = this.layout(contentWidth);
        const cursorIndex = this.currentVisual(visual);
        const maxRows = Math.max(1, this.options.maxRows ?? 15);
        const start = Math.max(0, Math.min(cursorIndex - maxRows + 1, visual.length - maxRows));
        const visible = visual.slice(start, start + maxRows);
        const label = ` ${this.options.label ?? "you ›"} `;
        const top = theme.dim("─") + theme.accent(label) + theme.dim("─".repeat(Math.max(0, width - visibleWidth(label) - 1)));
        const lines = [top];

        for (let i = 0; i < visible.length; i++) {
            const item = visible[i]!;
            let text = item.text;
            const absoluteIndex = start + i;
            if (absoluteIndex === cursorIndex && !this.disabled) {
                const cursorCol = this.buffer.cursor.col - item.startCol;
                const before = text.slice(0, cursorCol);
                const at = text[cursorCol] ?? " ";
                const after = text.slice(cursorCol + (text[cursorCol] ? 1 : 0));
                text = before + `\x1b[7m${at}\x1b[27m` + after;
            }
            lines.push(" " + text);
        }
        lines.push(theme.dim("─".repeat(width)));
        return lines;
    }
}
