# 🦐 krill — Final Build Plan (LOCKED)

A terminal **music-exploration agent**: a vendor-neutral agent loop (running on
cloudsway) with **Zep Cloud** long-term memory and **Spotify** tools, in a chalk
TUI. Monorepo with a decoupled capability layer and a vendor-neutral tool /
provider conversion layer.

> Status: BUILT — scaffolded test-first (TDD). 135 unit tests passing across 20
> files; all three workspaces typecheck clean. This file remains the design
> source of truth.

---

## Locked decisions

| Concern            | Decision |
|--------------------|----------|
| Runtime            | Node + TypeScript (ESM), run via `tsx` |
| Package manager    | **npm workspaces** (native; Node v25.9.0 / npm v11.12.1 — verified) |
| Structure          | Monorepo: `packages/*` + `apps/*` (npm `workspaces` array) |
| LLM                | cloudsway, model `MaaS_Cl_Sonnet_4.6_20260217` (openai-completions format) |
| Provider support   | **OpenAI adapter ONLY** (we only support OpenAI format today) |
| Tool model         | **Vendor-neutral** tool shape + a `ToolAdapter` seam so future providers are additive with zero tool changes |
| Memory             | **Zep Cloud** (`@getzep/zep-cloud`) — user + thread + taste graph |
| Music              | Custom `@krill/spotify` SDK, OAuth **PKCE** (Client ID only, NO secret) |
| Arg validation     | **zod** (schemas converted to JSON Schema for the tool spec) |
| Discovery          | **Agent-driven** (search + top-tracks + Zep taste). Spotify killed `/recommendations`, `/audio-features`, `/audio-analysis`, related-artists, featured/category playlists, and previews for NEW apps (Nov 27, 2024) |
| TUI                | `chalk` + `ora` + Node `readline` |
| Secrets            | `.env` only (via `dotenv`), read solely in `apps/krill/config.ts`; `.env.example` blank; `.env` gitignored; fail-loud validation |
| Location           | `/home/kottes/worktree/uni/5th year/sem 9/ai sys eng lab/krill/` |

---

## Architecture — three layers, enforced boundaries

```
   CAPABILITY                 FRAMEWORK                    APP (glue)
┌────────────────┐      ┌──────────────────────┐   ┌───────────────────────┐
│ @krill/spotify │      │ @krill/agent-core     │   │ apps/krill            │
│ pure SDK       │◄─────│ neutral Tool/Registry │◄──│ tool adapters wrap SDK│
│ PKCE·http·     │ wrap │ Loop·ToolAdapter·      │   │ config·zep·chalk·llm  │
│ player·        │ by   │ providers (openai)    │   │ = composition root    │
│ playlists·     │ tools│                       │   │                       │
│ catalog·library│      │ (vendor-neutral)      │   │ picks openaiAdapter    │
└────────────────┘      └──────────────────────┘   └───────────────────────┘
        │                        │                           │
        └── no LLM knowledge     └── no Spotify knowledge     └── integrates all
```

Dependency direction: `apps/krill` → both packages. Packages depend on **nothing
internal** and never on each other. TS project references enforce build order.

---

## File tree

```
krill/
├── package.json                    # npm workspaces: packages/*, apps/*
├── tsconfig.base.json              # shared strict config
├── .gitignore                      # .env, node_modules, dist, *.tsbuildinfo
├── .env.example                    # blank placeholders + comments
├── README.md                       # setup: Spotify app + Zep + cloudsway, run
├── PLAN.md                         # this file
│
├── packages/
│   ├── spotify/                    # @krill/spotify — standalone SDK
│   │   ├── package.json  tsconfig.json
│   │   └── src/
│   │       ├── index.ts            # public API
│   │       ├── types.ts            # Track, Artist, Album, Device, PlaybackState, Paging<T>, SearchResult
│   │       ├── errors.ts           # SpotifyError, AuthError, NoActiveDeviceError, PremiumRequiredError, RateLimitError
│   │       ├── auth/
│   │       │   ├── pkce.ts         # verifier/challenge (S256)
│   │       │   ├── oauth.ts        # buildAuthUrl, exchangeCode, refresh
│   │       │   ├── callbackServer.ts   # 127.0.0.1:8888/callback capture
│   │       │   └── tokenStore.ts   # TokenStore interface + FileTokenStore (~/.krill/tokens.json, 0600)
│   │       ├── http.ts             # choke point: bearer, 401→refresh→retry, 429 backoff, 204→null, error mapping
│   │       ├── resources/
│   │       │   ├── player.ts       # state, currentlyPlaying, play, pause, next, prev, seek, volume, shuffle, repeat, devices, transfer, queue, recentlyPlayed
│   │       │   ├── playlists.ts    # create, get, mine, tracks(paginated), update, add(chunk100), remove, reorder, replace, cover, follow/unfollow
│   │       │   ├── catalog.ts      # search, track(s), artist, artistTopTracks, artistAlbums, album, albumTracks
│   │       │   └── library.ts      # me, savedTracks, save/remove, topTracks, topArtists, followedArtists
│   │       ├── helpers.ts          # ensureActiveDevice, playByName, createPlaylistFromQueries, toUri/parseUri, getAllPages
│   │       └── client.ts           # SpotifyClient { player, playlists, catalog, library, helpers }
│   │
│   └── agent-core/                 # @krill/agent-core — generic framework
│       ├── package.json  tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── tool.ts             # Tool, ToolResult, defineTool(), zod→JSONSchema
│           ├── registry.ts         # ToolRegistry<C>: register, list(neutral), dispatch(validate→execute→catch)
│           ├── provider.ts         # NeutralMessage, NeutralToolCall, ToolAdapter, LLMProvider
│           ├── loop.ts             # generic agent loop (memory & io via interfaces; max tool-iters guard)
│           ├── memory.ts           # MemoryProvider interface (addTurn, getContext, remember, recall)
│           ├── io.ts               # AgentIO interface (input, print, renderHook)
│           ├── http.ts             # tiny fetch POST helper for providers
│           ├── providers/
│           │   └── httpProvider.ts # makeProvider({baseUrl,apiKey,model,adapter,endpoint})
│           └── adapters/
│               └── openai.ts       # ✅ ONLY adapter we support today
│
└── apps/
    └── krill/                      # the app: wiring + tool adapters
        ├── package.json            # deps: @krill/spotify, @krill/agent-core, @getzep/zep-cloud, chalk, ora, dotenv, open, zod
        ├── tsconfig.json
        └── src/
            ├── index.ts            # composition root: config→spotify(auth)→zep→ui→llm→registry→loop.run()
            ├── config.ts           # dotenv load + validate (ONLY env reader); typed frozen Config
            ├── llm.ts              # makeProvider({...cloudsway, adapter: openaiAdapter})
            ├── systemPrompt.ts     # krill persona + tool guidance + memory-block slot
            ├── memory/
            │   └── zep.ts          # ZepMemory implements MemoryProvider (fail-soft)
            ├── ui/
            │   ├── theme.ts        # chalk palette + role tags
            │   ├── render.ts       # banner, nowPlaying card+progress, trackList, playlistCard, error
            │   ├── spinner.ts      # ora wrappers
            │   └── prompt.ts       # readline input, history, /help /exit (implements AgentIO)
            └── tools/
                ├── index.ts        # buildKrillTools() → Tool<KrillCtx>[]
                ├── context.ts      # KrillCtx = { spotify, memory, ui }
                ├── spotify/        # thin adapters wrapping @krill/spotify
                │   ├── search.ts  play.ts  pause.ts  next.ts  prev.ts  nowPlaying.ts
                │   ├── setVolume.ts  addToQueue.ts  getDevices.ts  recentlyPlayed.ts
                │   ├── createPlaylist.ts  addTracks.ts  listPlaylists.ts
                │   ├── getPlaylistTracks.ts  removeTracks.ts  reorderTracks.ts
                │   ├── artistTopTracks.ts  topTracks.ts
                └── memory/
                    ├── remember.ts  # wraps Zep graph.add
                    └── recall.ts    # wraps Zep graph.search
```

---

## Neutral tool + conversion contract (core abstraction)

```ts
// agent-core/tool.ts — author tools in THIS shape only (no vendor terms)
interface Tool<C, A> {
  name; description;
  parameters: zod schema (→ JSON Schema at registration);
  execute(args: A, ctx: { deps: C; signal? }): Promise<{ llm: unknown; render?(): void }>;
}

// agent-core/provider.ts — the conversion seam
interface ToolAdapter {
  encodeTools(tools): unknown;          // neutral → OpenAI tool spec
  encodeMessages(msgs): unknown;
  decodeResponse(raw): { content?; toolCalls? };   // wire → neutral
  encodeToolResult(call, result): unknown;
}
interface LLMProvider { chat({messages, tools}): {content?; toolCalls?} }  // loop sees neutral only
```

- Only `openaiAdapter` is implemented today. App wires it:
  `makeProvider({ ...cloudsway, adapter: openaiAdapter })`.
- Future providers = add ONE adapter file; tools & loop untouched. (Not built now.)

---

## Agent loop (neutral, in `agent-core`)

```
readline → memory.addTurn(user)
  messages = [system + memory.getContext()] + window(thread)
  res = llm.chat({messages, tools: registry.list()})
  while res.toolCalls:                       (guard: max N iters/turn)
     for call: registry.dispatch(call.name, call.args)
               → result.render?()  (chalk for human)
               → push neutral tool msg (compact result.llm for model)
     res = llm.chat(...)
  ui.print("♪ krill ›", res.content)
  memory.addTurn(assistant); opportunistic memory.remember(taste)
```

Guards: max tool-iterations/turn; per-turn try/catch (red error, loop survives);
clean Ctrl-C (flush Zep, close callback server). Memory fails soft; config fails loud.

---

## Tools exposed to the LLM

`search_music`, `play`, `pause`, `next_track`, `previous_track`,
`get_now_playing`, `set_volume`, `add_to_queue`, `get_devices`,
`get_recently_played`, `create_playlist`, `add_tracks_to_playlist`,
`list_my_playlists`, `get_playlist_tracks`, `remove_tracks`, `reorder_tracks`,
`get_artist_top_tracks`, `get_top_tracks`, `remember_preference`,
`recall_preferences`.

(No recommendations/audio-features tools — dead for new apps.)

---

## Zep memory design

- User `krill:<localUser>`, one thread/session, messages added each turn.
- Taste **user graph**: `remember_preference` → `graph.add`; `recall_preferences` → `graph.search`.
- Each turn injects `user.getContext()` summary block into the system prompt →
  intelligent exploration over time.

---

## Auth / boot flow

1. First run: no token → `open` browser to PKCE consent → local callback server
   captures code → exchange → save `~/.krill/tokens.json` (0600).
2. Later runs: load + auto-refresh (handled in `http.ts` on 401).
3. `ensureActiveDevice()` — if none, list devices / hint "open Spotify".

---

## .env.example (blank, committed)

```
# cloudsway (OpenAI-compatible)
CLOUDSWAY_BASE_URL=
CLOUDSWAY_API_KEY=
CLOUDSWAY_MODEL=MaaS_Cl_Sonnet_4.6_20260217
# Zep Cloud
ZEP_API_KEY=
# Spotify (PKCE — Client ID only, NO secret)
SPOTIFY_CLIENT_ID=
SPOTIFY_REDIRECT_URI=http://127.0.0.1:8888/callback
# optional
KRILL_USER=default
DEBUG=0
```

---

## Dependencies

- **@krill/spotify:** none runtime (native `fetch`, `node:http`, `node:crypto`);
  dev: typescript, tsx, @types/node.
- **@krill/agent-core:** `zod`; dev: typescript, @types/node.
- **apps/krill:** `@krill/spotify`, `@krill/agent-core`, `@getzep/zep-cloud`,
  `chalk`, `ora`, `dotenv`, `open`, `zod`.

---

## Build order (when scaffolding)

1. Root: `package.json` (workspaces), `tsconfig.base.json`, `.gitignore`,
   `.env.example`, `README.md`
2. `@krill/spotify` (types → errors → auth → http → resources → helpers → client)
3. `@krill/agent-core` (tool → provider → adapters/openai → providers → registry
   → memory/io → loop)
4. `apps/krill` (config → llm → ui → memory/zep → tools → systemPrompt → index)
5. `npm install` (root; workspaces auto-link), `npm run typecheck` across workspaces
6. Fill `.env`, then `npm run dev -w krill`

---

## Manual one-time setup (user)

- Spotify Dashboard: app "krill", redirect URI `http://127.0.0.1:8888/callback`,
  copy **Client ID** → `.env` (NO secret; PKCE).
- Zep Cloud: get `ZEP_API_KEY` → `.env`.
- cloudsway base URL + key → `.env`.

---

## Success criteria for scaffold

- `npm run typecheck` passes clean across all workspaces.
- `npm run dev -w krill` boots → chalk banner → (with `.env`) runs PKCE,
  connects Zep, enters REPL.
- Neutral tools compile against `openaiAdapter`; adding a future adapter would
  require zero tool edits.
