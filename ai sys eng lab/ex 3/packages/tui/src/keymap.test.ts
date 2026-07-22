import { describe, it, expect } from "vitest";
import { decodeKey, splitKeys } from "./keymap.js";

describe("decodeKey — submit / newline", () => {
    it("Enter (\\r) -> submit", () => {
        expect(decodeKey("\r")).toEqual({ type: "submit" });
    });
    it("Ctrl+J (\\n) -> newline", () => {
        expect(decodeKey("\n")).toEqual({ type: "newline" });
    });
});

describe("decodeKey — control keys", () => {
    it("Ctrl+A -> moveStart", () => {
        expect(decodeKey("\x01")).toEqual({ type: "moveStart" });
    });
    it("Ctrl+E -> moveEnd", () => {
        expect(decodeKey("\x05")).toEqual({ type: "moveEnd" });
    });
    it("Ctrl+U -> killToStart", () => {
        expect(decodeKey("\x15")).toEqual({ type: "killToStart" });
    });
    it("Ctrl+K -> killToEnd", () => {
        expect(decodeKey("\x0b")).toEqual({ type: "killToEnd" });
    });
    it("Ctrl+W -> deleteWordBack", () => {
        expect(decodeKey("\x17")).toEqual({ type: "deleteWordBack" });
    });
    it("Ctrl+L -> clear", () => {
        expect(decodeKey("\x0c")).toEqual({ type: "clear" });
    });
    it("Ctrl+C -> cancel", () => {
        expect(decodeKey("\x03")).toEqual({ type: "cancel" });
    });
    it("Ctrl+D -> eof", () => {
        expect(decodeKey("\x04")).toEqual({ type: "eof" });
    });
    it("Backspace (0x7f) and Ctrl+H (0x08) -> deleteBack", () => {
        expect(decodeKey("\x7f")).toEqual({ type: "deleteBack" });
        expect(decodeKey("\x08")).toEqual({ type: "deleteBack" });
    });
});

describe("decodeKey — arrows and Home/End", () => {
    it("Left / Right", () => {
        expect(decodeKey("\x1b[D")).toEqual({ type: "moveLeft" });
        expect(decodeKey("\x1b[C")).toEqual({ type: "moveRight" });
    });
    it("Up / Down", () => {
        expect(decodeKey("\x1b[A")).toEqual({ type: "moveUp" });
        expect(decodeKey("\x1b[B")).toEqual({ type: "moveDown" });
    });
    it("Home / End (both common encodings)", () => {
        expect(decodeKey("\x1b[H")).toEqual({ type: "moveStart" });
        expect(decodeKey("\x1b[F")).toEqual({ type: "moveEnd" });
        expect(decodeKey("\x1b[1~")).toEqual({ type: "moveStart" });
        expect(decodeKey("\x1b[4~")).toEqual({ type: "moveEnd" });
    });
    it("Delete (0x1b[3~) -> deleteForward", () => {
        expect(decodeKey("\x1b[3~")).toEqual({ type: "deleteForward" });
    });
});

describe("decodeKey — Alt combos", () => {
    it("Alt+Enter (ESC \\r) -> newline", () => {
        expect(decodeKey("\x1b\r")).toEqual({ type: "newline" });
    });
    it("Alt+B / Alt+F -> word movement", () => {
        expect(decodeKey("\x1bb")).toEqual({ type: "moveWordLeft" });
        expect(decodeKey("\x1bf")).toEqual({ type: "moveWordRight" });
    });
});

describe("decodeKey — text insert", () => {
    it("printable char -> insert", () => {
        expect(decodeKey("a")).toEqual({ type: "insert", ch: "a" });
        expect(decodeKey("Z")).toEqual({ type: "insert", ch: "Z" });
        expect(decodeKey(" ")).toEqual({ type: "insert", ch: " " });
    });
    it("multi-char printable (paste) -> insert whole run", () => {
        expect(decodeKey("hello")).toEqual({ type: "insert", ch: "hello" });
    });
    it("unknown escape sequence -> ignore (noop)", () => {
        expect(decodeKey("\x1b[200~")).toEqual({ type: "noop" });
    });
    it("bare ESC -> noop", () => {
        expect(decodeKey("\x1b")).toEqual({ type: "noop" });
    });
});

describe("splitKeys — tokenizing a batched chunk", () => {
    it("splits a run of printable chars into one token", () => {
        expect(splitKeys("hello")).toEqual(["hello"]);
    });
    it("separates control bytes from surrounding text", () => {
        expect(splitKeys("ab\x01cd")).toEqual(["ab", "\x01", "cd"]);
    });
    it("keeps Enter and Ctrl+J as their own tokens", () => {
        expect(splitKeys("a\rb\nc")).toEqual(["a", "\r", "b", "\n", "c"]);
    });
    it("keeps a full CSI arrow sequence as one token", () => {
        expect(splitKeys("a\x1b[Db")).toEqual(["a", "\x1b[D", "b"]);
    });
    it("keeps a CSI tilde sequence (Delete) as one token", () => {
        expect(splitKeys("\x1b[3~x")).toEqual(["\x1b[3~", "x"]);
    });
    it("keeps Alt+Enter (ESC \\r) as one token", () => {
        expect(splitKeys("\x1b\r")).toEqual(["\x1b\r"]);
    });
    it("keeps Alt+b as one token", () => {
        expect(splitKeys("\x1bb")).toEqual(["\x1bb"]);
    });
    it("handles a realistic batched line with mixed keys", () => {
        expect(splitKeys("hi\x01X\x05\r")).toEqual(["hi", "\x01", "X", "\x05", "\r"]);
    });
});
