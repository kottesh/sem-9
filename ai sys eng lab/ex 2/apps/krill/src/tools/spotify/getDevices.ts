import { z } from "zod";
import { defineTool } from "@krill/agent-core";
import type { KrillCtx } from "../context.js";

export const getDevices = defineTool<KrillCtx, Record<string, never>>({
    name: "get_devices",
    description: "List available Spotify playback devices.",
    parameters: z.object({}),
    async execute(_args, { deps: { spotify, ui } }) {
        const devices = await spotify.player.getDevices();
        return {
            llm: { devices: devices.map((d) => ({ id: d.id, name: d.name, type: d.type, active: d.is_active })) },
            render: () => ui.devices(devices)
        };
    }
});
