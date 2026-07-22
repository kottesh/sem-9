# cappy

A terminal AI agent that reviews and improves resume sections.

Point it at a resume file, ask about a section, and it gives concrete, high-impact rewrites — quantified bullets, stronger verbs, ATS keywords. It can read/write files and run shell commands to analyze your resume against a job description.

## What it does

- Reads a resume file and critiques the section you ask about.
- Suggests specific before → after rewrites (not generic advice).
- Runs shell commands (`wc`, `grep`, `diff`, `git`) to analyze content.
- Writes an improved version to a file when you ask.
- Remembers your target role, seniority, and industry across sessions (Zep).
- Streams the answer live, including the model's thinking in a separate dim block.

## Tools

| Tool | Purpose |
|---|---|
| `read_file` | Read a file's contents |
| `write_file` | Write text to a file (creates dirs) |
| `list_files` | List a directory |
| `bash` | Run `bash -c <command>`; agent can set `timeoutMs` per call |
| `remember_context` | Save a durable fact about the user |
| `recall_context` | Retrieve saved facts |

The `bash` tool is **not** cwd-sandboxed. It runs in the process working directory with a timeout (default 30s, clamped to a configurable max), captures stdout/stderr/exitCode, and truncates large output.

## Architecture

Three-layer monorepo (npm workspaces). The agent engine and TUI are generic and reusable; only `apps/cappy` is resume-specific.

```
packages/tui         @agent/tui   — reusable terminal building blocks
packages/agent-core  @agent/core  — vendor-neutral agent loop + provider
apps/cappy           cappy        — the resume agent (tools, prompt, config, UI)
```

**`@agent/core`** — the engine, no vendor lock-in.
- `runTurn` — one conversational turn; drives the tool-call loop until a final answer.
- `defineTool` / `ToolRegistry` — author tools once as neutral shapes.
- `ToolAdapter` — converts neutral tools/messages to a provider's wire format. Only `openaiAdapter` ships; a new provider is one adapter file.
- `makeProvider` — HTTP transport with streaming (SSE) support.
- Streaming: `chatStream` emits `text` and `thinking` deltas; the loop forwards them via `onToken` / `onThinking`. Falls back to non-streaming if unsupported.

**`@agent/tui`** — cappy's own terminal framework; it does not import another TUI library. Components return arrays of display lines, while one central `ScreenRenderer` owns raw terminal output. It paints changed lines with absolute row/column addressing inside synchronized-output frames, so components never perform cursor arithmetic and normal updates do not flicker. It includes a growing multiline `EditorView`, persistent `ChatView`, streaming `MarkdownView`, text/layout primitives, ANSI utilities, and spinners.

**`apps/cappy`** — wires it together:
- `config` — loads JSON config, fails loud on missing keys.
- `memory/zep` — Zep Cloud long-term memory (v3 thread + graph API), namespaced `cappy-*`, fails soft.
- `tools/*` — the six tools above.
- `ui/*` — `CappyUI` (rendering) and `CappyIO` (readline input + live streaming).
- `index.ts` — composition root: config → provider → memory → registry → REPL.

### Request flow

```
user input
  → runTurn (agent-core)
    → provider.chatStream → cloudsway (SSE)
      → thinking deltas → ThinkingView (dim block)
      → text deltas     → StreamWriter (live answer)
    → tool calls → ToolRegistry → tool.execute → result back to model
  → final answer + turn saved to Zep
```

## Configuration

Config is a JSON file, `cappy.json` (gitignored — never committed). Copy the example and fill it in:

```bash
cp cappy.json.example cappy.json
```

```json
{
    "provider": { "baseUrl": "", "apiKey": "", "model": "MaaS_Cl_Sonnet_4.6_20260217" },
    "zep": { "apiKey": "" },
    "thinking": "medium",
    "bash": { "defaultTimeoutMs": 30000, "maxTimeoutMs": 600000 }
}
```

| Key | Meaning |
|---|---|
| `provider.baseUrl` | OpenAI-compatible endpoint |
| `provider.apiKey` | Provider API key |
| `provider.model` | Model id |
| `zep.apiKey` | Zep Cloud key (long-term memory) |
| `thinking` | `off` \| `minimal` \| `low` \| `medium` \| `high` \| `max` |
| `bash.defaultTimeoutMs` / `maxTimeoutMs` | Bash timeout default and hard cap |

Lookup order: `--config` path → `CAPPY_CONFIG` env → nearest `cappy.json` (walking up) → `~/.cappy/cappy.json`.

## Setup & run

Requires Node 20+.

```bash
npm install
npm run dev -w cappy
```

Then, in the REPL:

```
you › review the Experience section in resume.md
you › compare it against jd.txt and tell me what keywords I'm missing
you › rewrite the top 3 bullets and save to resume-v2.md
```

Type `/exit` to quit.

### Editor controls

| Key | Action |
|---|---|
| `Enter` | Submit |
| `Ctrl+J` | Insert newline |
| trailing `\\` + `Enter` | Remove `\\` and continue on a new line |
| `Ctrl+A` / `Ctrl+E` | Start / end of line |
| `Ctrl+U` / `Ctrl+K` | Delete to start / end of line |
| `Ctrl+W` | Delete previous word |
| arrows, `Home`, `End`, `Delete`, `Backspace` | Standard editing and wrapped-line navigation |
| `Ctrl+-` | Undo |
| `PageUp` / `PageDown` | Browse conversation history |
| mouse wheel | Scroll conversation history by 3 lines |
| `End` | Return from history to the live editor |
| `Ctrl+L` | Redraw the screen |
| `Ctrl+C` | Clear current draft; press again while empty to exit |
| `Ctrl+D` | Delete forward; exits when input is empty |

The input grows vertically and scrolls internally after 15 editor rows. Normal keystrokes use differential rendering wrapped in terminal synchronized-output frames; they do not clear and repaint the full screen.

## Development

```bash
npm test        # run all tests (vitest)
npm run typecheck
```

- TypeScript, ESM, run via `tsx`. 4-space indentation.
- Test-driven: every unit has tests. 103 tests across the three workspaces.
- No secrets in source — only in `cappy.json` (gitignored).

## Design notes

- **Vendor-neutral tools.** Tools are authored once; the adapter converts to wire format at the edge. Adding a provider = one adapter, zero tool changes.
- **Config fails loud, memory fails soft.** Missing config aborts at startup; if Zep is down the agent still runs with empty context.
- **Free bash, bounded by time.** No path sandbox (deliberate — it's your machine), but every command has an enforced, agent-tunable timeout.
- **Streaming with visible thinking.** Reasoning is rendered separately from the answer so you can see how it reached a suggestion.
