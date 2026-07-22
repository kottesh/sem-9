export interface Cursor {
    row: number;
    col: number;
}

const WORD = /\w/;

/**
 * Pure text-editing model for a multi-line input: an array of logical lines
 * plus a {row,col} cursor. No I/O, no rendering — every operation is a plain
 * mutation, which makes the whole thing unit-testable without a TTY.
 *
 * "Logical" lines are separated by explicit newlines the user inserted; visual
 * wrapping to the terminal width is a rendering concern handled elsewhere.
 */
export class EditorBuffer {
    lines: string[] = [""];
    cursor: Cursor = { row: 0, col: 0 };

    get text(): string {
        return this.lines.join("\n");
    }

    private line(): string {
        return this.lines[this.cursor.row] ?? "";
    }

    /** Clamp the cursor into a valid position. */
    private clamp(): void {
        if (this.cursor.row < 0) this.cursor.row = 0;
        if (this.cursor.row > this.lines.length - 1) this.cursor.row = this.lines.length - 1;
        const len = this.line().length;
        if (this.cursor.col < 0) this.cursor.col = 0;
        if (this.cursor.col > len) this.cursor.col = len;
    }

    // --- editing ---------------------------------------------------------

    insert(ch: string): void {
        const l = this.line();
        this.lines[this.cursor.row] = l.slice(0, this.cursor.col) + ch + l.slice(this.cursor.col);
        this.cursor.col += ch.length;
    }

    newline(): void {
        const l = this.line();
        const before = l.slice(0, this.cursor.col);
        const after = l.slice(this.cursor.col);
        this.lines[this.cursor.row] = before;
        this.lines.splice(this.cursor.row + 1, 0, after);
        this.cursor.row += 1;
        this.cursor.col = 0;
    }

    deleteBack(): void {
        if (this.cursor.col > 0) {
            const l = this.line();
            this.lines[this.cursor.row] = l.slice(0, this.cursor.col - 1) + l.slice(this.cursor.col);
            this.cursor.col -= 1;
        } else if (this.cursor.row > 0) {
            const prev = this.lines[this.cursor.row - 1] ?? "";
            const cur = this.line();
            this.cursor.col = prev.length;
            this.lines[this.cursor.row - 1] = prev + cur;
            this.lines.splice(this.cursor.row, 1);
            this.cursor.row -= 1;
        }
    }

    deleteForward(): void {
        const l = this.line();
        if (this.cursor.col < l.length) {
            this.lines[this.cursor.row] = l.slice(0, this.cursor.col) + l.slice(this.cursor.col + 1);
        } else if (this.cursor.row < this.lines.length - 1) {
            const next = this.lines[this.cursor.row + 1] ?? "";
            this.lines[this.cursor.row] = l + next;
            this.lines.splice(this.cursor.row + 1, 1);
        }
    }

    /** Ctrl+U: delete from cursor to start of the current line. */
    killToStart(): void {
        const l = this.line();
        this.lines[this.cursor.row] = l.slice(this.cursor.col);
        this.cursor.col = 0;
    }

    /** Ctrl+K: delete from cursor to end of the current line. */
    killToEnd(): void {
        const l = this.line();
        this.lines[this.cursor.row] = l.slice(0, this.cursor.col);
    }

    /** Ctrl+W: delete the word (and preceding spaces) before the cursor. */
    deleteWordBack(): void {
        const l = this.line();
        let i = this.cursor.col;
        while (i > 0 && !WORD.test(l[i - 1] ?? "")) i--;
        while (i > 0 && WORD.test(l[i - 1] ?? "")) i--;
        this.lines[this.cursor.row] = l.slice(0, i) + l.slice(this.cursor.col);
        this.cursor.col = i;
    }

    // --- movement --------------------------------------------------------

    moveTo(row: number, col: number): void {
        this.cursor.row = row;
        this.cursor.col = col;
        this.clamp();
    }

    moveStart(): void {
        this.cursor.col = 0;
    }

    moveEnd(): void {
        this.cursor.col = this.line().length;
    }

    moveLeft(): void {
        if (this.cursor.col > 0) {
            this.cursor.col -= 1;
        } else if (this.cursor.row > 0) {
            this.cursor.row -= 1;
            this.cursor.col = this.line().length;
        }
    }

    moveRight(): void {
        if (this.cursor.col < this.line().length) {
            this.cursor.col += 1;
        } else if (this.cursor.row < this.lines.length - 1) {
            this.cursor.row += 1;
            this.cursor.col = 0;
        }
    }

    moveUp(): void {
        if (this.cursor.row > 0) {
            this.cursor.row -= 1;
            this.clamp();
        }
    }

    moveDown(): void {
        if (this.cursor.row < this.lines.length - 1) {
            this.cursor.row += 1;
            this.clamp();
        }
    }

    moveWordLeft(): void {
        const l = this.line();
        let i = this.cursor.col;
        while (i > 0 && !WORD.test(l[i - 1] ?? "")) i--;
        while (i > 0 && WORD.test(l[i - 1] ?? "")) i--;
        this.cursor.col = i;
    }

    moveWordRight(): void {
        const l = this.line();
        let i = this.cursor.col;
        while (i < l.length && !WORD.test(l[i] ?? "")) i++;
        while (i < l.length && WORD.test(l[i] ?? "")) i++;
        this.cursor.col = i;
    }

    // --- trailing backslash continuation --------------------------------

    endsWithBackslash(): boolean {
        return (this.lines[this.lines.length - 1] ?? "").endsWith("\\");
    }

    /** Strip one trailing backslash on the last line and open a new line. */
    stripTrailingBackslashAndNewline(): void {
        const last = this.lines.length - 1;
        this.lines[last] = (this.lines[last] ?? "").replace(/\\$/, "");
        this.lines.push("");
        this.cursor.row = this.lines.length - 1;
        this.cursor.col = 0;
    }
}
