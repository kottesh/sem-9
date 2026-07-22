import { describe, it, expect, vi } from "vitest";
import { LibraryResource } from "./library.js";

function fakeHttp(returnValue: unknown = null) {
    const request = vi.fn(async () => returnValue);
    return { http: { request } as any, request };
}

describe("LibraryResource", () => {
    it("getMe returns the current user", async () => {
        const { http, request } = fakeHttp({ id: "me", display_name: "Kottesh", product: "premium" });
        const me = await new LibraryResource(http).getMe();
        expect(me.id).toBe("me");
        expect(request).toHaveBeenCalledWith("/me", undefined);
    });

    it("getTopTracks passes time_range and unwraps items", async () => {
        const { http, request } = fakeHttp({ items: [{ id: "t1", name: "n", uri: "u", artists: [], duration_ms: 1, explicit: false }] });
        const tracks = await new LibraryResource(http).getTopTracks("short_term", 10);
        expect(tracks[0].id).toBe("t1");
        expect(request).toHaveBeenCalledWith("/me/top/tracks", { query: { time_range: "short_term", limit: 10 } });
    });

    it("getTopArtists hits /me/top/artists", async () => {
        const { http, request } = fakeHttp({ items: [{ id: "a1", name: "n", uri: "u" }] });
        const artists = await new LibraryResource(http).getTopArtists("medium_term", 5);
        expect(artists[0].id).toBe("a1");
        expect(request).toHaveBeenCalledWith("/me/top/artists", { query: { time_range: "medium_term", limit: 5 } });
    });

    it("getSavedTracks unwraps items[].track", async () => {
        const { http } = fakeHttp({ items: [{ track: { id: "s1", name: "n", uri: "u", artists: [], duration_ms: 1, explicit: false } }] });
        const tracks = await new LibraryResource(http).getSavedTracks(20);
        expect(tracks[0].id).toBe("s1");
    });
});
