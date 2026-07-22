import { describe, it, expect } from "vitest";
import { EditorBuffer } from "./editorBuffer.js";

/** Convenience: build a buffer with text and place the cursor at the end. */
function withText(text: string): EditorBuffer {
    const b = new EditorBuffer();
    for (const ch of text) {
        if (ch === "\n") b.newline();
        else b.insert(ch);
    }
    return b;
}

describe("EditorBuffer — construction", () => {
    it("starts empty with cursor at 0,0", () => {
        const b = new EditorBuffer();
        expect(b.text).toBe("");
        expect(b.lines).toEqual([""]);
        expect(b.cursor).toEqual({ row: 0, col: 0 });
    });
});

describe("EditorBuffer — insert / newline", () => {
    it("inserts characters and advances the cursor", () => {
        const b = new EditorBuffer();
        b.insert("h");
        b.insert("i");
        expect(b.text).toBe("hi");
        expect(b.cursor).toEqual({ row: 0, col: 2 });
    });

    it("inserts a newline, splitting the current line at the cursor", () => {
        const b = withText("hello");
        b.moveLeft(); // cursor before 'o' -> col 4
        b.newline();
        expect(b.lines).toEqual(["hell", "o"]);
        expect(b.cursor).toEqual({ row: 1, col: 0 });
    });

    it("inserts into the middle of a line", () => {
        const b = withText("ac");
        b.moveLeft(); // between a and c
        b.insert("b");
        expect(b.text).toBe("abc");
        expect(b.cursor).toEqual({ row: 0, col: 2 });
    });
});

describe("EditorBuffer — delete", () => {
    it("deleteBack removes the char before the cursor", () => {
        const b = withText("abc");
        b.deleteBack();
        expect(b.text).toBe("ab");
        expect(b.cursor).toEqual({ row: 0, col: 2 });
    });

    it("deleteBack at column 0 joins with the previous line", () => {
        const b = withText("ab\ncd");
        b.moveTo(1, 0);
        b.deleteBack();
        expect(b.lines).toEqual(["abcd"]);
        expect(b.cursor).toEqual({ row: 0, col: 2 });
    });

    it("deleteForward removes the char at the cursor", () => {
        const b = withText("abc");
        b.moveStart();
        b.deleteForward();
        expect(b.text).toBe("bc");
        expect(b.cursor).toEqual({ row: 0, col: 0 });
    });

    it("deleteForward at end of line joins the next line", () => {
        const b = withText("ab\ncd");
        b.moveTo(0, 2);
        b.deleteForward();
        expect(b.lines).toEqual(["abcd"]);
        expect(b.cursor).toEqual({ row: 0, col: 2 });
    });
});

describe("EditorBuffer — kill", () => {
    it("killToStart removes from cursor to start of line (Ctrl+U)", () => {
        const b = withText("hello world");
        b.moveTo(0, 6); // before 'world'
        b.killToStart();
        expect(b.text).toBe("world");
        expect(b.cursor).toEqual({ row: 0, col: 0 });
    });

    it("killToEnd removes from cursor to end of line (Ctrl+K)", () => {
        const b = withText("hello world");
        b.moveTo(0, 5); // after 'hello'
        b.killToEnd();
        expect(b.text).toBe("hello");
        expect(b.cursor).toEqual({ row: 0, col: 5 });
    });

    it("deleteWordBack removes the previous word (Ctrl+W)", () => {
        const b = withText("foo bar baz");
        b.deleteWordBack();
        expect(b.text).toBe("foo bar ");
        expect(b.cursor).toEqual({ row: 0, col: 8 });
    });

    it("deleteWordBack skips trailing spaces then the word", () => {
        const b = withText("foo bar   ");
        b.deleteWordBack();
        expect(b.text).toBe("foo ");
    });
});

describe("EditorBuffer — movement", () => {
    it("moveStart / moveEnd jump within the current line", () => {
        const b = withText("hello");
        b.moveStart();
        expect(b.cursor).toEqual({ row: 0, col: 0 });
        b.moveEnd();
        expect(b.cursor).toEqual({ row: 0, col: 5 });
    });

    it("moveLeft at col 0 wraps to end of previous line", () => {
        const b = withText("ab\ncd");
        b.moveTo(1, 0);
        b.moveLeft();
        expect(b.cursor).toEqual({ row: 0, col: 2 });
    });

    it("moveRight at end of line wraps to start of next line", () => {
        const b = withText("ab\ncd");
        b.moveTo(0, 2);
        b.moveRight();
        expect(b.cursor).toEqual({ row: 1, col: 0 });
    });

    it("moveUp / moveDown preserve column where possible", () => {
        const b = withText("hello\nhi");
        b.moveTo(0, 4);
        b.moveDown(); // shorter line clamps col
        expect(b.cursor).toEqual({ row: 1, col: 2 });
        b.moveUp();
        expect(b.cursor).toEqual({ row: 0, col: 2 });
    });

    it("moveWordLeft / moveWordRight jump by word", () => {
        const b = withText("foo bar baz");
        b.moveWordLeft();
        expect(b.cursor).toEqual({ row: 0, col: 8 });
        b.moveWordLeft();
        expect(b.cursor).toEqual({ row: 0, col: 4 });
        b.moveWordRight();
        expect(b.cursor).toEqual({ row: 0, col: 7 });
    });
});

describe("EditorBuffer — trailing backslash continuation", () => {
    it("detects a trailing backslash on the last line", () => {
        const b = withText("continue me \\");
        expect(b.endsWithBackslash()).toBe(true);
    });

    it("stripTrailingBackslashAndNewline removes the slash and adds a line", () => {
        const b = withText("continue \\");
        b.stripTrailingBackslashAndNewline();
        expect(b.lines).toEqual(["continue ", ""]);
        expect(b.cursor).toEqual({ row: 1, col: 0 });
    });

    it("reports no trailing backslash for normal text", () => {
        expect(withText("done").endsWithBackslash()).toBe(false);
    });
});
