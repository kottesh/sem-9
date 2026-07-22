import { visibleWidth } from "./ansi.js";

/**
 * Wrap text to a maximum visible width, breaking on word boundaries and
 * preserving explicit newlines as paragraph breaks. Words longer than the
 * width are hard-broken.
 */
export function wrap(text: string, width: number): string[] {
    if (text === "") return [];
    if (width <= 0) return [text];

    const lines: string[] = [];
    for (const paragraph of text.split("\n")) {
        if (paragraph === "") {
            lines.push("");
            continue;
        }
        let current = "";
        for (const word of paragraph.split(/\s+/)) {
            let piece = word;
            // Hard-break words that are wider than the line.
            while (visibleWidth(piece) > width) {
                if (current !== "") {
                    lines.push(current);
                    current = "";
                }
                lines.push(piece.slice(0, width));
                piece = piece.slice(width);
            }
            if (current === "") {
                current = piece;
            } else if (visibleWidth(current) + 1 + visibleWidth(piece) <= width) {
                current += " " + piece;
            } else {
                lines.push(current);
                current = piece;
            }
        }
        if (current !== "") lines.push(current);
    }
    return lines;
}

/** Truncate to a max visible width, appending an ellipsis when cut. */
export function truncate(s: string, width: number): string {
    if (visibleWidth(s) <= width) return s;
    if (width <= 1) return "\u2026";
    return s.slice(0, width - 1) + "\u2026";
}

/** Right-pad a string with spaces to a target visible width. */
export function padRight(s: string, width: number): string {
    const pad = width - visibleWidth(s);
    return pad > 0 ? s + " ".repeat(pad) : s;
}

/** Prefix every line of a string with the given prefix. */
export function indent(s: string, prefix: string): string {
    return s
        .split("\n")
        .map((line) => prefix + line)
        .join("\n");
}
