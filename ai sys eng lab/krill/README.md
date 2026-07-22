# 🦐 krill

A terminal **music-exploration agent**. Chat naturally to search, play, and
build Spotify playlists. Powered by a vendor-neutral agent loop (running on
cloudsway), with **Zep Cloud** long-term memory of your taste.

## Architecture

Monorepo (npm workspaces) with a decoupled capability layer:

```
packages/spotify      @krill/spotify     pure Spotify SDK (PKCE, no LLM knowledge)
packages/agent-core   @krill/agent-core  vendor-neutral tools + provider adapters + loop
apps/krill            krill              glue: tool adapters + Zep + chalk TUI + config
```

- **Tools are vendor-neutral** (`{ name, description, zod params, execute }`).
  A `ToolAdapter` converts them to a provider's wire format. Only the **OpenAI**
  adapter ships today; adding another provider is a single adapter file with
  zero tool changes.
- **Spotify logic lives in `@krill/spotify`** and is wrapped by thin tool
  adapters in the app.

## Setup

### 1. Install
```bash
npm install
```

### 2. Create a Spotify app
- Go to https://developer.spotify.com/dashboard → Create app
- Redirect URI: `http://127.0.0.1:8888/callback`
- APIs: Web API
- Copy the **Client ID** (PKCE — no client secret needed)

### 3. Get a Zep Cloud API key
- https://www.getzep.com → project API key

### 4. Configure
```bash
cp .env.example .env
# fill in CLOUDSWAY_*, ZEP_API_KEY, SPOTIFY_CLIENT_ID
```

### 5. Run
```bash
npm run dev -w krill
```
On first run a browser opens for Spotify authorization; tokens are cached in
`~/.krill/tokens.json`.

## Usage

Requires **Spotify Premium** for playback control, and an open Spotify device.

```
you › play something chill by tame impala
♪ krill › Playing Let It Happen — Tame Impala
you › build me a focus playlist with lo-fi and ambient
you › what am I listening to?
```

Type `/exit` to quit.

## Development

```bash
npm test              # run all unit tests (vitest)
npm run typecheck     # typecheck every workspace
npm run build         # build the packages
```

Built test-first (TDD): 135 unit tests across the SDK, agent framework, and
tool adapters.

## Notes on Spotify's API

Spotify removed several endpoints for new apps (Nov 2024): recommendations,
audio-features/analysis, related-artists, featured/category playlists, and
track previews. krill therefore does **agent-driven discovery** — combining
search, artist top-tracks, your top tracks, and remembered taste — instead of
relying on a recommendations endpoint.
