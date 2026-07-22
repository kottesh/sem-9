import type { MemoryProvider } from "@agent/core";
import type { CappyUI } from "../ui/cappyUI.js";

/** Dependencies injected into every cappy tool. */
export interface CappyCtx {
    memory: MemoryProvider;
    ui: CappyUI;
    bash: { defaultTimeoutMs: number; maxTimeoutMs: number };
}
