import type { Tool } from "@krill/agent-core";
import type { KrillCtx } from "./context.js";

import { search } from "./spotify/search.js";
import { play } from "./spotify/play.js";
import { pause } from "./spotify/pause.js";
import { nextTrack } from "./spotify/next.js";
import { previousTrack } from "./spotify/prev.js";
import { getNowPlaying } from "./spotify/nowPlaying.js";
import { setVolume } from "./spotify/setVolume.js";
import { addToQueue } from "./spotify/addToQueue.js";
import { getDevices } from "./spotify/getDevices.js";
import { switchDevice } from "./spotify/switchDevice.js";
import { clearQueue } from "./spotify/clearQueue.js";
import { getRecentlyPlayed } from "./spotify/recentlyPlayed.js";
import { createPlaylist } from "./spotify/createPlaylist.js";
import { addTracksToPlaylist } from "./spotify/addTracks.js";
import { listMyPlaylists } from "./spotify/listPlaylists.js";
import { getPlaylistTracks } from "./spotify/getPlaylistTracks.js";
import { removeTracks } from "./spotify/removeTracks.js";
import { reorderTracks } from "./spotify/reorderTracks.js";
import { getArtistTopTracks } from "./spotify/artistTopTracks.js";
import { getTopTracks } from "./spotify/topTracks.js";
import { rememberPreference } from "./memory/remember.js";
import { recallPreferences } from "./memory/recall.js";

/** The full set of tools krill exposes to the agent. */
export function buildKrillTools(): Tool<KrillCtx>[] {
    return [
        search,
        play,
        pause,
        nextTrack,
        previousTrack,
        getNowPlaying,
        setVolume,
        addToQueue,
        getDevices,
        switchDevice,
        clearQueue,
        getRecentlyPlayed,
        createPlaylist,
        addTracksToPlaylist,
        listMyPlaylists,
        getPlaylistTracks,
        removeTracks,
        reorderTracks,
        getArtistTopTracks,
        getTopTracks,
        rememberPreference,
        recallPreferences
    ] as Tool<KrillCtx>[];
}
