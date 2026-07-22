import { theme } from "./ansi.js";
import { wrap } from "./text.js";

/**
 * Minimal markdown → ANSI renderer for terminal output. Supports headings,
 * bullets, bold, italic, inline code, and fenced code blocks. Not a full
 * parser — just enough to make LLM answers read well in a terminal.
 */
export function renderMarkdown(md: string): string {
    return renderMarkdownLines(md, Number.MAX_SAFE_INTEGER).join("\n");
}

/** Width-aware Markdown rendering: wrap source text before adding ANSI styles. */
export function renderMarkdownLines(md: string, width: number): string[] {
    const lines = md.split("\n");
    const out: string[] = [];
    let inFence = false;

    for (const raw of lines) {
        if (/^\s*```/.test(raw)) {
            inFence = !inFence;
            continue;
        }
        if (inFence) {
            const codeLines = wrap(raw, width);
            out.push(...(codeLines.length ? codeLines : [""]).map((line) => theme.dim(line)));
            continue;
        }

        const heading = /^(#{1,6})\s+(.*)$/.exec(raw);
        if (heading) {
            const headingLines = wrap(heading[2] ?? "", width);
            out.push(...(headingLines.length ? headingLines : [""]).map((line) => theme.bold(theme.primary(line))));
            continue;
        }

        const bullet = /^(\s*)[-*+]\s+(.*)$/.exec(raw);
        if (bullet) {
            const prefix = `${bullet[1]}• `;
            const available = Math.max(1, width - prefix.length);
            const body = wrap(bullet[2] ?? "", available);
            if (body.length === 0) out.push(renderInline(prefix));
            else {
                out.push(renderInline(prefix + body[0]));
                const continuation = " ".repeat(prefix.length);
                for (const line of body.slice(1)) out.push(renderInline(continuation + line));
            }
            continue;
        }

        const wrapped = wrap(raw, width);
        out.push(...(wrapped.length ? wrapped : [""]).map(renderInline));
    }

    return out;
}

/** Apply inline styles: **bold**, *italic*, `code`. */
function renderInline(s: string): string {
    let out = s;
    out = out.replace(/\*\*([^*]+)\*\*/g, (_m, t) => theme.bold(t));
    out = out.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, (_m, t) => theme.italic(t));
    out = out.replace(/`([^`]+)`/g, (_m, t) => theme.cyan(t));
    return out;
}
