import { theme, visibleWidth } from "./ansi.js";
import { padRight } from "./text.js";

/** A prominent title banner. */
export function banner(title: string): string {
    return theme.primary(theme.bold(`\n\u25c6 ${title}\n`));
}

/** A line attributed to a speaker, e.g. "cappy \u203a text". */
export function speakerLine(speaker: string, text: string): string {
    return theme.primary(`${speaker} \u203a `) + text;
}

export function notice(text: string): string {
    return theme.dim(text);
}

export function warn(text: string): string {
    return theme.warn(text);
}

export function errorLine(text: string): string {
    return theme.error(`\u2717 ${text}`);
}

/** A bulleted list, one item per line. */
export function bulletList(items: string[]): string {
    return items.map((i) => `\u2022 ${i}`).join("\n");
}

/** Aligned key/value pairs. */
export function keyValue(pairs: Array<[string, string]>): string {
    const width = Math.max(0, ...pairs.map(([k]) => visibleWidth(k)));
    return pairs.map(([k, v]) => `${theme.dim(padRight(k, width))}  ${v}`).join("\n");
}
