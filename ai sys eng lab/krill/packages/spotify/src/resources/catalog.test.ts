import { describe, it, expect, vi } from "vitest";
import { CatalogResource } from "./catalog.js";

function fakeHttp(returnValue: unknown) {
    const request = vi.fn(async () => returnValue);
    return { http: { request } as any, request };
}

describe("CatalogResource.search", () => {
    it("requests /search with encoded types and query, returning flattened tracks", async () => {
        const { http, request } = fakeHttp({
            tracks: { items: [{ id: "t1", name: "Song", uri: "spotify:track:t1", artists: [], duration_ms: 1, explicit: false }] }
        });
        const cat = new CatalogResource(http);
        const tracks = await cat.searchTracks("daft punk", { limit: 3 });

        expect(tracks).toHaveLength(1);
        expect(tracks[0].id).toBe("t1");
        expect(request).toHaveBeenCalledWith("/search", {
            query: { q: "daft punk", type: "track", limit: 3, offset: 0 }
        });
    });

    it("returns empty array when no tracks match", async () => {
        const { http } = fakeHttp({ tracks: { items: [] } });
        const cat = new CatalogResource(http);
        expect(await cat.searchTracks("zzz")).toEqual([]);
    });

    it("search() supports multiple types joined by comma", async () => {
        const { http, request } = fakeHttp({});
        const cat = new CatalogResource(http);
        await cat.search("x", ["track", "artist"], { limit: 10 });
        expect(request).toHaveBeenCalledWith("/search", {
            query: { q: "x", type: "track,artist", limit: 10, offset: 0 }
        });
    });
});

describe("CatalogResource other reads", () => {
    it("getArtistTopTracks hits the right path with market and unwraps tracks", async () => {
        const { http, request } = fakeHttp({ tracks: [{ id: "a", name: "n", uri: "u", artists: [], duration_ms: 1, explicit: false }] });
        const cat = new CatalogResource(http);
        const tracks = await cat.getArtistTopTracks("art1", "US");
        expect(tracks[0].id).toBe("a");
        expect(request).toHaveBeenCalledWith("/artists/art1/top-tracks", { query: { market: "US" } });
    });

    it("getTrack fetches a single track", async () => {
        const { http, request } = fakeHttp({ id: "t9", name: "n", uri: "u", artists: [], duration_ms: 1, explicit: false });
        const cat = new CatalogResource(http);
        const t = await cat.getTrack("t9");
        expect(t.id).toBe("t9");
        expect(request).toHaveBeenCalledWith("/tracks/t9", undefined);
    });
});
