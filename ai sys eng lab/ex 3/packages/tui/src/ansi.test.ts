import { describe, it, expect } from "vitest";
import chalk from "chalk";
import { stripAnsi, visibleWidth, theme } from "./ansi.js";

// Force colors on so we actually exercise escape-code handling regardless of TTY.
chalk.level = 1;

describe("stripAnsi", () => {
    it("removes color escape codes", () => {
        const colored = theme.accent("hello");
        expect(colored).not.toBe("hello");
        expect(stripAnsi(colored)).toBe("hello");
    });

    it("leaves plain text untouched", () => {
        expect(stripAnsi("plain")).toBe("plain");
    });
});

describe("visibleWidth", () => {
    it("counts visible characters, ignoring ANSI codes", () => {
        expect(visibleWidth("hello")).toBe(5);
        expect(visibleWidth(theme.bold("hello"))).toBe(5);
    });

    it("is zero for an empty string", () => {
        expect(visibleWidth("")).toBe(0);
    });
});

describe("theme", () => {
    it("exposes the expected tokens", () => {
        for (const key of ["primary", "dim", "accent", "warn", "error", "bold"] as const) {
            expect(typeof theme[key]).toBe("function");
        }
    });
});
