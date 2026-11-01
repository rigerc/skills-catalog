# Skill quality results

`data/quality.json` (schema: `schemas/quality.schema.json`) records offline
[skill-validator](https://github.com/agent-ecosystem/skill-validator) results for every
verified, commit-pinned skill. It is generated; do not edit it by hand.

## What runs

`structure`, `content` and `contamination` checks, per skill, on the **full skill directory**
at the pinned commit (references, scripts, assets and any other files). Not run: `links`
(live HTTP, non-deterministic, spends network quota) and LLM scoring.

## How it stays cheap

- Git transport only: one blobless shallow fetch per distinct repository+commit, then a sparse
  checkout of just the cataloged skill directories. A repository-root skill fetches the whole tree.
  No GitHub REST/GraphQL requests. A Git fetch and sparse checkout may still make multiple network requests.
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
- **Refresh skill quality results** (push to main, weekly, manual): updates `data/quality.json` via PR. In Actions, use **Run workflow** with `all` and `max_groups` to control the manual backfill.
  First run: dispatch repeatedly (`max_groups`) and merge each refresh PR until `missing` reaches 0. The default batch limit is 20 repository/commit groups.
- **CI**: `node scripts/quality.mjs --check` is offline; coverage is reported, not enforced.

GitHub only displays the **Run workflow** control when the workflow file exists on the repository's default branch. These manual controls become available after this feature PR is merged into `main`.

## Changing the validator or flags

Edit `TOOL` in `scripts/quality.mjs`. All entries become stale and are re-evaluated on the next
refresh, in chunks if needed. Calibrate on a sample first: `node scripts/quality.mjs --write --ids <a,b,c>`.

## Resource limits and waivers

The preflight counts files and uncompressed sizes from Git trees before downloading blobs. Default per-skill limits are 5,000 files and 50 MiB; repository groups have a 10-minute deadline. These are **not guaranteed network-transfer-byte caps** because Git controls pack transfers. Oversized or unavailable packages become `not_evaluated`, not `pass`.

Reviewed exceptions are stored in `data/quality-waivers.json`, bound to a skill ID, pinned commit, and applicable status. They require a rationale and reviewer, and should usually have an expiry date. A new commit requires new review.
