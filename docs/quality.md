# Skill quality results

`data/quality.json` (schema: `schemas/quality.schema.json`) records offline
[skill-validator](https://github.com/agent-ecosystem/skill-validator) results for every
verified, commit-pinned skill. It is generated; do not edit it by hand.

## What runs

`structure`, `content` and `contamination` checks, per skill, on the **full skill directory**
at the pinned commit (every tracked nested file, including custom directories, not a curated list). The checkout excludes unrelated sibling skill directories. Git submodules and LFS payloads are not recursively hydrated or executed. Not run: `links`
(live HTTP, non-deterministic, spends network quota) and LLM scoring.

## How it stays cheap

- Git transport only: shallow partial fetch of a pinned repository+commit, followed by non-cone sparse checkout of **entire** ledger-selected skill directories, recursively. Small groups use `tree:0` and lazy tree hydration; larger groups use `blob:none`. A root-level `SKILL.md` requires a full repository-root skill checkout. Never call `git ls-tree -l`: it can fetch unrelated blobs to obtain sizes. No GitHub REST/GraphQL requests; partial checkout can still require multiple Git requests.
- Results are cached by `(id, commit, path, fingerprint)`. The fingerprint hashes the validator
  version, checks and flags (`TOOL` in `scripts/quality.mjs`). Only missing or stale entries run.
- Concurrency is 2 repository groups at once with at least 1 second between fetch starts; a throttling response stops dispatch and the rest stay
  pending for the next run.

## Status

`pass` (no findings above info), `warn` (warnings only), `fail` (errors), `not_evaluated`
(no verdict; `not_evaluated.code` says why). Passing checks are not stored. There is no composite
score. Results describe upstream content quality, not security, licensing or availability.

## Workflows

- **Skill quality gate** (every PR or manual dispatch): always runs a network-free planning step, installing the validator and evaluating sources only for added/repinned skills. For a manual run, choose a branch in **Actions > Skill quality gate > Run workflow**; by default it compares that branch against `main`, or you can supply an explicit 40-character `base_sha`. Running manually on an unchanged `main` branch evaluates no sources. Initially report-only; use `--enforce` after calibration to block `fail`, `not_evaluated`, and unattempted targets unless waived.
- **Refresh skill quality results** (push to main, weekly, manual): updates `data/quality.json` via PR. In Actions, use **Run workflow** with `all` and `max_groups` to control the manual backfill. A network-free plan skips Go and validator installation when no work is pending. Both workflows cache the pinned validator binary.
  First run: dispatch repeatedly (`max_groups`) and merge each refresh PR until `missing` reaches 0. The default batch limit is 20 repository/commit groups.
- **PR comments**: the read-only quality gate uploads a Markdown artifact listing every newly added or repinned verified skill checked (including passes), warnings, failures, and unattempted sources. A separate `workflow_run` workflow on `main` posts or updates one bot comment on the matching PR, with a link to the run. Mapping-only PRs explicitly report that no new or repinned skills were checked. This does **not** update `data/quality.json`.
- **CI**: `node scripts/quality.mjs --check` is offline; coverage is reported, not enforced.

GitHub displays **Run workflow** when the workflow file exists on the repository's default branch.

## Changing the validator or flags

Edit `TOOL` in `scripts/quality.mjs`. All entries become stale and are re-evaluated on the next
refresh, in chunks if needed. Calibrate on a sample first: `node scripts/quality.mjs --write --ids <a,b,c>`.

## Resource limits and waivers

The metadata-only preflight counts Git-tracked paths inside selected directories without requesting blob sizes. After sparse checkout, disk-byte limits are checked on the full selected skill directories. Defaults: 5,000 files and 50 MiB per skill, plus group limits and a 10-minute per-group deadline bounded by the overall run deadline. Git pack transfers cannot be hard-capped in advance; oversized or unavailable packages become `not_evaluated`, not `pass`.

Reviewed exceptions are stored in `data/quality-waivers.json`, bound to a skill ID, pinned commit, and applicable status. They require a rationale and reviewer, and should usually have an expiry date. A new commit requires new review.
