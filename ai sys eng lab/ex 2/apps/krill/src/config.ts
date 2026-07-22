export interface Config {
    cloudsway: {
        baseUrl: string;
        apiKey: string;
        model: string;
    };
    zepApiKey: string;
    spotify: {
        clientId: string;
        redirectUri: string;
        callbackPort: number;
        callbackPath: string;
    };
    user: string;
    debug: boolean;
}

type Env = Record<string, string | undefined>;

const REQUIRED = [
    "CLOUDSWAY_BASE_URL",
    "CLOUDSWAY_API_KEY",
    "CLOUDSWAY_MODEL",
    "ZEP_API_KEY",
    "SPOTIFY_CLIENT_ID",
    "SPOTIFY_REDIRECT_URI"
] as const;

/** Validate + shape the environment into a typed, frozen Config. Fails loud. */
export function parseConfig(env: Env): Config {
    const missing = REQUIRED.filter((k) => !env[k] || env[k]!.trim() === "");
    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variables:\n  ${missing.join("\n  ")}\n` +
                `Copy .env.example to .env and fill these in.`
        );
    }

    let redirect: URL;
    try {
        redirect = new URL(env.SPOTIFY_REDIRECT_URI!);
    } catch {
        throw new Error(`SPOTIFY_REDIRECT_URI is not a valid redirect URL: ${env.SPOTIFY_REDIRECT_URI}`);
    }

    return Object.freeze({
        cloudsway: {
            baseUrl: env.CLOUDSWAY_BASE_URL!,
            apiKey: env.CLOUDSWAY_API_KEY!,
            model: env.CLOUDSWAY_MODEL!
        },
        zepApiKey: env.ZEP_API_KEY!,
        spotify: {
            clientId: env.SPOTIFY_CLIENT_ID!,
            redirectUri: env.SPOTIFY_REDIRECT_URI!,
            callbackPort: Number.parseInt(redirect.port || "80", 10),
            callbackPath: redirect.pathname
        },
        user: env.KRILL_USER?.trim() || "default",
        debug: env.DEBUG === "1"
    });
}
