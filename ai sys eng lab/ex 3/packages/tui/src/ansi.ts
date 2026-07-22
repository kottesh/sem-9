import chalk from "chalk";

/** Shared color tokens for the TUI. Apps use these instead of chalk directly. */
export const theme = {
    primary: chalk.magentaBright,
    dim: chalk.gray,
    accent: chalk.green,
    warn: chalk.yellow,
    error: chalk.red,
    bold: chalk.bold,
    italic: chalk.italic,
    cyan: chalk.cyanBright
} as const;

const ANSI_RE = /\u001b\[[0-9;]*m/g;

/** Remove ANSI escape codes. */
export function stripAnsi(s: string): string {
    return s.replace(ANSI_RE, "");
}

/** Visible width of a string, ignoring ANSI escape codes. */
export function visibleWidth(s: string): number {
    return stripAnsi(s).length;
}
