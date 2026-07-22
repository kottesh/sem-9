import type { Tool } from "@agent/core";
import type { CappyCtx } from "./context.js";
import { bashTool } from "./bash.js";
import { readFileTool, writeFileTool, listFilesTool } from "./files.js";
import { rememberContext, recallContext } from "./memory.js";

/** All cappy tools, authored vendor-neutrally. */
export function buildCappyTools(): Tool<CappyCtx>[] {
    return [
        readFileTool,
        writeFileTool,
        listFilesTool,
        bashTool,
        rememberContext,
        recallContext
    ] as unknown as Tool<CappyCtx>[];
}
