# OSS Release Deployment Copilot — Architecture

A Flowise **Agentflow V2** workflow that takes a solo/OSS project from "code on `main`"
to "released and deployed" with a human approval gate in the middle.

On trigger it: reads the GitHub repo, drafts release notes, scores readiness/risk,
gates go/no-go, asks the maintainer to approve, then — on approval — **publishes a real
GitHub Release**, lets the tag push trigger the deploy, **polls the deploy to
completion**, and reports success or failure (with a rollback suggestion) to Slack.

It is a **copilot with one real action boundary**: it never deploys on its own. Nothing
past the approval gate runs until a human clicks Proceed. After that, it performs the
release + monitors the deploy for real.

---

## 1. System overview

```
        You                Flowise flow                    GitHub                Slack
         │  submit form         │                             │                    │
         ├─────────────────────▶│  read context ─────────────▶│                    │
         │                      │  draft notes / score risk   │                    │
         │                      │  ── "ready for review" ─────────────────────────▶│
         │  ◀── approve? ───────│  (pause: Human Input)       │                    │
         ├── Proceed ──────────▶│                             │                    │
         │                      │  publish release ──────────▶│ (creates tag)      │
         │                      │  ── "released" ─────────────────────────────────▶│
         │                      │                             │ tag push →         │
         │                      │                             │ deploy-pages runs  │
         │                      │  poll run status ◀──────────│                    │
         │                      │  ── "deployed" / "failed" ──────────────────────▶│
         │  ◀── final reply ────│                             │                    │
```

Two distinct triggers, do not confuse them:

| | What runs | Fired by |
|---|---|---|
| **Flow** | the Flowise agentflow | you (form submit / API call) |
| **Deploy** | GitHub `deploy-pages.yml` | a **tag push** `v*.*.*` (created when the flow publishes the release) |

The flow triggers the deploy indirectly, by publishing a release whose tag matches `v*`.

---

## 2. Environment

| Thing | Value |
|---|---|
| Flowise | 3.1.2 (Docker, `flowiseai/flowise:latest`), `http://localhost:3000` |
| LLM | Cloudsway (OpenAI-compatible), model `MaaS_Cl_Sonnet_4.6_20260217`, base `https://genaiapi.cloudsway.net/v1` |
| GitHub access | GitHub REST API from inside custom tools, authed with `github_token` variable (`repo` scope) |
| Notifications | Slack Incoming Webhook |
| File tools | none — the flow persists nothing locally; all deliverables live on GitHub |
| Demo repo | `kottesh/beacon-board` (static status board, deploys to GitHub Pages) |

**Cloudsway wiring:** the standard `ChatOpenAI` node with `basepath` pointed at
Cloudsway — no custom provider. The credential must carry both `credential` and
`FLOWISE_CREDENTIAL_ID`.

---

## 3. The flow

```
Start (form: owner, repo, base, head, targetVersion)
  ▼
[Agent]     Release Context Collector      → github_release_context
  ▼
[LLM]       Release Notes Writer           → state.releaseNotes
  ▼
[LLM]       Risk & Readiness Analyzer      → state.gate / risk / readiness
  ▼
[Condition] Deployment Gate  (gate == NOGO ?)
  ├─ NOGO ─▶ [Agent] Notify Blocked ─▶ [Reply] Blocked                    ── STOP
  └─ else ─▶ [LLM] Deployment & Rollback Planner → state.deployPlan
              ▼
            [Agent] Notify Plan Ready
              ▼
            [Human] Confirm Deploy   ◀── approval gate; nothing real happens before this
              ├─ reject ─▶ [Reply] Paused                                 ── STOP
              └─ approve ─▶
                  [LLM]  Compose Release Body        → state.releaseDraft
                  [Tool] Publish GitHub Release      → state.releaseUrl / releaseTag   *** REAL ***
                  [Agent]Notify Release Published
                  [Tool] Check Deploy Status         → state.deployStatus/Conclusion/Done/runUrl
                  [Condition] Deploy Finished?
                     ├─ no  ─▶ [Loop] Wait & Re-check ──▶ back to Check Deploy Status
                     └─ yes ─▶ [Condition] Deploy Succeeded?
                                 ├─ success ─▶ [Agent] Notify Deployed ─▶ [Reply] Shipped   ── STOP
                                 └─ failure ─▶ [Agent] Notify Deploy Failed
                                                ▶ [LLM] Rollback Advisor → state.rollbackPlan
                                                ▶ [Agent] Notify Rollback
                                                ▶ [Reply] Failed                             ── STOP
```

### Three outcomes
- **Blocked** — the gate said NOGO; Slack notified, nothing published.
- **Shipped** — released, deployed, verified green; Slack + live-site link.
- **Failed** — released but the deploy failed; Slack alert + rollback advice.

---

## 4. Nodes

| Node | Type | Role | Reads state | Writes state |
|---|---|---|---|---|
| Start | start | Form input; declares flow-state keys | — | — |
| Release Context Collector | agent | Calls `github_release_context`, summarizes facts | — | — |
| Release Notes Writer | llm | Writes OSS release notes | context | `releaseNotes` |
| Risk & Readiness Analyzer | llm | JSON verdict (gate/risk/blockers) | context | `gate`, `risk`, `readiness` |
| Deployment Gate | condition | Branch on `gate == NOGO` | `gate` | — |
| Notify Blocked | agent | Slack: BLOCKED | `readiness`, `risk` | — |
| Reply: Blocked | directReply | End (blocked) | `readiness` | — |
| Deployment & Rollback Planner | llm | Preflight/deploy/verify/rollback plan | `gate`, `risk` | `deployPlan` |
| Notify Plan Ready | agent | Slack: READY FOR REVIEW | `gate`, `risk` | — |
| Confirm Deploy | humanInput | **Approval gate** (Proceed / Reject) | — | — |
| Reply: Paused | directReply | End (rejected) | `deployPlan` | — |
| Compose Release Body | llm | Final release-notes markdown for GitHub | `releaseNotes` | `releaseDraft` |
| Publish GitHub Release | tool | **Publishes release + tag** | `releaseDraft` | `releaseUrl`, `releaseTag` |
| Notify Release Published | agent | Slack: RELEASED | `releaseUrl`, `releaseTag` | — |
| Check Deploy Status | tool | Polls deploy run (waits ~15s/call) | — | `deployStatus`, `deployConclusion`, `deployDone`, `runUrl` |
| Deploy Finished? | condition | Branch on `deployDone == true` | `deployDone` | — |
| Wait & Re-check | loop | Loops back to Check Deploy Status (max 12) | — | — |
| Deploy Succeeded? | condition | Branch on `deployConclusion == success` | `deployConclusion` | — |
| Notify Deployed | agent | Slack: DEPLOYED (+ live URL) | `releaseTag`, `runUrl` | — |
| Reply: Shipped | directReply | End (success) | `releaseUrl`, `runUrl` | — |
| Notify Deploy Failed | agent | Slack: DEPLOY FAILED | `releaseTag`, `runUrl` | — |
| Rollback Advisor | llm | Rollback steps for the maintainer | `base`, `runUrl` | `rollbackPlan` |
| Notify Rollback | agent | Slack: ROLLBACK SUGGESTED | `rollbackPlan` | — |
| Reply: Failed | directReply | End (failure) | `runUrl`, `rollbackPlan` | — |

**Why Agentflow V2:** it needs shared **flow state** (pass notes/gate/URLs between
nodes), a **Condition** node (deterministic go/no-go and success branching), a
**Human Input** node (the approval gate), and a **Loop** node (poll the deploy until
done). V1 has none of these cleanly.

---

## 5. Flow state

Declared on Start, written/read across nodes. This is the memory that lets each node
stay a small focused prompt instead of one mega-prompt.

| Key | Written by | Meaning |
|---|---|---|
| `releaseNotes` | Release Notes Writer | Draft notes (human-readable) |
| `readiness` | Risk & Readiness Analyzer | One-paragraph readiness summary |
| `risk` | Risk & Readiness Analyzer | `low` / `medium` / `high` |
| `gate` | Risk & Readiness Analyzer | `GO` / `WARN` / `NOGO` |
| `deployPlan` | Deployment & Rollback Planner | Deploy + rollback steps |
| `releaseDraft` | Compose Release Body | Final markdown published as the release body |
| `releaseUrl` | Publish GitHub Release | URL of the published release |
| `releaseTag` | Publish GitHub Release | The published tag |
| `deployStatus` | Check Deploy Status | `queued` / `in_progress` / `completed` |
| `deployConclusion` | Check Deploy Status | `success` / `failure` / … |
| `deployDone` | Check Deploy Status | `true` when the run is completed |
| `runUrl` | Check Deploy Status | URL of the deploy workflow run |
| `rollbackPlan` | Rollback Advisor | Rollback recommendation (failure path only) |

---

## 6. Gate logic (Risk & Readiness Analyzer)

Returns JSON: `gate`, `risk`, `riskReasons[]`, `blockers[]`, `warnings[]`, `summary`.

- **NOGO** — latest CI on `head` failed, **or** no commits between `base` and `head`,
  **or** the target version is already released.
- **WARN** — risky files changed (`.github/workflows/*`, `package.json`,
  `package-lock.json`, `Dockerfile`, `src/config/*`, `migrations/*`), **or**
  `CHANGELOG.md` doesn't mention the target version.
- **GO** — otherwise.

`WARN` still proceeds to the approval gate (the human decides); only `NOGO` hard-stops.

---

## 7. Tools

Three custom tools (GitHub REST + Slack). All run in the Flowise NodeVM sandbox and
read secrets from Flowise **variables**, never from prompts. Sandbox notes: `fetch` is
not global — tools use `require('node-fetch')`.

| Tool | Kind | Reads / Writes GitHub | Purpose |
|---|---|---|---|
| `github_release_context` | read | read-only | Repo info, tags, releases, commit diff `base..head`, changed files, CI run status, workflows, CHANGELOG, package.json, README |
| `github_create_release` | **write** | **publishes release + tag** | Publishes the GitHub Release (idempotent — skips if the tag's release already exists). Returns `releaseUrl`, `tag` |
| `github_run_status` | read | read-only | Returns the latest `deploy-pages.yml` run's `status` / `conclusion` / `runUrl`. Waits ~15s before returning so it paces the poll loop |
| `slack_send_notification` | — | — | Posts `{text}` to the Slack webhook. Degrades to returning the draft if the webhook is unset |

Only `github_create_release` crosses the write boundary, and it sits **after** the
Human Input gate. Everything before the gate is read-only.

### The deploy poll loop
`Check Deploy Status` → `Deploy Finished?` → (`Wait & Re-check` loops back) until
`deployDone == true`, capped at **12 iterations** (~3 min at ~15s each). The 15s pace
lives inside the `github_run_status` tool because Agentflow has no delay node.

---

## 8. Slack message style

Notifications are **structured, not emoji-driven**. Each message is a distinct,
glanceable event using layout — not decoration — to differentiate:

- A **divider line** (`───────────────`) as a hard top edge for every message.
- A **bold ALL-CAPS status word** as the verdict: `BLOCKED`, `READY FOR REVIEW`,
  `RELEASED`, `DEPLOYED`, `DEPLOY FAILED`, `ROLLBACK SUGGESTED`.
- `›` bullets, `_italic_` labels, `*bold*` values, `` `code` `` refs, `<url|label>` links.
- Slack **mrkdwn** only — no `#` headers, no `**double asterisks**`, no tables.
- Verdict line → blank line → ≤3 detail lines → link. Full detail (readiness tables,
  full notes) lives on GitHub, not Slack.

Example:
```
───────────────
*RELEASED*  kottesh/beacon-board  `v0.3.0`

› _Tag:_ `v0.3.0` published
› _Deploy:_ starting now
<https://github.com/kottesh/beacon-board/releases/tag/v0.3.0|View release>
```

---

## 9. GitHub side (what the deploy needs)

The demo repo deploys to **GitHub Pages** via `deploy-pages.yml`.

- **Trigger:** tag push `v*.*.*` (or manual `workflow_dispatch`). Publishing the release
  creates the tag, which fires this.
- **Pages:** enabled with `build_type: workflow`.
- **Environment protection:** the `github-pages` environment must allow the tag. It has
  a **`v*` tag** deployment policy — without it, the deploy job is *rejected* even
  though the build passes.

### Preconditions to trigger a clean run
Present in GitHub: a **base tag** to diff against (e.g. `v0.2.0`); commits on `head`
ahead of it; passing CI on `head`; `package.json`/CHANGELOG at the target version.
**Absent:** any release/tag for the **target** version — the flow creates it. Re-running
the same version → NOGO (already released).

---

## 10. Trigger it

Form inputs:

```
owner:         kottesh
repo:          beacon-board
base:          v0.2.0
head:          main
targetVersion: v0.3.0
```

**UI:** open the flow → chat → fill the form → runs to *Confirm Deploy* → click
**Proceed** (or Reject).

**API (two phases):**
```bash
BASE=http://localhost:3000/api/v1
FID=7cb45c2a-0360-43eb-b6a0-97a40b38b57f

# 1) start — returns a chatId, pauses at Confirm Deploy
curl -s -X POST $BASE/prediction/$FID -H "Authorization: Bearer $KEY" \
  -H 'Content-Type: application/json' \
  -d '{"form":{"owner":"kottesh","repo":"beacon-board","base":"v0.2.0","head":"main","targetVersion":"v0.3.0"}}'

# 2) approve — resume the paused run with the chatId
curl -s -X POST $BASE/prediction/$FID -H "Authorization: Bearer $KEY" \
  -H 'Content-Type: application/json' \
  -d '{"chatId":"<CHAT_ID>","humanInput":{"type":"proceed","startNodeId":"humanInputAgentflow_0","feedback":"proceed"}}'
# reject: "humanInput":{"type":"reject","startNodeId":"humanInputAgentflow_0","feedback":"stop"}
```

The form and a `question` cannot be sent together in phase 1 — send only the `form`.

---

## 11. Object IDs (this instance)

| Object | id |
|---|---|
| Chatflow | `7cb45c2a-0360-43eb-b6a0-97a40b38b57f` |
| Tool `github_release_context` | `a197895e-88bf-493b-8557-6a232dc5cee7` |
| Tool `github_create_release` | `4b7b894f-9187-4bc5-b8d8-a4515348b5ad` |
| Tool `github_run_status` | `e1287957-5fea-401a-82d4-ce58263e8e21` |
| Tool `slack_send_notification` | `3793be90-d8af-4f4c-b561-3c20091d55d1` |
| Credential (Cloudsway) | `71792a5b-09e6-4aa3-992f-5391b7de79c6` |
| Variable `github_token` | `a03b3990-b4e4-4549-9f75-59b0fbe4c5cd` |
| Variable `slack_webhook_url` | `3d839b52-36aa-43b2-b078-f0c4f004de70` |

---

## 12. Safety model

- **One write action** (`github_create_release`), and it sits **after** the Human Input
  approval gate. Everything before the gate is read-only.
- No auto-deploy: the flow publishes a release, but the deploy itself is GitHub's own
  workflow reacting to the tag — the flow only *watches* it.
- On failure the flow does **not** auto-rollback; it advises and notifies. The human
  executes the rollback.
- Secrets (GitHub token, Slack webhook) live in Flowise variables, not in node prompts.
- The Slack tool degrades to "draft only" if the webhook is unset — no hard failure.
