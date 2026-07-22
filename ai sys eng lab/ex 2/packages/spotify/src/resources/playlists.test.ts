import { describe, it, expect, vi } from "vitest";
import { PlaylistsResource } from "./playlists.js";

function fakeHttp(returnValues: unknown[] = [null]) {
    let i = 0;
    const request = vi.fn(async () => {
        const v = returnValues[Math.min(i, returnValues.length - 1)];
        i++;
        return v;
    });
    return { http: { request } as any, request };
}

describe("PlaylistsResource.create", () => {
    it("creates a playlist for the given user with defaults", async () => {
        const { http, request } = fakeHttp([{ id: "p1", name: "Chill", uri: "spotify:playlist:p1" }]);
        const pl = await new PlaylistsResource(http).create("user1", "Chill");
        expect(pl.id).toBe("p1");
        expect(request).toHaveBeenCalledWith("/users/user1/playlists", {
            method: "POST",
            body: { name: "Chill", description: "", public: false }
        });
    });

    it("passes description and public flag", async () => {
        const { http, request } = fakeHttp([{ id: "p2", name: "Party", uri: "u" }]);
        await new PlaylistsResource(http).create("u", "Party", { description: "loud", public: true });
        expect(request).toHaveBeenCalledWith("/users/u/playlists", {
            method: "POST",
            body: { name: "Party", description: "loud", public: true }
        });
    });
});

describe("PlaylistsResource.addTracks", () => {
    it("adds tracks in a single request when <= 100", async () => {
        const { http, request } = fakeHttp([{ snapshot_id: "s1" }]);
        const uris = Array.from({ length: 50 }, (_, i) => `spotify:track:${i}`);
        await new PlaylistsResource(http).addTracks("p1", uris);
        expect(request).toHaveBeenCalledTimes(1);
        expect(request).toHaveBeenCalledWith("/playlists/p1/tracks", { method: "POST", body: { uris } });
    });

    it("chunks into batches of 100", async () => {
        const { http, request } = fakeHttp([{ snapshot_id: "a" }, { snapshot_id: "b" }, { snapshot_id: "c" }]);
        const uris = Array.from({ length: 230 }, (_, i) => `spotify:track:${i}`);
        await new PlaylistsResource(http).addTracks("p1", uris);
        expect(request).toHaveBeenCalledTimes(3);
        expect((request.mock.calls[0][1] as any).body.uris).toHaveLength(100);
        expect((request.mock.calls[1][1] as any).body.uris).toHaveLength(100);
        expect((request.mock.calls[2][1] as any).body.uris).toHaveLength(30);
    });

    it("does nothing for an empty uri list", async () => {
        const { http, request } = fakeHttp();
        await new PlaylistsResource(http).addTracks("p1", []);
        expect(request).not.toHaveBeenCalled();
    });
});

describe("PlaylistsResource other ops", () => {
    it("removeTracks sends DELETE with track objects", async () => {
        const { http, request } = fakeHttp([{ snapshot_id: "s" }]);
        await new PlaylistsResource(http).removeTracks("p1", ["spotify:track:1", "spotify:track:2"]);
        expect(request).toHaveBeenCalledWith("/playlists/p1/tracks", {
            method: "DELETE",
            body: { tracks: [{ uri: "spotify:track:1" }, { uri: "spotify:track:2" }] }
        });
    });

    it("reorderTracks sends range params", async () => {
        const { http, request } = fakeHttp([{ snapshot_id: "s" }]);
        await new PlaylistsResource(http).reorderTracks("p1", { rangeStart: 5, insertBefore: 0, rangeLength: 2 });
        expect(request).toHaveBeenCalledWith("/playlists/p1/tracks", {
            method: "PUT",
            body: { range_start: 5, insert_before: 0, range_length: 2 }
        });
    });

    it("updateDetails sends only provided fields", async () => {
        const { http, request } = fakeHttp();
        await new PlaylistsResource(http).updateDetails("p1", { name: "New" });
        expect(request).toHaveBeenCalledWith("/playlists/p1", { method: "PUT", body: { name: "New" } });
    });

    it("getMine unwraps paged items", async () => {
        const { http } = fakeHttp([{ items: [{ id: "p1", name: "n", uri: "u" }], total: 1, limit: 20, offset: 0, next: null, previous: null }]);
        const mine = await new PlaylistsResource(http).getMine();
        expect(mine).toHaveLength(1);
        expect(mine[0].id).toBe("p1");
    });

    it("getTracks unwraps items[].track across a single page", async () => {
        const { http } = fakeHttp([
            {
                items: [{ track: { id: "t1", name: "n", uri: "u", artists: [], duration_ms: 1, explicit: false } }],
                next: null
            }
        ]);
        const tracks = await new PlaylistsResource(http).getTracks("p1");
        expect(tracks[0].id).toBe("t1");
    });
});
