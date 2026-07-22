import chalk from "chalk";
import { formatDuration } from "@krill/spotify";
import type { Track, PlaybackState, Playlist, Device } from "@krill/spotify";

const theme = {
    krill: chalk.magentaBright,
    user: chalk.cyanBright,
    dim: chalk.gray,
    accent: chalk.green,
    warn: chalk.yellow,
    error: chalk.red,
    bold: chalk.bold
};

const ANSI_RE = /\u001b\[[0-9;]*m/g;

/** Remove ANSI escape codes (used by tests and width math). */
export function stripAnsi(s: string): string {
    return s.replace(ANSI_RE, "");
}

/** Format a single track as a numbered list line. */
export function formatTrackLine(index: number, track: Track): string {
    const artists = track.artists.map((a) => a.name).join(", ");
    const dur = formatDuration(track.duration_ms);
    return (
        theme.dim(`${index}.`) +
        " " +
        theme.bold(track.name) +
        theme.dim(" — ") +
        artists +
        theme.dim(`  (${dur})`)
    );
}

/** Build a fixed-width progress bar string (already colored). */
export function progressBar(progressMs: number, durationMs: number, width: number): string {
    const ratio = durationMs > 0 ? Math.min(1, Math.max(0, progressMs / durationMs)) : 0;
    const filled = Math.round(ratio * width);
    const empty = width - filled;
    return theme.accent("\u2588".repeat(filled)) + theme.dim("\u2591".repeat(empty));
}

/** The concrete UI surface passed to tools for rich rendering. */
export class KrillUI {
    banner(): void {
        console.log(theme.krill.bold("\n\u266a krill \u2014 your music exploration agent\n"));
    }

    info(text: string): void {
        console.log(theme.dim(text));
    }

    warn(text: string): void {
        console.log(theme.warn(text));
    }

    error(text: string): void {
        console.log(theme.error(`\u2717 ${text}`));
    }

    assistant(text: string): void {
        console.log(theme.krill("\u266a krill \u203a ") + text);
    }

    nowPlaying(track: Track | null | undefined, state?: PlaybackState | null): void {
        if (!track) {
            this.info("(nothing playing)");
            return;
        }
        const artists = track.artists.map((a) => a.name).join(", ");
        console.log(theme.accent("\u25b8 ") + theme.bold(track.name) + theme.dim(" — ") + artists);
        if (state && state.progress_ms != null) {
            const bar = progressBar(state.progress_ms, track.duration_ms, 24);
            console.log(
                "  " +
                    bar +
                    theme.dim(`  ${formatDuration(state.progress_ms)} / ${formatDuration(track.duration_ms)}`)
            );
        }
    }

    trackList(tracks: Track[]): void {
        tracks.forEach((t, i) => console.log(formatTrackLine(i + 1, t)));
    }

    playlistCard(playlist: Playlist, trackCount?: number): void {
        console.log(theme.accent("\u2713 ") + theme.bold(playlist.name) + theme.dim(` (${trackCount ?? playlist.tracks.total} tracks)`));
        const url = playlist.external_urls?.spotify;
        if (url) console.log("  " + theme.dim(url));
    }

    devices(devices: Device[]): void {
        for (const d of devices) {
            const tag = d.is_active ? theme.accent("\u25cf") : theme.dim("\u25cb");
            console.log(`${tag} ${d.name} ${theme.dim(`(${d.type})`)}`);
        }
    }
}
