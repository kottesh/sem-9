# beacon-board v0.3.0

> **Released:** 2026-07-13 · **Full Changelog:** [`v0.2.0...v0.3.0`](https://github.com/kottesh/beacon-board/compare/v0.2.0...v0.3.0)

---

## ✨ Highlights

This release ships a new **incident summary helper** that makes it easier to
aggregate and report on incident data across your tracked services, alongside a
correctness fix that prevents silent failures caused by empty service names.
A GitHub Actions release workflow and deployment documentation are also
included, making the path from code to published release fully automated.

---

## Added

- **`src/incidents.ts` — incident summary helper** (`feat: add incident summary helper`)
  Introduces a new `incidents` module exposing a helper that aggregates
  incident data for a service. Consumers can now generate structured summaries
  without writing bespoke reduction logic. ([`3d14acf`](https://github.com/kottesh/beacon-board/commit/3d14acf))

- **`.github/workflows/release.yml` — automated release workflow** (`chore: add release workflow and deployment docs`)
  A new GitHub Actions workflow handles the end-to-end release process when a
  `v*` tag is pushed. ([`9da769a`](https://github.com/kottesh/beacon-board/commit/9da769a))

- **`docs/deployment.md` — deployment guide** (`chore: add release workflow and deployment docs`)
  Step-by-step documentation covering how to cut a release, tag conventions,
  and what the release workflow does automatically. ([`9da769a`](https://github.com/kottesh/beacon-board/commit/9da769a))

---

## Changed

- **`src/status.ts`** — minor additions (+3 lines) in support of the incident
  summary integration; no public API surface was removed or renamed.

- **`tests/status.test.ts`** — expanded test coverage (+9 lines) to assert the
  new empty-name rejection behaviour introduced in this release.

---

## Fixed

- **Empty service names are now rejected** (`fix: reject empty service names`)
  `src/status.ts` previously accepted blank strings as valid service
  identifiers, which could produce silent downstream failures. Passing an empty
  or whitespace-only name now throws an explicit error at the point of
  registration. ([`25fc05f`](https://github.com/kottesh/beacon-board/commit/25fc05f))

---

## Breaking Changes

None. All existing public APIs remain compatible with `v0.2.0`.

---

## Upgrade Notes

1. **Empty service names will now throw.** If any call-site in your code
   registers a service with an empty string `""`, it will error at runtime
   after upgrading. Audit your service registration calls before deploying.

2. No dependency changes were made in this release (`package.json` version
   bump only); no `npm install` is required beyond updating the package
   version itself.

---

## Full Changelog

[`v0.2.0...v0.3.0`](https://github.com/kottesh/beacon-board/compare/v0.2.0...v0.3.0)
