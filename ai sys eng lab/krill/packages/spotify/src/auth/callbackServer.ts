import { createServer, type Server } from "node:http";
import { AddressInfo } from "node:net";

export interface CallbackOptions {
    port: number;
    path: string;
    expectedState: string;
}

export interface PendingCallback {
    /** Resolves once the server is listening, with the bound port. */
    ready: Promise<{ port: number }>;
    /** Resolves with the authorization code, or rejects on error/mismatch. */
    code: Promise<string>;
    /** Force-close the server. */
    close(): void;
}

const OK_HTML = "<html><body><h2>krill connected \u2713</h2>You can close this tab.</body></html>";
const ERR_HTML = "<html><body><h2>krill: authorization failed</h2>Check the terminal.</body></html>";

/** Start a one-shot local server that captures the OAuth redirect. */
export function waitForCallback(opts: CallbackOptions): PendingCallback {
    let resolveCode!: (code: string) => void;
    let rejectCode!: (err: Error) => void;
    let resolveReady!: (info: { port: number }) => void;

    const code = new Promise<string>((res, rej) => {
        resolveCode = res;
        rejectCode = rej;
    });
    const ready = new Promise<{ port: number }>((res) => {
        resolveReady = res;
    });

    let server: Server;

    server = createServer((req, res) => {
        const url = new URL(req.url ?? "/", "http://127.0.0.1");
        if (url.pathname !== opts.path) {
            res.writeHead(404).end();
            return;
        }

        const respond = (status: number, html: string) => {
            res.writeHead(status, { "Content-Type": "text/html" }).end(html);
            setImmediate(() => server.close());
        };

        const error = url.searchParams.get("error");
        const state = url.searchParams.get("state");
        const authCode = url.searchParams.get("code");

        if (error) {
            respond(400, ERR_HTML);
            rejectCode(new Error(`Spotify authorization error: ${error}`));
            return;
        }
        if (state !== opts.expectedState) {
            respond(400, ERR_HTML);
            rejectCode(new Error("State mismatch: possible CSRF, aborting."));
            return;
        }
        if (!authCode) {
            respond(400, ERR_HTML);
            rejectCode(new Error("No authorization code in callback."));
            return;
        }

        respond(200, OK_HTML);
        resolveCode(authCode);
    });

    server.listen(opts.port, "127.0.0.1", () => {
        const addr = server.address() as AddressInfo;
        resolveReady({ port: addr.port });
    });

    return { ready, code, close: () => server.close() };
}
