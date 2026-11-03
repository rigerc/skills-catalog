# Skill quality results

`data/quality.json` (schema: `schemas/quality.schema.json`) records offline
[skill-validator](https://github.com/agent-ecosystem/skill-validator) results for every
verified, commit-pinned skill. It is generated; do not edit it by hand.

## What runs

`structure`, `content` and `contamination` checks, per skill, on the **full skill directory**
at the pinned commit (every tracked nested file, including custom directories, not a curated list). The checkout excludes unrelated sibling skill directories. Git submodules and LFS payloads are not recursively hydrated or executed. Not run: `links`
(live HTTP, non-deterministic, spends network quota) and LLM scoring. Canonical model scores are maintained separately by Open JEV as described below.

Both validator workflows use `--allow-extra-frontmatter` and `--allow-dirs=evals`
from the shared `TOOL` configuration in `scripts/quality.mjs`. Extra frontmatter fields
and the `evals/` directory are accepted without warnings; standard frontmatter fields
and other directories still receive the usual validation.

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

- **Skill quality gate** (every PR or manual dispatch): always runs a network-free planning step, installing the validator and evaluating sources only for added/repinned skills. On same-repository PRs, the bot creates or updates a single PR comment containing the results for each evaluated skill (including passes), or explicitly states that no skills needed checking. The comment links to the workflow run; it does not write `data/quality.json`. Fork PRs retain the workflow summary but cannot receive a bot comment using the read-only fork token. For a manual run, choose a branch in **Actions > Skill quality gate > Run workflow**; by default it compares that branch against `main`, or you can supply an explicit 40-character `base_sha`. Running manually on an unchanged `main` branch evaluates no sources. Initially report-only; use `--enforce` after calibration to block `fail`, `not_evaluated`, and unattempted targets unless waived.
- **Refresh skill quality results** (push to main, weekly, manual): updates `data/quality.json` via PR. In Actions, use **Run workflow** with `all` and `max_groups` to control the manual backfill. A network-free plan skips Go and validator installation when no work is pending. Both workflows cache the pinned validator binary.
  First run: dispatch repeatedly (`max_groups`) and merge each refresh PR until `missing` reaches 0. The default batch limit is 20 repository/commit groups.
- **CI**: `node scripts/quality.mjs --check` is offline; coverage is reported, not enforced.

GitHub displays **Run workflow** when the workflow file exists on the repository's default branch.

## Changing the validator or flags

Edit `TOOL` in `scripts/quality.mjs`. All entries become stale and are re-evaluated on the next
refresh, in chunks if needed. Calibrate on a sample first: `node scripts/quality.mjs --write --ids <a,b,c>`.

## Resource limits and waivers

The metadata-only preflight counts Git-tracked paths inside selected directories without requesting blob sizes. After sparse checkout, disk-byte limits are checked on the full selected skill directories. Defaults: 5,000 files and 50 MiB per skill, plus group limits and a 10-minute per-group deadline bounded by the overall run deadline. Git pack transfers cannot be hard-capped in advance; oversized or unavailable packages become `not_evaluated`, not `pass`.

Reviewed exceptions are stored in `data/quality-waivers.json`, bound to a skill ID, pinned commit, and applicable status. They require a rationale and reviewer, and should usually have an expiry date. A new commit requires new review.

## Canonical Open JEV scores

[`data/scores.json`](../data/scores.json), validated by
[`schemas/scores.schema.json`](../schemas/scores.schema.json), is the sole maintained
model score report. Open JEV replaces the previous HTTP/SDK evaluator results.
The migration imports the completed evaluation report from [PR #47](https://github.com/rigerc/skills-catalog/pull/47),
commit `e54886ce3e678a922ca0aa196c04de8a1dfd3184`: **867 evaluated, zero pending**.
All source pins and evaluator fingerprints match the current catalog. Previous
provider scores are recoverable in Git history. The completed 14-batch progress
record is retained, so workflows can resume without repeating this evaluation.

The pinned [Open JEV action](../.github/workflows/nosey-open-jev.yml) uses
`model-v1` and [five score questions](../config/open-jev-questions.json): trigger
clarity, instruction quality, correctness, safety, and context efficiency. Class
indices 0–4 become integer scores 1–5; the overall score is their equal-weight
mean. Confidence is model-reported, not measured accuracy. Saved results contain
scores and confidence, without written reasons, recommendations or distributions.

Only the **first 4,000 UTF-16 code units of SKILL.md** enter the model state.
The saved `input_sha256` hashes the full downloaded bytes, not the submitted
excerpt. Historical rows do not record whether a particular document was truncated.
Supporting files, runtime behavior and factual claims are not independently checked.
Scores drive the site's normal score display, filters, sorting and repository
averages. They do not change static quality gates or installation eligibility.
`ranking_calibrated: false` honestly records the absence of calibration evidence;
it does not prevent selecting Open JEV as the main evaluator.

### Evaluate and maintain

Node.js 22+ is required. Planning and maintenance need no credentials, optional
client, network access or model execution:

```sh
# Offline selection of missing/stale pinned skills; writes workflow matrix inputs.
npm run evaluate:skills -- --limit 8 --out /tmp/open-jev-plan.json

# Refresh coverage and repository means after catalog/source changes.
npm run sync:scores
npm run check:scores
npm run validate:schemas -- --self-test --skip-unmapped
```

Run **Open JEV — incremental canonical skill evaluation** in Actions to evaluate
up to 64 pending/stale skills (default eight). **Open JEV — complete remaining
verified skills** evaluates batches of 64, at most two parallel jobs and 20 batches.
The existing main-push trigger remains; no schedule is enabled. Self-dispatch stops
when complete, when a batch accepts no new results, or when its budget is exhausted.
Review the progress PR before starting another bulk budget; manual incremental
runs remain available for an explicitly bounded follow-up.

Both workflows serialize through one concurrency group and checkpoint to
`automation/open-jev-full-evaluation`. They restore report data onto the current
main scripts/catalog, merge successes, validate scores and open/update a review PR.
They check the base commit and use an explicit push lease, so a changed branch
fails the update rather than losing results. A failed update needs a rerun.
No workflow writes scores directly to main. Failed evaluations leave the skill
pending (or preserve stale evidence); they never become zero or fabricated scores.

`sync:scores` prunes retired IDs and refreshes coverage while retaining score values
and provenance. Source repository, exact path, commit and inference fingerprint
must match for a current evaluation. Stale evidence remains inspectable but does not
contribute to current averages or score sorting/filtering. No-op sync retains the
report timestamp and file bytes. CI requires stored coverage/aggregates to match
the current catalog; include the synced report with catalog/source changes.

### Report and compatibility

Canonical schema v3 has one evaluator and one entry per evaluated skill.
`result_kind: "open_jev_scores"` distinguishes these results from legacy SDK Jev.
Entries use `evaluation.scores`, pinned source URL/commit, full-document hash,
evaluation time and the original inference fingerprint. Rubric/action/model/input
policy changes invalidate cached evaluations; moving the file or changing report
format does not. Metadata retains the full questions and excerpt policy so its
fingerprint can be verified offline.

The `repositories` array includes each catalog repository's coverage, arithmetic
mean `overall_score`, per-dimension `criterion_scores`, and exact `scored_skill_ids`.
Each current skill contributes equally. Pending, unresolved, stale and retired
skills do not contribute; empty means are `null`, not zero. Coverage describes this
catalog's sample, not every skill in an upstream repository.

The manifest keeps its existing `evaluation` shape and uses Open JEV as the main
score. Manifest v1.1 retains `open_jev` as a deprecated compatibility alias, populated
from the same canonical entry. Its old `ranking_eligible: false` flag applies only
to that legacy extension; new consumers use `evaluation`. There is no second input
report. The existing Pages `data/scores.json` URL publishes v3; strict external
score consumers must update their schema.

For explicit migration of a saved standalone Open JEV v1 report:

```sh
node scripts/open-jev-scores.mjs --import /path/to/saved-open-jev-v1.json
```

This command replaces canonical results; it never imports the previous provider's
scores. `--import-checkpoint PATH` merges a v3 or standalone-v1 checkpoint with the
current report, retaining newer current evidence. Workflow resume supports old
progress branches containing the standalone filename without checking out their
scripts or catalog. Completed-batch accounting is retained.

### Legacy provider comparisons

The old HTTP/SDK evaluators remain available as `evaluate:legacy` for explicit
comparison runs. They require `--output` outside the canonical path and cannot
write `data/scores.json` through aliases or maintenance flags. Their reports use
[`legacy-scores.schema.json`](../schemas/legacy-scores.schema.json), not canonical v3.
No legacy report is automatically imported into production scores.

```sh
# Offline preview; live invocation requires the selected provider's credentials.
npm run evaluate:legacy -- --provider openai --dry-run \
  --output results/openai-comparison.json

# Optional SDK Jev (install optional dependencies first), separate from Open JEV.
npm run evaluate:legacy -- --provider jev --jev-endpoint opencode-go --limit 10 \
  --output results/jev-comparison.json

node scripts/evaluate-skills.mjs --sync --output results/jev-comparison.json
```

Legacy providers retain their own options and cache behavior; use
`npm run evaluate:legacy -- --help`. OpenAI uses `OPENAI_API_KEY`, OpenRouter uses
`OPENROUTER_API_KEY`, and SDK Jev reads its selected endpoint's key
(`TYPESAFE_API_KEY`, `OPENROUTER_API_KEY`, or `OPENCODE_API_KEY`). These optional
comparisons are outside the canonical evaluation workflows and may consume a
provider's usage allowance. No live inference is needed for repository tests.
