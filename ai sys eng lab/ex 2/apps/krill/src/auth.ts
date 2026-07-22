import { randomBytes } from "node:crypto";
import open from "open";
import {
    SpotifyClient,
    FileTokenStore,
    buildAuthUrl,
    exchangeCode,
    createVerifier,
    challengeFromVerifier,
    waitForCallback
} from "@krill/spotify";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Config } from "./config.js";
import type { KrillUI } from "./ui/render.js";

const SCOPES = [
    "user-read-playback-state",
    "user-modify-playback-state",
    "user-read-currently-playing",
    "user-read-recently-played",
    "user-top-read",
    "playlist-read-private",
    "playlist-modify-private",
    "playlist-modify-public"
];

/** Build a SpotifyClient, running the PKCE login flow on first use. */
export async function initSpotify(config: Config, ui: KrillUI): Promise<SpotifyClient> {
    const tokenStore = new FileTokenStore(join(homedir(), ".krill", "tokens.json"));
    const oauth = {
        clientId: config.spotify.clientId,
        redirectUri: config.spotify.redirectUri,
        scopes: SCOPES
    };

    const existing = await tokenStore.load();
    if (!existing) {
        await runLogin(oauth, config, tokenStore, ui);
    }

    return new SpotifyClient({ oauth, tokenStore });
}

async function runLogin(
    oauth: { clientId: string; redirectUri: string; scopes: string[] },
    config: Config,
    tokenStore: FileTokenStore,
    ui: KrillUI
): Promise<void> {
    const verifier = createVerifier();
    const challenge = challengeFromVerifier(verifier);
    const state = randomBytes(8).toString("hex");

    const pending = waitForCallback({
        port: config.spotify.callbackPort,
        path: config.spotify.callbackPath,
        expectedState: state
    });
    await pending.ready;

    const url = buildAuthUrl(oauth, challenge, state);
    ui.info("Opening your browser to authorize Spotify\u2026");
    ui.info(url);
    await open(url).catch(() => {
        ui.warn("Could not open a browser automatically. Paste the URL above manually.");
    });

    const code = await pending.code;
    const tokens = await exchangeCode(oauth, code, verifier);
    await tokenStore.save(tokens);
    ui.info("Spotify connected \u2713");
}
