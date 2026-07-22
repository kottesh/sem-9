import { theme, visibleWidth } from "./ansi.js";
import { padRight } from "./text.js";

export interface BoxOptions {
    title?: string;
    /** Force a content width; defaults to the widest line. */
    width?: number;
}

/**
 * Frame lines in a rounded box. Returns an array of colored strings (one per
 * row) so callers control how they are printed. The visible geometry ignores
 * ANSI codes, so colored content still frames correctly.
 */
export function box(lines: string[], opts: BoxOptions = {}): string[] {
    const contentWidth = Math.max(
        opts.width ?? 0,
        0,
        ...lines.map((l) => visibleWidth(l)),
        opts.title ? visibleWidth(opts.title) : 0
    );
    const inner = contentWidth + 2; // one space of padding each side

    let top: string;
    if (opts.title) {
        const label = ` ${opts.title} `;
        const rest = Math.max(0, inner - visibleWidth(label) - 1);
        top = `\u256d\u2500${label}${"\u2500".repeat(rest)}\u256e`;
    } else {
        top = `\u256d${"\u2500".repeat(inner)}\u256e`;
    }
    const bottom = `\u2570${"\u2500".repeat(inner)}\u256f`;
    const body = lines.map((l) => `\u2502 ${padRight(l, contentWidth)} \u2502`);

    return [theme.dim(top), ...body.map((b) => theme.dim(b)), theme.dim(bottom)];
}
