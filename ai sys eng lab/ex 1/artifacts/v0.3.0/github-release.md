# beacon-board v0.3.0

> **Release date:** <!-- fill in: YYYY-MM-DD -->
> **Diff:** [`v0.2.0...v0.3.0`](https://github.com/kottesh/beacon-board/compare/v0.2.0...v0.3.0)

---

## What's Changed

### ✨ New Features
- **Incident summary helper** — a new utility that generates a concise summary
  string from an incident object, making it easier to render incident cards and
  notification payloads consistently across the UI and API layer.

### 🐛 Bug Fixes
- **Reject empty service names** — service creation and update paths now return
  a validation error immediately when the `name` field is blank or whitespace-
  only, preventing silent data integrity issues downstream.

  > ⚠️ **Breaking change (minor):** Any client that previously submitted an
  > empty `name` and expected a `2xx` response will now receive a `400 Bad
  > Request`. Update your payloads or validation logic before upgrading.

### 🔧 Chores & Infrastructure
- Added `release.yml` GitHub Actions workflow to automate future release builds
  and artifact uploads.
- Added deployment documentation covering preflight checks, tagging steps, and
  rollback procedures.

---

## ⚠️ Upgrade Notes

| Area | Action required |
|---|---|
| Service name validation | Audit any integration that creates or updates services with a potentially empty `name` field and add client-side validation. |
| Release workflow | `release.yml` is new and **untested in production**. Monitor the Actions run for this release closely (see verification checklist below). |
| CHANGELOG | A `v0.3.0` entry was absent at cut time — verify it has been added to `CHANGELOG.md` before publishing. |

---

## 📦 Installation

### npm
```bash
npm install beacon-board@0.3.0
```

### yarn
```bash
yarn add beacon-board@0.3.0
```

### pnpm
```bash
pnpm add beacon-board@0.3.0
```

### Clone & build from source
```bash
git clone https://github.com/kottesh/beacon-board.git
cd beacon-board
git checkout v0.3.0
npm install
npm run build
```

---

## ✅ Post-Deployment Verification Checklist

Work through these steps **after the tag is pushed and the release is
published.** Check each box as you go.

### 1 — GitHub Actions release run
- [ ] Navigate to **Actions → release.yml** and confirm a run was triggered by
      the `v0.3.0` tag push.
- [ ] All jobs reach ✅ **success** status (no yellow warnings treated as
      failures, no red ✗).
- [ ] Build logs show the correct version string `0.3.0` — not `0.2.0` or
      `0.0.0`.
- [ ] No secrets or sensitive values are printed in plain text in the logs.

### 2 — Smoke tests
- [ ] **Incident summary helper** — call the helper with a well-formed incident
      object and confirm the returned string is non-empty and matches the
      expected format.
- [ ] **Incident summary helper (edge case)** — call with a minimal / partial
      incident object and confirm it does not throw.
- [ ] **Empty service name rejection** — submit a `POST /services` (or
      equivalent) request with `name: ""` and confirm a `400 Bad Request`
      response is returned with a descriptive error message.
- [ ] **Valid service name** — submit the same request with a non-empty `name`
      and confirm it still succeeds with `2xx`.
- [ ] No regressions in existing service CRUD paths.

### 3 — Artifact & tag confirmation
- [ ] Tag `v0.3.0` is visible at
      `https://github.com/kottesh/beacon-board/tags`.
- [ ] The GitHub Release page shows the correct title **"beacon-board v0.3.0"**
      and this release body.
- [ ] If a build artifact (tarball, zip, or npm package) is attached: download
      it, verify the checksum matches the one printed in the Actions log, and
      confirm the extracted `package.json` reads `"version": "0.3.0"`.
- [ ] The release is **not** marked as a pre-release unless intentional.
- [ ] `v0.2.0` tag and its release remain intact (no accidental deletion).

### 4 — Rollback trigger conditions
If any of the above checks fail, roll back immediately:

```bash
# Delete the remote tag
git push origin :refs/tags/v0.3.0

# Delete the local tag
git tag -d v0.3.0

# Re-pin consumers to the last known-good release
npm install beacon-board@0.2.0
```

Then delete the draft/published GitHub Release from the UI and open an issue
before re-attempting the release.

---

## 👥 Contributors

<!-- Add contributors here, e.g.:
- @kottesh
-->

---

## How to publish with the `gh` CLI

```bash
gh release create v0.3.0 \
  --title "beacon-board v0.3.0" \
  --notes-file RELEASE_NOTES_v0.3.0.md \
  --draft
```

> Save the markdown block above as `RELEASE_NOTES_v0.3.0.md`, run the command,
> review the draft at `https://github.com/kottesh/beacon-board/releases`, then
> click **Publish release** once all post-deployment checks pass.

---

*Released with ❤️ by the beacon-board maintainers.*
