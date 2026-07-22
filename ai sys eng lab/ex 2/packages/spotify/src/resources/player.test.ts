import { describe, it, expect, vi } from "vitest";
import { PlayerResource } from "./player.js";

function fakeHttp(returnValue: unknown = null) {
    const request = vi.fn(async () => returnValue);
    return { http: { request } as any, request };
}

describe("PlayerResource playback controls", () => {
    it("play() with uris sends PUT with body", async () => {
        const { http, request } = fakeHttp();
        await new PlayerResource(http).play({ uris: ["spotify:track:1"] });
        expect(request).toHaveBeenCalledWith("/me/player/play", {
            method: "PUT",
            body: { uris: ["spotify:track:1"] }
        });
    });

    it("play() with no args resumes (PUT, no body)", async () => {
        const { http, request } = fakeHttp();
        await new PlayerResource(http).play();
        expect(request).toHaveBeenCalledWith("/me/player/play", { method: "PUT", body: undefined });
    });

    it("play() forwards device_id as a query param", async () => {
        const { http, request } = fakeHttp();
        await new PlayerResource(http).play({ uris: ["u"], deviceId: "dev1" });
        expect(request).toHaveBeenCalledWith("/me/player/play", {
            method: "PUT",
            query: { device_id: "dev1" },
            body: { uris: ["u"] }
        });
    });

    it("pause() sends PUT", async () => {
        const { http, request } = fakeHttp();
        await new PlayerResource(http).pause();
        expect(request).toHaveBeenCalledWith("/me/player/pause", { method: "PUT" });
    });

    it("next() and previous() send POST", async () => {
        const { http, request } = fakeHttp();
        const p = new PlayerResource(http);
        await p.next();
        await p.previous();
        expect(request).toHaveBeenNthCalledWith(1, "/me/player/next", { method: "POST" });
        expect(request).toHaveBeenNthCalledWith(2, "/me/player/previous", { method: "POST" });
    });

    it("setVolume clamps to 0..100 and passes volume_percent", async () => {
        const { http, request } = fakeHttp();
        const p = new PlayerResource(http);
        await p.setVolume(150);
        await p.setVolume(-5);
        expect(request).toHaveBeenNthCalledWith(1, "/me/player/volume", { method: "PUT", query: { volume_percent: 100 } });
        expect(request).toHaveBeenNthCalledWith(2, "/me/player/volume", { method: "PUT", query: { volume_percent: 0 } });
    });

    it("seek() passes position_ms", async () => {
        const { http, request } = fakeHttp();
        await new PlayerResource(http).seek(42000);
        expect(request).toHaveBeenCalledWith("/me/player/seek", { method: "PUT", query: { position_ms: 42000 } });
    });

    it("setRepeat and setShuffle send state", async () => {
        const { http, request } = fakeHttp();
        const p = new PlayerResource(http);
        await p.setRepeat("track");
        await p.setShuffle(true);
        expect(request).toHaveBeenNthCalledWith(1, "/me/player/repeat", { method: "PUT", query: { state: "track" } });
        expect(request).toHaveBeenNthCalledWith(2, "/me/player/shuffle", { method: "PUT", query: { state: true } });
    });
});

describe("PlayerResource reads & queue", () => {
    it("getPlaybackState returns null when nothing is playing (204)", async () => {
        const { http } = fakeHttp(null);
        expect(await new PlayerResource(http).getPlaybackState()).toBeNull();
    });

    it("getDevices unwraps the devices array", async () => {
        const { http } = fakeHttp({ devices: [{ id: "d1", name: "Phone", type: "Smartphone", is_active: true, volume_percent: 50 }] });
        const devices = await new PlayerResource(http).getDevices();
        expect(devices).toHaveLength(1);
        expect(devices[0].name).toBe("Phone");
    });

    it("getDevices returns [] when response missing", async () => {
        const { http } = fakeHttp(null);
        expect(await new PlayerResource(http).getDevices()).toEqual([]);
    });

    it("addToQueue passes uri", async () => {
        const { http, request } = fakeHttp();
        await new PlayerResource(http).addToQueue("spotify:track:9");
        expect(request).toHaveBeenCalledWith("/me/player/queue", { method: "POST", query: { uri: "spotify:track:9" } });
    });

    it("transferPlayback posts device ids and play flag", async () => {
        const { http, request } = fakeHttp();
        await new PlayerResource(http).transferPlayback("dev2", true);
        expect(request).toHaveBeenCalledWith("/me/player", { method: "PUT", body: { device_ids: ["dev2"], play: true } });
    });

    it("getRecentlyPlayed unwraps items[].track", async () => {
        const { http } = fakeHttp({ items: [{ track: { id: "r1", name: "n", uri: "u", artists: [], duration_ms: 1, explicit: false } }] });
        const tracks = await new PlayerResource(http).getRecentlyPlayed(10);
        expect(tracks[0].id).toBe("r1");
    });
});
