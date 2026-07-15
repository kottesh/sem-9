# OSS Release Deployment Copilot — Flowise Build

A solo-dev / OSS **Release Notes & Deployment Coordination** agent built in Flowise
(Agentflow V2). It inspects a GitHub repo, drafts release notes, scores release
readiness/risk, gates go/no-go, plans deployment + rollback, asks the maintainer to
confirm, and notifies Slack across the release lifecycle.

It is a **support/copilot**, not an autonomous deployer. It never runs `git push`,
never publishes a release, and never triggers workflows on its own. It produces plans,
commands, drafts, and notifications; the maintainer executes.

---

## 1. Environment

| Thing | Value |
|---|---|
| Flowise | 3.1.2 (Docker, `flowiseai/flowise:latest`) |
| Flowise URL | http://localhost:3000 |
| Flowise data | Docker volume `flowise_data` → `/root/.flowise` |
| LLM provider | Cloudsway (OpenAI-compatible) via `.pi` config |
| Model | `MaaS_Cl_Sonnet_4.6_20260217` (Claude Sonnet 4.6) |
| Model base URL | `https://genaiapi.cloudsway.net/v1` |
| GitHub access | `gh` CLI (host) + GitHub REST API (inside Flowise custom tool) |
| Notifications | Slack Incoming Webhook |
| Demo repo | https://github.com/kottesh/beacon-board |
| Demo repo (local) | `/home/kottes/worktree/uni/5th year/sem 9/ai sys eng lab/ex 1/beacon-board` |

### Flowise API auth
All admin calls use an API key as a Bearer token:

```
Authorization: Bearer <FLOWISE_API_KEY>
```

---

## 2. Flowise objects created

### Credential
| id | name | credentialName |
|---|---|---|
| `71792a5b-09e6-4aa3-992f-5391b7de79c6` | Cloudsway OpenAI Compatible | `openAIApi` |

The Cloudsway API key is stored encrypted inside this credential. Nodes reference it
by id and set `basepath = https://genaiapi.cloudsway.net/v1`, so the standard
`ChatOpenAI` node talks to Cloudsway.

### Variables
| id | name | value | used by |
|---|---|---|---|
| `a03b3990-b4e4-4549-9f75-59b0fbe4c5cd` | `github_token` | gh auth token | `github_release_context` (`$vars.github_token`) |
| `3d839b52-36aa-43b2-b078-f0c4f004de70` | `slack_webhook_url` | **configured** (live Slack webhook) | `slack_send_notification` (`$vars.slack_webhook_url`) |

> Slack is **configured and tested** — the webhook is set and a test message posted
> successfully (`ok`). The flow's Slack nodes now post for real. If the webhook were
> ever unset, the tool safely degrades to returning the drafted message (no errors).
>
> Security note: the webhook URL is stored in the Flowise DB. Rotate it (delete +
> recreate in the Slack app) if it leaks beyond this demo — anyone with the URL can
> post to the channel.

### Custom tools
| id | name | purpose |
|---|---|---|
| `a197895e-88bf-493b-8557-6a232dc5cee7` | `github_release_context` | Pull all release context from a GitHub repo |
| `3793be90-d8af-4f4c-b561-3c20091d55d1` | `slack_send_notification` | Post a message to Slack (or return draft) |

### Chatflow
| id | name | type |
|---|---|---|
| `7cb45c2a-0360-43eb-b6a0-97a40b38b57f` | OSS Release Deployment Copilot | AGENTFLOW |

---

## 3. Why Agentflow V2 (not V1)

V2 gives three things this workflow genuinely needs:

- **Flow State** — pass `releaseNotes`, `gate`, `risk`, `deployPlan`, `releaseDraft`
  between nodes without stuffing everything into one mega prompt.
- **Condition node** — deterministic go/no-go branching on `gate`.
- **Human Input node** — a real human-in-the-loop checkpoint before the "deploy"
  branch (safety: nothing proceeds without maintainer approval).

Node types used: `startAgentflow`, `agentAgentflow`, `llmAgentflow`,
`conditionAgentflow`, `humanInputAgentflow`, `directReplyAgentflow`.

---

## 4. The flow

### Diagram

```
Start (form: owner, repo, base, head, targetVersion)
  │  flow state: releaseNotes, readiness, risk, gate, deployPlan, rollbackPlan, releaseDraft
  ▼
[Agent] Release Context Collector      → tool: github_release_context
  ▼
[LLM] Release Notes Writer             → state.releaseNotes
  ▼
[LLM] Risk & Readiness Analyzer        → state.gate / state.risk / state.readiness (JSON)
  ▼
[Condition] Deployment Gate            → gate == "NOGO" ?
  ├── NOGO ─────▶ [Agent] Notify Blocked (Slack) ──▶ [Reply] Blocked
  └── GO / WARN ─▶ [LLM] Deployment & Rollback Planner  → state.deployPlan
                    ▼
                  [Agent] Notify Plan Ready (Slack)
                    ▼
                  [Human] Confirm Deploy               (HITL checkpoint)
                    ├── proceed ─▶ [Agent] Notify Deploy Starting (Slack)
                    │               ▶ [LLM] GitHub Release Draft  → state.releaseDraft
                    │               ▶ [Reply] Ready to Ship
                    └── stop ─────▶ [Reply] Paused
```

### Nodes (14) and roles

| # | Node (label) | Type | Does |
|---|---|---|---|
| 1 | Start | start | Form input + declares flow-state keys |
| 2 | Release Context Collector | agent | Calls `github_release_context`, summarizes facts |
| 3 | Release Notes Writer | llm | OSS release notes → `state.releaseNotes` |
| 4 | Risk & Readiness Analyzer | llm | Structured JSON → `state.gate/risk/readiness` |
| 5 | Deployment Gate | condition | `gate == NOGO` → branch |
| 6 | Notify Blocked (Slack) | agent | `slack_send_notification` (🛑 blocked) |
| 7 | Reply: Blocked | directReply | Show blockers + readiness |
| 8 | Deployment & Rollback Planner | llm | Preflight/deploy/verify/rollback → `state.deployPlan` |
| 9 | Notify Plan Ready (Slack) | agent | `slack_send_notification` (📦 ready) |
| 10 | Confirm Deploy | humanInput | proceed / stop |
| 11 | Notify Deploy Starting (Slack) | agent | `slack_send_notification` (🚀 starting) |
| 12 | GitHub Release Draft | llm | Final release body + verification → `state.releaseDraft` |
| 13 | Reply: Ready to Ship | directReply | Notes + plan + draft |
| 14 | Reply: Paused | directReply | Plan preserved, deployment paused |

### Edges (13)

```
Start                     → Release Context Collector
Release Context Collector → Release Notes Writer
Release Notes Writer      → Risk & Readiness Analyzer
Risk & Readiness Analyzer → Deployment Gate
Deployment Gate [NOGO]    → Notify Blocked (Slack)
Notify Blocked (Slack)    → Reply: Blocked
Deployment Gate [GO/WARN] → Deployment & Rollback Planner
Deployment & Rollback Pl. → Notify Plan Ready (Slack)
Notify Plan Ready (Slack) → Confirm Deploy
Confirm Deploy [proceed]  → Notify Deploy Starting (Slack)
Notify Deploy Starting    → GitHub Release Draft
GitHub Release Draft      → Reply: Ready to Ship
Confirm Deploy [stop]     → Reply: Paused
```

### Flow state keys

| Key | Written by | Read by |
|---|---|---|
| `releaseNotes` | Release Notes Writer | Reply: Ready to Ship, GitHub Release Draft |
| `readiness` | Risk & Readiness Analyzer | Notify Blocked, Reply: Blocked |
| `risk` | Risk & Readiness Analyzer | Planner, Slack notifications |
| `gate` | Risk & Readiness Analyzer | Deployment Gate condition |
| `deployPlan` | Deployment & Rollback Planner | Reply: Ready/Paused |
| `rollbackPlan` | (reserved / folded into deployPlan) | — |
| `releaseDraft` | GitHub Release Draft | Reply: Ready to Ship |

---

## 5. Gate logic (Risk & Readiness Analyzer)

The analyzer returns raw JSON: `gate`, `risk`, `riskReasons[]`, `blockers[]`,
`warnings[]`, `summary`.

- **NOGO** if: latest CI run on `head` failed, OR no commits between `base` and `head`,
  OR the target version tag is already released.
- **WARN** if: risky files changed
  (`.github/workflows/*`, `package.json`, `package-lock.json`, `Dockerfile`,
  `src/config/*`, `migrations/*`) OR `CHANGELOG.md` does not mention the target version.
- **GO** otherwise.

---

## 6. Slack notification events

**Status: live.** Webhook configured, test message posted (`ok`).

Currently wired:

| Event | Node | Prefix |
|---|---|---|
| Deployment blocked (NOGO) | Notify Blocked | `🛑 Deployment blocked` |
| Release ready (GO/WARN) | Notify Plan Ready | `📦 Release … ready` |
| Deploy starting (after approval) | Notify Deploy Starting | `🚀 Deployment starting` |

Easy to add later (same pattern): deploy completed ✅, deploy failed ❌,
rollback recommended ↩️, release published 🏷️.

Test that posting works at any time:

```bash
curl -X POST -H 'Content-Type: application/json' \
  --data '{"text":"OSS Release Copilot connected ✅"}' \
  "$SLACK_WEBHOOK_URL"
```

---

## 7. Custom tool: `github_release_context`

**Input schema**

| property | type | required | notes |
|---|---|---|---|
| `owner` | string | yes | e.g. `kottesh` |
| `repo` | string | yes | e.g. `beacon-board` |
| `base` | string | no | compare-from tag, e.g. `v0.2.0` |
| `head` | string | no | compare-to ref, default `main` |

**Returns** (JSON): `repo`, `tags[]`, `releases[]`, `compare` (ahead/behind/total),
`commits[]`, `changedFiles[]`, `actions[]` (status/conclusion/url), `workflows[]`,
`changelog` (raw), `packageJson` (raw), `readme` (first 2 KB).

**Auth**: reads `$vars.github_token`; calls `https://api.github.com` with the standard
GitHub REST headers. Uses the sandbox's built-in secure `fetch`.

Tool function body (runs in Flowise NodeVM sandbox; args exposed as `$owner`, etc.):

```js
const owner = $owner;
const repo = $repo;
const base = $base;
const head = $head || 'main';
const token = $vars.github_token;
const api = 'https://api.github.com';
const H = {
  'Authorization': `Bearer ${token}`,
  'Accept': 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'oss-release-copilot'
};

async function gh(path) {
  const res = await fetch(`${api}${path}`, { headers: H });
  if (!res.ok) {
    const text = await res.text();
    return { __error: true, status: res.status, path, body: text.slice(0, 500) };
  }
  return await res.json();
}
async function ghRaw(path) {
  const res = await fetch(`${api}${path}`, { headers: { ...H, Accept: 'application/vnd.github.raw' } });
  if (!res.ok) return null;
  return await res.text();
}

const out = {};
const repoInfo = await gh(`/repos/${owner}/${repo}`);
out.repo = repoInfo.__error ? repoInfo : {
  fullName: repoInfo.full_name,
  description: repoInfo.description,
  defaultBranch: repoInfo.default_branch,
  language: repoInfo.language,
  url: repoInfo.html_url
};

const tags = await gh(`/repos/${owner}/${repo}/tags?per_page=20`);
out.tags = Array.isArray(tags) ? tags.map(t => t.name) : tags;

const releases = await gh(`/repos/${owner}/${repo}/releases?per_page=10`);
out.releases = Array.isArray(releases) ? releases.map(r => ({ tag: r.tag_name, name: r.name, draft: r.draft, prerelease: r.prerelease, publishedAt: r.published_at })) : releases;

if (base) {
  const cmp = await gh(`/repos/${owner}/${repo}/compare/${base}...${head}`);
  if (!cmp.__error) {
    out.compare = { base, head, aheadBy: cmp.ahead_by, behindBy: cmp.behind_by, totalCommits: cmp.total_commits };
    out.commits = (cmp.commits || []).map(c => ({ sha: c.sha.slice(0,7), message: c.commit.message.split('\n')[0], author: c.commit.author && c.commit.author.name }));
    out.changedFiles = (cmp.files || []).map(f => ({ file: f.filename, status: f.status, additions: f.additions, deletions: f.deletions }));
  } else {
    out.compare = cmp;
  }
}

const runs = await gh(`/repos/${owner}/${repo}/actions/runs?per_page=10&branch=${encodeURIComponent(head)}`);
out.actions = (runs && runs.workflow_runs) ? runs.workflow_runs.slice(0,10).map(r => ({ name: r.name, event: r.event, status: r.status, conclusion: r.conclusion, branch: r.head_branch, url: r.html_url, createdAt: r.created_at })) : (runs.__error ? runs : []);

out.changelog = (await ghRaw(`/repos/${owner}/${repo}/contents/CHANGELOG.md`)) || 'CHANGELOG.md not found';
const pkg = await ghRaw(`/repos/${owner}/${repo}/contents/package.json`);
out.packageJson = pkg || 'package.json not found';
out.readme = ((await ghRaw(`/repos/${owner}/${repo}/contents/README.md`)) || '').slice(0, 2000);

const wf = await gh(`/repos/${owner}/${repo}/actions/workflows`);
out.workflows = (wf && wf.workflows) ? wf.workflows.map(w => ({ name: w.name, path: w.path, state: w.state })) : [];

return out;
```

---

## 8. Custom tool: `slack_send_notification`

**Input schema**

| property | type | required |
|---|---|---|
| `text` | string | yes |

**Behavior**: posts `{ text }` to `$vars.slack_webhook_url`. If the webhook is the
placeholder/unset, it returns `{ sent:false, reason, draft }` so the flow keeps working.

```js
const webhook = $vars.slack_webhook_url;
const text = $text;
if (!webhook || webhook === 'PLACEHOLDER_SET_ME') {
  return JSON.stringify({ sent: false, reason: 'slack_webhook_url variable not set', draft: text });
}
const res = await fetch(webhook, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text })
});
const body = await res.text();
return JSON.stringify({ sent: res.ok, status: res.status, response: body });
```

---

## 9. Demo repo: `kottesh/beacon-board`

A tiny TypeScript status-board app used to exercise the flow. Named neutrally on
purpose (the repo shouldn't advertise that it's a release-agent demo).

```
src/status.ts       summarizeStatus()
src/report.ts       buildReport()
src/incidents.ts    incidentSummary()
tests/status.test.ts
.github/workflows/ci.yml        (CI: test + build)
.github/workflows/release.yml   (tag / workflow_dispatch → package artifact)
CHANGELOG.md, README.md, package.json, docs/deployment.md
```

Release history:
```
v0.1.0  scaffold
v0.2.0  detailed report builder
main    v0.3.0 candidate (incident helper, empty-name fix, release workflow, version bump)
```

Verified `github_release_context` against it:
```
v0.2.0..main → 3 commits
risky files: .github/workflows/release.yml, package.json
CI latest: success
```

---

## 10. Running it

1. Slack is already configured (`slack_webhook_url` set). Nothing to do here.
2. Open **OSS Release Deployment Copilot** in Flowise, run the form:

```
owner:         kottesh
repo:          beacon-board
base:          v0.2.0
head:          main
targetVersion: v0.3.0
```

3. Review notes + readiness + plan, then at **Confirm Deploy** reply `proceed` or `stop`.

---

## 11. Slack setup (one-time) — DONE

Completed for this instance. Steps for reference / re-creation:

1. https://api.slack.com/apps → **Create New App** → From scratch.
2. **Incoming Webhooks** → enable → **Add New Webhook to Workspace** → pick a channel.
3. Copy the webhook URL (`https://hooks.slack.com/services/…`).
4. Set it into Flowise Variable `slack_webhook_url` (UI → Variables, or the API PUT below).

Set via API:
```bash
curl -X PUT "$BASE/variables/3d839b52-36aa-43b2-b078-f0c4f004de70" \
  -H "Authorization: Bearer $FLOWISE_API_KEY" -H 'Content-Type: application/json' \
  -d '{"name":"slack_webhook_url","value":"https://hooks.slack.com/services/…","type":"static"}'
```

Test posting:
```bash
curl -X POST -H 'Content-Type: application/json' \
  --data '{"text":"OSS Release Copilot connected ✅"}' \
  "$SLACK_WEBHOOK_URL"
```

---

## 12. Admin API cheatsheet

```bash
FLOWISE_API_KEY=<key>
BASE=http://localhost:3000/api/v1

# list objects
curl -s $BASE/chatflows   -H "Authorization: Bearer $FLOWISE_API_KEY" | jq '.[]|{id,name,type}'
curl -s $BASE/tools       -H "Authorization: Bearer $FLOWISE_API_KEY" | jq '.[]|{id,name}'
curl -s $BASE/credentials?credentialName=openAIApi -H "Authorization: Bearer $FLOWISE_API_KEY" | jq '.[]|{id,name}'
curl -s $BASE/variables   -H "Authorization: Bearer $FLOWISE_API_KEY" | jq '.[]|{id,name,type}'

# run the agentflow (once deployed)
curl -s -X POST $BASE/prediction/7cb45c2a-0360-43eb-b6a0-97a40b38b57f \
  -H "Authorization: Bearer $FLOWISE_API_KEY" -H 'Content-Type: application/json' \
  -d '{"question":"start","form":{"owner":"kottesh","repo":"beacon-board","base":"v0.2.0","head":"main","targetVersion":"v0.3.0"}}'
```

---

## 13. Object IDs (this instance)

| Object | id |
|---|---|
| Chatflow | `7cb45c2a-0360-43eb-b6a0-97a40b38b57f` |
| Tool `github_release_context` | `a197895e-88bf-493b-8557-6a232dc5cee7` |
| Tool `slack_send_notification` | `3793be90-d8af-4f4c-b561-3c20091d55d1` |
| Credential (Cloudsway) | `71792a5b-09e6-4aa3-992f-5391b7de79c6` |
| Variable `github_token` | `a03b3990-b4e4-4549-9f75-59b0fbe4c5cd` |
| Variable `slack_webhook_url` | `3d839b52-36aa-43b2-b078-f0c4f004de70` |

---

## 14. Safety model

- No auto-deploy, no auto-publish, no workflow triggering.
- GitHub tool is **read-only** (token scope used for reads).
- Human Input node gates the entire deploy branch.
- Slack tool degrades to "draft only" if the webhook is unset.
- Secrets live in Flowise credential/variables, not in node prompts.

---

## 15. Backlog / nice-to-have

- Slack events: deploy completed ✅, deploy failed ❌, rollback recommended ↩️.
- Semantic-version recommender node (patch/minor/major from conventional commits).
- Post-deploy verification node that re-checks the release workflow run + tag/artifact.
- `create_github_release_draft` tool (write scope) gated behind a second Human Input.
- Persist generated notes/plan to local files (`release-notes/`, `deployment-plans/`).
