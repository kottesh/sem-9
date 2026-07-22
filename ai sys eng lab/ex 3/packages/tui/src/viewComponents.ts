import { theme, visibleWidth } from "./ansi.js";
import { renderMarkdownLines } from "./markdown.js";
import { wrap } from "./text.js";
import type { Component } from "./runtime.js";

function fit(line: string, width: number): string {
    if (visibleWidth(line) <= width) return line;
    // Components in this project only apply styles to complete textual spans;
    // wrap() strips neither text nor lines and is safe for our Markdown output.
    return wrap(line, width)[0] ?? "";
}

/** Mutable wrapped text component. */
export class TextView implements Component {
    constructor(
        private text = "",
        private readonly paddingX = 0,
        private readonly style: (text: string) => string = (text) => text
    ) {}

    setText(text: string): void { this.text = text; }

    render(width: number): string[] {
        const inner = Math.max(1, width - this.paddingX * 2);
        const pad = " ".repeat(this.paddingX);
        const lines = this.text.split("\n").flatMap((line) => wrap(line, inner));
        return (lines.length ? lines : [""]).map((line) => fit(pad + this.style(line), width));
    }
}

/** Mutable terminal Markdown component backed by our renderer. */
export class MarkdownView implements Component {
    constructor(private text = "", private readonly paddingX = 0) {}

    setText(text: string): void { this.text = text; }

    render(width: number): string[] {
        const inner = Math.max(1, width - this.paddingX * 2);
        const pad = " ".repeat(this.paddingX);
        return renderMarkdownLines(this.text, inner).map((line) => pad + line);
    }
}

/** Vertical composition. */
export class Column implements Component {
    readonly children: Component[] = [];
    add(component: Component): void { this.children.push(component); }
    render(width: number): string[] { return this.children.flatMap((child) => child.render(width)); }
    handleInput(data: string): void { this.children.at(-1)?.handleInput?.(data); }
    invalidate(): void { for (const child of this.children) child.invalidate?.(); }
}

export function titleLine(title: string, width: number): string {
    const label = ` ${title} `;
    const rest = Math.max(0, width - visibleWidth(label));
    return theme.dim("─") + theme.primary(theme.bold(label)) + theme.dim("─".repeat(Math.max(0, rest - 1)));
}
