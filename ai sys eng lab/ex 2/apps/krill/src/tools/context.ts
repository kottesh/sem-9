import type { SpotifyClient } from "@krill/spotify";
import type { MemoryProvider } from "@krill/agent-core";
import type { KrillUI } from "../ui/render.js";

/** Dependencies injected into every krill tool. */
export interface KrillCtx {
    spotify: SpotifyClient;
    memory: MemoryProvider;
    ui: KrillUI;
}
