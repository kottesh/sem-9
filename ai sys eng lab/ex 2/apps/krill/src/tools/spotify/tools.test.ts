import { describe, it, expect, vi } from "vitest";
import { search } from "./search.js";
import { play } from "./play.js";
import { pause } from "./pause.js";
import { createPlaylist } from "./createPlaylist.js";
import { addTracksToPlaylist } from "./addTracks.js";
import { getNowPlaying } from "./nowPlaying.js";
import { switchDevice } from "./switchDevice.js";
import { clearQueue } from "./clearQueue.js";import type { KrillCtx } from "../context.js";

function ctx(overrides: any = {}): KrillCtx {
    const ui = {
        trackList: vi.fn(),
        nowPlaying: vi.fn(),
        playlistCard: vi.fn(),
        devices: vi.fn(),
        info: vi.fn()
    };
    const o = overrides.spotify ?? {};
    const spotify = {
        catalog: {
            searchTracks: vi.fn(async () => []),
            search: vi.fn(async () => ({})),
            getArtistTopTracks: vi.fn(async () => []),
            ...o.catalog
        },
        player: {
            play: vi.fn(async () => {}),
            pause: vi.fn(async () => {}),
            getPlaybackState: vi.fn(async () => null),
            getDevices: vi.fn(async () => []),
            transferPlayback: vi.fn(async () => {}),
            ...o.player
        },
        playlists: {
            create: vi.fn(),
            addTracks: vi.fn(async () => {}),
            ...o.playlists
        },
        library: { getMe: vi.fn(async () => ({ id: "me" })), ...o.library },
        ensureActiveDevice: vi.fn(async () => "dev1")
    };
    return { spotify, memory: {} as any, ui: ui as any } as unknown as KrillCtx;
}

const track = {
    id: "t1",
    name: "Song",
    uri: "spotify:track:t1",
    duration_ms: 1000,
    explicit: false,
    artists: [{ id: "a", name: "Artist", uri: "u" }]
};

describe("search tool", () => {
    it("returns compact track summaries to the llm and renders the list", async () => {
        const c = ctx({ spotify: { catalog: { searchTracks: vi.fn(async () => [track]) } } });
        const res = await search.execute({ query: "song", limit: 5 }, { deps: c });
        expect(c.spotify.catalog.searchTracks).toHaveBeenCalledWith("song", { limit: 5 });
        expect(res.llm).toMatchObject({ results: [{ uri: "spotify:track:t1", name: "Song", artist: "Artist" }] });
        res.render?.();
        expect((c.ui as any).trackList).toHaveBeenCalled();
    });
});

describe("play tool", () => {
    it("ensures a device then plays a uri", async () => {
        const c = ctx();
        const res = await play.execute({ uri: "spotify:track:t1" }, { deps: c });
        expect(c.spotify.ensureActiveDevice).toHaveBeenCalled();
        expect(c.spotify.player.play).toHaveBeenCalledWith({ uris: ["spotify:track:t1"], deviceId: "dev1" });
        expect(res.llm).toMatchObject({ ok: true });
    });

    it("searches when given a query and plays the top hit", async () => {
        const c = ctx({ spotify: { catalog: { searchTracks: vi.fn(async () => [track]) } } });
        const res = await play.execute({ query: "song" }, { deps: c });
        expect(c.spotify.player.play).toHaveBeenCalledWith({ uris: ["spotify:track:t1"], deviceId: "dev1" });
        expect(res.llm).toMatchObject({ ok: true, playing: "Song — Artist" });
    });

    it("reports when a query has no match", async () => {
        const c = ctx({ spotify: { catalog: { searchTracks: vi.fn(async () => []) } } });
        const res = await play.execute({ query: "zzz" }, { deps: c });
        expect(res.llm).toMatchObject({ ok: false });
        expect(c.spotify.player.play).not.toHaveBeenCalled();
    });

    it("resumes when no args are given", async () => {
        const c = ctx();
        await play.execute({}, { deps: c });
        expect(c.spotify.player.play).toHaveBeenCalledWith({ deviceId: "dev1" });
    });
});

describe("pause tool", () => {
    it("pauses playback", async () => {
        const c = ctx();
        const res = await pause.execute({}, { deps: c });
        expect(c.spotify.player.pause).toHaveBeenCalled();
        expect(res.llm).toMatchObject({ ok: true });
    });
});

describe("createPlaylist tool", () => {
    it("resolves the current user then creates the playlist", async () => {
        const created = { id: "p1", name: "Chill", uri: "u", tracks: { total: 0 } };
        const c = ctx({
            spotify: {
                library: { getMe: vi.fn(async () => ({ id: "me" })) },
                playlists: { create: vi.fn(async () => created) }
            }
        });
        const res = await createPlaylist.execute({ name: "Chill", description: "d", public: false }, { deps: c });
        expect(c.spotify.library.getMe).toHaveBeenCalled();
        expect(c.spotify.playlists.create).toHaveBeenCalledWith("me", "Chill", { description: "d", public: false });
        expect(res.llm).toMatchObject({ ok: true, playlistId: "p1", uri: "u" });
    });
});

describe("addTracksToPlaylist tool", () => {
    it("forwards uris to the sdk", async () => {
        const c = ctx();
        const res = await addTracksToPlaylist.execute(
            { playlistId: "p1", uris: ["spotify:track:1", "spotify:track:2"] },
            { deps: c }
        );
        expect(c.spotify.playlists.addTracks).toHaveBeenCalledWith("p1", ["spotify:track:1", "spotify:track:2"]);
        expect(res.llm).toMatchObject({ ok: true, added: 2 });
    });
});

describe("getNowPlaying tool", () => {
    it("reports nothing playing when state is null", async () => {
        const c = ctx();
        const res = await getNowPlaying.execute({}, { deps: c });
        expect(res.llm).toMatchObject({ playing: false });
    });

    it("summarizes the current track", async () => {
        const c = ctx({
            spotify: { player: { getPlaybackState: vi.fn(async () => ({ is_playing: true, progress_ms: 500, item: track, device: null })) } }
        });
        const res = await getNowPlaying.execute({}, { deps: c });
        expect(res.llm).toMatchObject({ playing: true, track: "Song — Artist" });
    });
});

describe("switchDevice tool", () => {
    const devices = [
        { id: "d1", name: "MacBook", type: "Computer", is_active: true, volume_percent: 50 },
        { id: "d2", name: "Pixel Phone", type: "Smartphone", is_active: false, volume_percent: 30 }
    ];

    it("transfers playback to a device matched by name (case-insensitive, partial)", async () => {
        const c = ctx({ spotify: { player: { getDevices: vi.fn(async () => devices) } } });
        const res = await switchDevice.execute({ device: "pixel" }, { deps: c });
        expect(c.spotify.player.transferPlayback).toHaveBeenCalledWith("d2", true);
        expect(res.llm).toMatchObject({ ok: true, device: "Pixel Phone" });
    });

    it("matches by exact device id too", async () => {
        const c = ctx({ spotify: { player: { getDevices: vi.fn(async () => devices) } } });
        await switchDevice.execute({ device: "d1" }, { deps: c });
        expect(c.spotify.player.transferPlayback).toHaveBeenCalledWith("d1", true);
    });

    it("returns the device list and ok:false when no match is found", async () => {
        const c = ctx({ spotify: { player: { getDevices: vi.fn(async () => devices) } } });
        const res = await switchDevice.execute({ device: "speaker" }, { deps: c });
        expect(c.spotify.player.transferPlayback).not.toHaveBeenCalled();
        expect(res.llm).toMatchObject({ ok: false });
        expect((res.llm as any).available).toContain("MacBook");
    });

    it("reports when there are no devices at all", async () => {
        const c = ctx({ spotify: { player: { getDevices: vi.fn(async () => []) } } });
        const res = await switchDevice.execute({ device: "anything" }, { deps: c });
        expect(res.llm).toMatchObject({ ok: false });
    });
});

describe("clearQueue tool", () => {
    const playingTrack = {
        id: "t1",
        name: "Song",
        uri: "spotify:track:t1",
        duration_ms: 200000,
        explicit: false,
        artists: [{ id: "a", name: "Artist", uri: "u" }],
        album: { id: "al1", name: "Album", uri: "spotify:album:al1" }
    };

    it("replays the current album context from the current position to flush the queue", async () => {
        const state = { is_playing: true, progress_ms: 42000, item: playingTrack, device: null };
        const c = ctx({ spotify: { player: { getPlaybackState: vi.fn(async () => state) } } });
        const res = await clearQueue.execute({}, { deps: c });

        expect(c.spotify.player.play).toHaveBeenCalledWith({
            contextUri: "spotify:album:al1",
            offset: { uri: "spotify:track:t1" },
            positionMs: 42000,
            deviceId: "dev1"
        });
        expect(res.llm).toMatchObject({ ok: true });
    });

    it("falls back to replaying the single track when the album context is unknown", async () => {
        const noAlbum = { ...playingTrack, album: undefined };
        const state = { is_playing: true, progress_ms: 1000, item: noAlbum, device: null };
        const c = ctx({ spotify: { player: { getPlaybackState: vi.fn(async () => state) } } });
        await clearQueue.execute({}, { deps: c });
        expect(c.spotify.player.play).toHaveBeenCalledWith({
            uris: ["spotify:track:t1"],
            positionMs: 1000,
            deviceId: "dev1"
        });
    });

    it("reports ok:false when nothing is playing", async () => {
        const c = ctx({ spotify: { player: { getPlaybackState: vi.fn(async () => null) } } });
        const res = await clearQueue.execute({}, { deps: c });
        expect(c.spotify.player.play).not.toHaveBeenCalled();
        expect(res.llm).toMatchObject({ ok: false });
    });
});
