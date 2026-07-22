export type KeyCommand =
    | { type: "insert"; ch: string }
    | { type: "newline" }
    | { type: "submit" }
    | { type: "deleteBack" }
    | { type: "deleteForward" }
    | { type: "killToStart" }
    | { type: "killToEnd" }
    | { type: "deleteWordBack" }
    | { type: "moveStart" }
    | { type: "moveEnd" }
    | { type: "moveLeft" }
    | { type: "moveRight" }
    | { type: "moveUp" }
    | { type: "moveDown" }
    | { type: "moveWordLeft" }
    | { type: "moveWordRight" }
    | { type: "clear" }
    | { type: "cancel" }
    | { type: "eof" }
    | { type: "noop" };

/**
 * Decode a single raw-stdin chunk into one editor command. In raw mode a
 * keypress arrives as a short byte string: printable chars as-is, control keys
 * as single bytes, and special keys as ESC-prefixed sequences. Pasting can
 * deliver a run of printable chars in one chunk — we insert the whole run.
 */
export function decodeKey(seq: string): KeyCommand {
    // --- ESC-prefixed sequences (arrows, Home/End, Alt+x) ---------------
    if (seq[0] === "\x1b") {
        if (seq === "\x1b") return { type: "noop" };
        if (seq === "\x1b\r" || seq === "\x1b\n") return { type: "newline" }; // Alt+Enter
        if (seq === "\x1bb" || seq === "\x1bB") return { type: "moveWordLeft" };
        if (seq === "\x1bf" || seq === "\x1bF") return { type: "moveWordRight" };

        // CSI / SS3 sequences: ESC[ ... or ESC O ...
        const body = seq.slice(2);
        switch (body) {
            case "A": return { type: "moveUp" };
            case "B": return { type: "moveDown" };
            case "C": return { type: "moveRight" };
            case "D": return { type: "moveLeft" };
            case "H":
            case "1~":
            case "7~":
                return { type: "moveStart" };
            case "F":
            case "4~":
            case "8~":
                return { type: "moveEnd" };
            case "3~": return { type: "deleteForward" };
            default: return { type: "noop" };
        }
    }

    // --- single control bytes -------------------------------------------
    if (seq.length === 1) {
        const code = seq.charCodeAt(0);
        switch (code) {
            case 0x0d: return { type: "submit" };        // Enter (\r)
            case 0x0a: return { type: "newline" };       // Ctrl+J (\n)
            case 0x01: return { type: "moveStart" };     // Ctrl+A
            case 0x05: return { type: "moveEnd" };       // Ctrl+E
            case 0x15: return { type: "killToStart" };   // Ctrl+U
            case 0x0b: return { type: "killToEnd" };     // Ctrl+K
            case 0x17: return { type: "deleteWordBack" };// Ctrl+W
            case 0x0c: return { type: "clear" };         // Ctrl+L
            case 0x03: return { type: "cancel" };        // Ctrl+C
            case 0x04: return { type: "eof" };           // Ctrl+D
            case 0x08:                                    // Ctrl+H
            case 0x7f: return { type: "deleteBack" };    // Backspace
        }
        if (code < 0x20) return { type: "noop" };        // other control bytes
    }

    // --- printable text (single char or a pasted run) -------------------
    // Reject if it contains control chars we didn't handle.
    // eslint-disable-next-line no-control-regex
    if (/[\x00-\x1f\x7f]/.test(seq)) return { type: "noop" };
    return { type: "insert", ch: seq };
}

/**
 * Split a raw stdin chunk into individual key tokens. A single read can batch
 * several keypresses (fast typing, paste, or piped input), so we tokenize into
 * escape sequences, control bytes, and maximal runs of printable text — each of
 * which `decodeKey` can then interpret.
 */
export function splitKeys(chunk: string): string[] {
    const tokens: string[] = [];
    let i = 0;
    while (i < chunk.length) {
        const ch = chunk[i]!;
        if (ch === "\x1b") {
            // ESC sequence: consume the whole thing.
            const rest = chunk.slice(i);
            const m = matchEscape(rest);
            tokens.push(rest.slice(0, m));
            i += m;
        } else if (ch.charCodeAt(0) < 0x20 || ch === "\x7f") {
            // lone control byte
            tokens.push(ch);
            i += 1;
        } else {
            // maximal run of printable chars
            let j = i;
            while (j < chunk.length) {
                const c = chunk[j]!;
                if (c === "\x1b" || c.charCodeAt(0) < 0x20 || c === "\x7f") break;
                j++;
            }
            tokens.push(chunk.slice(i, j));
            i = j;
        }
    }
    return tokens;
}

/** Length of the escape sequence starting at position 0 of `s`. */
function matchEscape(s: string): number {
    if (s.length === 1) return 1; // bare ESC
    const second = s[1]!;
    if (second === "[" || second === "O") {
        // CSI/SS3: ESC [ (params) final-byte; final is 0x40-0x7e (or '~').
        let i = 2;
        while (i < s.length && s[i]! >= "0" && s[i]! <= "?") i++; // params
        if (i < s.length) i++; // final byte
        return i;
    }
    // ESC + single char (Alt+key, Alt+Enter)
    return 2;
}
