import { spawn } from "node:child_process";
import { z } from "zod";
import { defineTool } from "@agent/core";
import type { CappyCtx } from "./context.js";

const MAX_OUTPUT = 100_000; // chars per stream before truncation

interface BashResult {
    stdout: string;
    stderr: string;
    exitCode: number | null;
    timedOut: boolean;
    truncated: boolean;
    requestedTimeoutMs: number;
}

/**
 * Free bash tool: runs `bash -c <command>` in the process's working directory
 * (NOT sandboxed), with a timeout the agent may set per call, clamped to the
 * configured maximum. Inspired by pi's `exec("bash", ["-c", cmd], { timeout })`.
 */
export const bashTool = defineTool<CappyCtx, { command: string; timeoutMs?: number }>({
    name: "bash",
    description:
        "Run a shell command via `bash -c`. Returns stdout, stderr, and exitCode. " +
        "Optionally set timeoutMs to allow longer-running commands (clamped to the configured max). " +
        "Use for reading files, counting words (wc), searching (grep), diffing, git, etc.",
    parameters: z.object({
        command: z.string().describe("The shell command to execute"),
        timeoutMs: z
            .number()
            .int()
            .positive()
            .optional()
            .describe("Max run time in milliseconds; raise this for slow commands")
    }),
    async execute(args, { deps: { bash, ui } }) {
        const requested = args.timeoutMs ?? bash.defaultTimeoutMs;
        const requestedTimeoutMs = Math.min(requested, bash.maxTimeoutMs);

        const result = await run(args.command, requestedTimeoutMs);
        result.requestedTimeoutMs = requestedTimeoutMs;
        ui.bashResult(args.command, result);
        return { llm: result };
    }
});

function run(command: string, timeoutMs: number): Promise<BashResult> {
    return new Promise((resolve) => {
        const child = spawn("bash", ["-c", command], { stdio: ["ignore", "pipe", "pipe"] });
        let stdout = "";
        let stderr = "";
        let truncated = false;
        let timedOut = false;

        const timer = setTimeout(() => {
            timedOut = true;
            child.kill("SIGKILL");
        }, timeoutMs);

        child.stdout.on("data", (d: Buffer) => {
            if (stdout.length < MAX_OUTPUT) {
                stdout += d.toString();
                if (stdout.length >= MAX_OUTPUT) {
                    stdout = stdout.slice(0, MAX_OUTPUT);
                    truncated = true;
                }
            }
        });
        child.stderr.on("data", (d: Buffer) => {
            if (stderr.length < MAX_OUTPUT) {
                stderr += d.toString();
                if (stderr.length >= MAX_OUTPUT) {
                    stderr = stderr.slice(0, MAX_OUTPUT);
                    truncated = true;
                }
            }
        });

        child.on("close", (code) => {
            clearTimeout(timer);
            resolve({
                stdout,
                stderr,
                exitCode: timedOut ? null : code,
                timedOut,
                truncated,
                requestedTimeoutMs: timeoutMs
            });
        });
        child.on("error", (err) => {
            clearTimeout(timer);
            resolve({
                stdout,
                stderr: stderr + String(err),
                exitCode: null,
                timedOut,
                truncated,
                requestedTimeoutMs: timeoutMs
            });
        });
    });
}
