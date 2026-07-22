import { z } from "zod";
import { defineTool } from "@krill/agent-core";
import type { KrillCtx } from "../context.js";

export const switchDevice = defineTool<KrillCtx, { device: string }>({
    name: "switch_device",
    description:
        "Transfer playback to another Spotify device, matched by name (partial, case-insensitive) or device id. Use get_devices first if unsure of names.",
    parameters: z.object({
        device: z.string().describe("Device name or id, e.g. 'phone', 'MacBook', or a device id")
    }),
    async execute(args, { deps: { spotify, ui } }) {
        const devices = await spotify.player.getDevices();
        if (devices.length === 0) {
            return { llm: { ok: false, reason: "No Spotify devices found. Open Spotify on a device first." } };
        }

        const needle = args.device.trim().toLowerCase();
        const match =
            devices.find((d) => d.id === args.device) ??
            devices.find((d) => d.name.toLowerCase() === needle) ??
            devices.find((d) => d.name.toLowerCase().includes(needle));

        if (!match || !match.id) {
            return {
                llm: {
                    ok: false,
                    reason: `No device matching "${args.device}".`,
                    available: devices.map((d) => d.name)
                },
                render: () => ui.devices(devices)
            };
        }

        await spotify.player.transferPlayback(match.id, true);
        return { llm: { ok: true, device: match.name } };
    }
});
