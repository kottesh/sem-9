# 🚀 Deployment & Rollback Plan — `kottesh/beacon-board` `v0.3.0`

> **Gate:** `WARN` · **Risk:** `medium` · **Base:** `v0.2.0` · **Target:** `v0.3.0`
> **Repo:** https://github.com/kottesh/beacon-board · **Date:** 2026-07-13

---

## ⚠️ Warnings to Acknowledge

> Because gate is `WARN`, you **must consciously acknowledge each item below** before proceeding.
> Do not cut the tag until every box is checked.

- [ ] **W-1 · CHANGELOG.md is missing a `v0.3.0` entry.**
  The changelog documents `v0.2.0` and `v0.1.0` but has no `v0.3.0` section.
  Add the entry (the draft above is ready to paste) and commit it to `main`
  *before* running the deploy steps. A release without a changelog entry is
  untraceable for future contributors.

- [ ] **W-2 · New release workflow (`.github/workflows/release.yml`) has never been exercised.**
  Commit `9da769a` introduced it but no `v*` tag has ever been pushed, so the
  workflow has zero real runs. Confirm the workflow YAML is syntactically valid
  and that any required secrets (e.g. `GITHUB_TOKEN`, npm token) are present in
  repo Settings → Secrets before tagging.

- [ ] **W-3 · `package.json` version bump is the only change to that file.**
  Verify no dependency drift exists between your local `node_modules` and the
  committed `package-lock.json` / `npm-shrinkwrap.json`. Run `npm ci` (not
  `npm install`) in preflight to catch any mismatch.

- [ ] **W-4 · Empty-service-name rejection is a silent breaking change for callers.**
  `fix: reject empty service names` will throw at runtime for any consumer
  passing `""`. Confirm no call-site in your own codebase or downstream
  integrations registers a service with an empty string.

---

## 1 · Preflight

> Run these locally on the `main` branch **after** all warnings are acknowledged
> and the CHANGELOG commit is in place. All steps must pass before you tag.

### 1.1 — Ensure you are on a clean, up-to-date `main`

```bash
git checkout main
git fetch origin
git status          # must report: nothing to commit, working tree clean
git log --oneline origin/main..HEAD   # must be empty (no unpushed local commits)
```

### 1.2 — Install dependencies reproducibly

```bash
npm ci
```

> Use `npm ci`, not `npm install`. This respects the lockfile exactly and will
> fail fast if `package-lock.json` is out of sync — directly addressing **W-3**.

### 1.3 — Run the full test suite

```bash
npm test
```

**Expected outcome:**
- All tests pass (exit code `0`).
- The new `tests/status.test.ts` assertions for empty-name rejection are green.
- Zero skipped or pending tests that cover changed files.

> ❌ **Hard stop** — do not proceed if any test fails.

### 1.4 — Run the production build

```bash
npm run build
```

**Expected outcome:**
- Build exits with code `0`.
- `dist/` (or your configured output directory) is produced with no TypeScript
  compiler errors.
- No new `error TS` lines in stdout.

> ❌ **Hard stop** — do not proceed if the build fails.

### 1.5 — Confirm `package.json` version

```bash
node -e "const p=require('./package.json'); console.log(p.version);"
# Expected output: 0.3.0
```

### 1.6 — Confirm CHANGELOG entry exists

```bash
grep "v0.3.0" CHANGELOG.md
# Must return at least one matching line
```

> ❌ **Hard stop** — if this returns nothing, add the changelog entry, commit,
> and push to `main` before continuing.

---

## 2 · Deploy Steps

> Execute in order. Each command is a discrete, reversible step.

### Step 1 — Create the annotated tag locally

```bash
git tag -a v0.3.0 -m "release: v0.3.0

- feat: add incident summary helper (3d14acf)
- fix: reject empty service names (25fc05f)
- chore: add release workflow and deployment docs (9da769a)"
```

> Use an **annotated** tag (`-a`), not a lightweight tag. Annotated tags carry
> a tagger, timestamp, and message — they are first-class Git objects and are
> what GitHub's release workflow triggers on.

### Step 2 — Push `main` branch and the new tag atomically

```bash
git push origin main --tags
```

> `--tags` pushes all local tags not yet on the remote. Since only `v0.3.0` is
> new, exactly one tag is pushed. This single command ensures the branch ref
> and the tag ref land on the remote together, preventing a race where the
> workflow fires before `main` is fully updated.

### Step 3 — Confirm the tag is visible on the remote

```bash
git ls-remote --tags origin | grep v0.3.0
# Expected: refs/tags/v0.3.0 and refs/tags/v0.3.0^{} (the dereferenced commit)
```

---

## 3 · Verify

### 3.1 — Check the GitHub Actions release workflow

1. Navigate to:
   ```
   https://github.com/kottesh/beacon-board/actions/workflows/release.yml
   ```
2. Confirm a new run appeared triggered by **`push` / tag `v0.3.0`**.
3. Wait for the run to reach **`completed`** status.
4. Confirm conclusion is ✅ **`success`** — not `failure`, `cancelled`, or
   `skipped`.
5. Expand each job step and verify:
   - No unexpected warnings in the build/publish steps.
   - Any artifact upload or GitHub Release creation step completed without error.

> ⏱ Allow up to **5 minutes** for the runner to pick up the job. If the
> workflow has not appeared after 5 minutes, check
> [Actions → All workflows](https://github.com/kottesh/beacon-board/actions)
> for a stalled queue or a misconfigured trigger in `release.yml`.

### 3.2 — Confirm the GitHub Release was published

```
https://github.com/kottesh/beacon-board/releases/tag/v0.3.0
```

- Release title and body are populated (not blank).
- Tag shows as `v0.3.0`.
- Any attached build artifacts are present if the workflow uploads them.

> ⚠️ This is the **first ever formal GitHub Release** for this repo (prior tags
> had no associated release objects). If the workflow does not auto-create the
> release, create it manually via the GitHub UI using the changelog entry
> drafted above.

### 3.3 — Run the smoke test

```bash
# Pull the freshly built package and exercise the two new code paths

# Option A — run against your local build output
node -e "
const { summariseIncidents } = require('./dist/incidents');
const { registerService }     = require('./dist/status');

// Verify incident summary helper exists and is callable
const result = summariseIncidents([]);
console.assert(result !== undefined, 'summariseIncidents must return a value');
console.log('✅  incidents.summariseIncidents — OK');

// Verify empty-name rejection
try {
  registerService('');
  console.error('❌  registerService(\"\") should have thrown');
  process.exit(1);
} catch (e) {
  console.log('✅  registerService(\"\") correctly throws —', e.message);
}

console.log('✅  Smoke test passed');
"
```

> Adapt the `require` paths to match your actual `dist/` output structure.
> If the project ships an ESM build, use `import()` or run via `tsx`/`ts-node`.

**Expected output:**
```
✅  incidents.summariseIncidents — OK
✅  registerService("") correctly throws — <your error message>
✅  Smoke test passed
```

> ❌ **Escalate immediately** if the smoke test fails after a successful CI run —
> this indicates a build/packaging discrepancy that must be investigated before
> any downstream consumers pick up `v0.3.0`.

---

## 4 · Rollback Plan — targeting `v0.2.0`

> Trigger this plan if **any** of the following occur after the tag is pushed:
> - Release workflow fails and cannot be re-run successfully within 15 minutes.
> - Smoke test fails on the published artifact.
> - A runtime regression is reported against the `v0.3.0` build.
> - The empty-name breaking change (W-4) causes an unexpected outage downstream.

---

### Rollback Step 1 — Delete the remote `v0.3.0` tag

```bash
git push origin --delete v0.3.0
```

> This prevents any further tooling, CI runs, or consumers from resolving
> `v0.3.0`. Do this **first**, before touching anything else.

### Rollback Step 2 — Delete the local tag

```bash
git tag -d v0.3.0
```

### Rollback Step 3 — Remove the GitHub Release (if it was created)

Navigate to:
```
https://github.com/kottesh/beacon-board/releases/tag/v0.3.0
```
Click **Edit** → **Delete this release**. Confirm deletion.

> Deleting the release does not delete the tag on its own — Step 1 handles
> the tag independently.

### Rollback Step 4 — Re-pin consumers to `v0.2.0`

```bash
# Verify v0.2.0 tag still resolves correctly
git fetch origin
git checkout v0.2.0

# Confirm you are on the correct commit
git log -1 --oneline
# Should match the commit SHA that was HEAD at v0.2.0
```

### Rollback Step 5 — Re-run the `v0.2.0` build to confirm baseline is healthy

```bash
git checkout v0.2.0
npm ci
npm test
npm run build
```

All three commands must exit `0`. This confirms `v0.2.0` is still a viable,
buildable baseline before you communicate the rollback to any dependents.

### Rollback Step 6 — Communicate & create a post-mortem issue

```bash
# Open a GitHub issue to track the failed release
# Title: "v0.3.0 release rolled back — <one-line reason>"
# Body should include:
#   - Which verify step failed
#   - Exact error output
#   - Rollback steps taken
#   - Link to the failed Actions run
```

```
https://github.com/kottesh/beacon-board/issues/new
```

---

### Rollback Decision Matrix

| Scenario | Action |
|---|---|
| Release workflow fails, fix is trivial (< 15 min) | Fix, delete tag, re-tag, re-push |
| Release workflow fails, fix is non-trivial | Full rollback — Steps 1–6 |
| Smoke test fails on `dist/` output | Full rollback — Steps 1–6 |
| W-4 empty-name change breaks a downstream caller | Full rollback — Steps 1–6 |
| GitHub Release not auto-created by workflow | **Do not rollback** — create release manually via UI |
| Minor cosmetic issue in release notes | **Do not rollback** — edit release body in GitHub UI |

---

## ✅ Deployment Checklist (print or copy)

```
PRE-FLIGHT
[ ] W-1  CHANGELOG.md v0.3.0 entry committed and pushed
[ ] W-2  release.yml secrets verified in repo Settings
[ ] W-3  npm ci completes without lockfile mismatch
[ ] W-4  no call-site passes empty string to registerService

PREFLIGHT COMMANDS
[ ] git checkout main && git fetch origin && git status → clean
[ ] npm ci                          → exit 0
[ ] npm test                        → all pass
[ ] npm run build                   → exit 0
[ ] node -e "require('./package.json').version" → 0.3.0
[ ] grep "v0.3.0" CHANGELOG.md      → match found

DEPLOY
[ ] git tag -a v0.3.0 -m "release: v0.3.0 ..."
[ ] git push origin main --tags
[ ] git ls-remote --tags origin | grep v0.3.0 → confirmed

VERIFY
[ ] Actions › release.yml run → completed / success
[ ] github.com/…/releases/tag/v0.3.0 → release page exists
[ ] Smoke test → all assertions pass

DONE — v0.3.0 is live 🎉
```
