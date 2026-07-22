import { readFile, writeFile, mkdir, readdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { z } from "zod";
import { defineTool } from "@agent/core";
import type { CappyCtx } from "./context.js";

const MAX_FILE = 200_000; // chars

/** Read a text file (no sandbox; free file access). */
export const readFileTool = defineTool<CappyCtx, { path: string }>({
    name: "read_file",
    description: "Read a text file and return its contents (truncated if very large).",
    parameters: z.object({ path: z.string().describe("Path to the file") }),
    async execute(args, { deps: { ui } }) {
        try {
            let content = await readFile(args.path, "utf8");
            let truncated = false;
            if (content.length > MAX_FILE) {
                content = content.slice(0, MAX_FILE);
                truncated = true;
            }
            ui.fileView(args.path, content);
            return { llm: { path: args.path, content, truncated } };
        } catch (err) {
            return { llm: { error: `Cannot read ${args.path}: ${err instanceof Error ? err.message : err}` } };
        }
    }
});

/** Write a text file, creating parent directories. */
export const writeFileTool = defineTool<CappyCtx, { path: string; content: string }>({
    name: "write_file",
    description: "Write text to a file (creates parent directories). Use only when the user asks to save output.",
    parameters: z.object({
        path: z.string().describe("Destination path"),
        content: z.string().describe("Full file contents to write")
    }),
    async execute(args, { deps: { ui } }) {
        try {
            await mkdir(dirname(args.path), { recursive: true });
            await writeFile(args.path, args.content, "utf8");
            ui.info(`wrote ${args.path} (${args.content.length} chars)`);
            return { llm: { ok: true, path: args.path, bytes: args.content.length } };
        } catch (err) {
            return { llm: { ok: false, error: `Cannot write ${args.path}: ${err instanceof Error ? err.message : err}` } };
        }
    }
});

/** List entries in a directory. */
export const listFilesTool = defineTool<CappyCtx, { path?: string }>({
    name: "list_files",
    description: "List files and folders in a directory.",
    parameters: z.object({ path: z.string().describe("Directory path").default(".") }),
    async execute(args) {
        const dir = args.path ?? ".";
        try {
            const names = await readdir(dir);
            const entries = await Promise.all(
                names.map(async (name) => {
                    try {
                        const s = await stat(join(dir, name));
                        return { name, type: s.isDirectory() ? "dir" : "file", size: s.size };
                    } catch {
                        return { name, type: "unknown", size: 0 };
                    }
                })
            );
            return { llm: { path: dir, entries } };
        } catch (err) {
            return { llm: { error: `Cannot list ${dir}: ${err instanceof Error ? err.message : err}` } };
        }
    }
});
