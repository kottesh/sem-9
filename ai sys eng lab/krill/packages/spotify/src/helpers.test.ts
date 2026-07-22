import { describe, it, expect, vi } from "vitest";
import { toUri, parseUri, formatDuration, ensureActiveDevice } from "./helpers.js";
import { NoActiveDeviceError } from "./errors.js";
import type { Device } from "./types.js";

describe("toUri", () => {
    it("builds a track uri from a bare id", () => {
        expect(toUri("abc123", "track")).toBe("spotify:track:abc123");
    });
    it("returns an already-formed uri unchanged", () => {
        expect(toUri("spotify:track:abc", "track")).toBe("spotify:track:abc");
    });
    it("extracts id from an open.spotify.com url", () => {
        expect(toUri("https://open.spotify.com/track/xyz?si=1", "track")).toBe("spotify:track:xyz");
    });
});

describe("parseUri", () => {
    it("splits a spotify uri into type and id", () => {
        expect(parseUri("spotify:playlist:p1")).toEqual({ type: "playlist", id: "p1" });
    });
    it("returns null for a non-uri", () => {
        expect(parseUri("not a uri")).toBeNull();
    });
});

describe("formatDuration", () => {
    it("formats milliseconds as m:ss", () => {
        expect(formatDuration(0)).toBe("0:00");
        expect(formatDuration(65_000)).toBe("1:05");
        expect(formatDuration(600_000)).toBe("10:00");
    });
});

describe("ensureActiveDevice", () => {
    function player(devices: Device[], state: { device: Device | null } | null) {
        return {
            getDevices: vi.fn(async () => devices),
            getPlaybackState: vi.fn(async () => state),
            transferPlayback: vi.fn(async () => {})
        };
    }

    const active: Device = { id: "d1", name: "Active", type: "Computer", is_active: true, volume_percent: 50 };
    const idle: Device = { id: "d2", name: "Idle", type: "Smartphone", is_active: false, volume_percent: 30 };

    it("returns the currently active device id without transferring", async () => {
        const p = player([active], { device: active });
        const id = await ensureActiveDevice(p as any);
        expect(id).toBe("d1");
        expect(p.transferPlayback).not.toHaveBeenCalled();
    });

    it("transfers to the first available device when none active", async () => {
        const p = player([idle], null);
        const id = await ensureActiveDevice(p as any);
        expect(id).toBe("d2");
        expect(p.transferPlayback).toHaveBeenCalledWith("d2", false);
    });

    it("throws NoActiveDeviceError when there are no devices at all", async () => {
        const p = player([], null);
        await expect(ensureActiveDevice(p as any)).rejects.toBeInstanceOf(NoActiveDeviceError);
    });
});
