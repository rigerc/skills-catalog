# Plan: Replace main scores with Open JEV

Status: implemented; verification recorded in [todo.md](todo.md). Updated per user direction: Open JEV replaces the
existing scores and becomes the canonical evaluator. Implementation tasks:
[todo.md](todo.md).

## Outcome

Make `data/scores.json` the single maintained score report, populated by Open JEV.
Replace existing evaluator results, update evaluation/maintenance scripts and CI,
and use Open JEV for the site's normal score display, filters, sorting, repository
averages, and manifest evaluation. No supplementary report or dual-evaluator join.

## Findings

Original local snapshot inspected on 2026-11-03 (before importing the completed remote report):

- The catalog contains 867 skills. Main scores contain 150 successful evaluations,
  two failed attempts, and 715 pending skills. Open JEV contains eight current
  evaluations, all overlapping existing successful main evaluations.
- Remote report follow-up: [PR #47](https://github.com/rigerc/skills-catalog/pull/47),
  commit `e54886ce3e678a922ca0aa196c04de8a1dfd3184`, contains 867 evaluations
  matching the current pins and evaluator. Import that report and its completed
  14-batch progress ledger instead of shipping only the eight local results.
  Final coverage is 867 evaluated, zero pending; no legacy-provider fallback.
- Main schema v2 assumes a single evaluator, `evaluation.scores`, pinned source
  URLs, coverage, and repository aggregates. Open JEV v1 uses a different evaluator
  fingerprint, structured repository/path/commit sources, and integer dimension
  scores with confidence/mode, without prose or saved probability distributions.
- Open JEV prepares the first 4,000 JavaScript string code units of each document.
  `input_sha256` hashes the full source bytes, not the excerpt. Historical entries
  do not establish whether an individual source was truncated.
- The compiler currently emits both primary `evaluation` and experimental
  `open_jev`. The site reads only main scores. Both Open JEV workflows, their
  planner and bulk progress scripts currently use the standalone report path.
- `evaluate-skills.mjs` currently owns main sync/check and can write a different
  provider to main. Its generic fingerprint check and Jev distribution validator
  cannot validate Open JEV entries without explicit dispatch.

Sources: [main scores](../data/scores.json), [Open JEV scores](../data/open-jev-scores.json),
[main evaluator](../scripts/evaluate-skills.mjs), [Open JEV library](../scripts/open-jev-lib.mjs),
[input preparation](../scripts/open-jev-prepare.mjs), [planner](../scripts/open-jev-plan.mjs),
[merger](../scripts/open-jev-merge.mjs), [bulk progress](../scripts/open-jev-bulk-status.mjs),
[compiler](../scripts/compile-catalog.mjs), [site](../site/index.html),
[incremental workflow](../.github/workflows/nosey-open-jev.yml),
[bulk workflow](../.github/workflows/nosey-open-jev-bulk.yml),
[catalog CI](../.github/workflows/nosey-catalog.yml).

## Canonical report contract

Use schema v3 for canonical scores so the evaluator replacement and changed result
contract are explicit. Retain the useful report layout: `catalog_id`,
`generated_at`, `evaluator`, `stopped`, `summary`, `entries`, and `repositories`.
Use one entry per skill, `result_kind: "open_jev_scores"`, `evaluation.scores`, and
pinned `source.url` / `source.commit` to minimize consumer changes. Preserve all
five existing integer 1–5 scores, confidence/mode, overall means, source identity,
full-document hash, evaluation timestamp, and original evaluator fingerprint.

Record Open JEV's action SHA, model release, question hash, state format, excerpt
limit, and explicit limitation in report metadata. Keep the existing inference
fingerprint unchanged during the format/path migration: changing the report shape
must not discard valid cached evaluations. Use Open JEV's own fingerprint formula
for cache identity, rather than the old report's generic config hash rule.

Do not fabricate prose, distributions, native fractional scores, submitted-state
hashes, or per-document truncation flags. Keep score arithmetic unchanged: the
producer already converts native class indices to integer 1–5 scores.

The canonical schema accepts Open JEV only. Retain legacy schemas/validators where
needed for explicitly requested noncanonical provider outputs; they must not let
legacy reports pass canonical CI. Resolve schema references consistently across
the validator and tests if splitting the old contract into a legacy schema.

## Replacement and script ownership

- Add an explicit, offline one-time migration that validates standalone Open JEV
  v1, converts it to canonical v3, computes coverage/repository aggregates against
  the current catalog and ledger, and replaces `data/scores.json` atomically.
  The former primary scores remain available in Git history.
- After migration, planner, library, merger, checker and bulk status read/write
  `data/scores.json` directly. Remove `data/open-jev-scores.json` and retire its
  schema once the migration fixture and all callers are updated. There is one
  report to checkpoint, publish and review.
- Reuse shared pure helpers for normalization, freshness, summary and aggregate
  calculation. Match ID, repository (case insensitive), exact path, pinned commit,
  and expected evaluator fingerprint. Reject malformed/duplicate entries; retain
  stale evidence for inspection, exclude it from means, and prune retired IDs on
  sync. Summaries include pending and unresolved catalog skills.
- Route `sync:scores` and `check:scores` through canonical Open JEV maintenance;
  preserve offline behavior, atomic writes, stable ordering and unchanged output
  bytes/timestamps on no-op sync. Sync must never call inference.
- Make `evaluate:skills` the documented Open JEV entry point: its default is an
  offline planner emitting the existing matrix/state workflow inputs, with clear
  instructions to run the incremental/bulk evaluation workflow. Do not silently
  run the former OpenAI default or attempt an unsupported local action runner.
- Keep the old HTTP/SDK providers available through an explicitly named legacy
  command and explicit noncanonical `--output`; reject writes to the canonical
  path, including `--sync`, `--force`, and fallback import paths. Remove the old
  `results/llm-evaluations.json` automatic canonical import. Legacy output readers
  can remain for comparison without participating in production scores.
- Harden semantic checks for evaluator metadata, exact dimension coverage, finite
  scores/confidence, valid timestamps, pinned source identity, aggregate means,
  contribution IDs, and summary arithmetic. Do not treat failures as scores.

## Consumers and score policy

Open JEV replaces the main score in the existing UI and `skills[].evaluation` in
the manifest. Normal score filters, sorting and repository averages use current
Open JEV results. Remove the independent experimental input and compiler read path. Keep evaluator/model/date, five dimensions, confidence and excerpt
scope visible; support empty and stale states without assuming prose fields.

Promotion is the user's policy choice, not a claim of model calibration. Remove
experimental-only restrictions that block main score use; do not relabel
`ranking_calibrated: false` as true without evidence. If retained, document this
metadata as calibration status, separate from primary-score selection. Static
quality gates and installation eligibility remain governed by existing quality
checks, not the model score.

Keep the existing manifest `evaluation` shape and add the new result kind to its
schema enum. Manifest v1.1 retains `open_jev` as a deprecated compatibility alias
from the same canonical entry, avoiding a field removal or minimum-consumer bump.
Its historical ranking flag does not govern the primary evaluation. Existing v1
manifest result kinds remain schema-readable for archived manifests.
Pages keeps the existing `data/scores.json` URL and publishes the replacement.

## CI and evaluation workflows

1. Incremental evaluation: plan from canonical scores, prepare pinned input, run
   the same SHA-pinned action/model and rubric, normalize to the new entry shape,
   merge successful current entries into canonical scores, refresh aggregates,
   run canonical checks, and open a PR containing `data/scores.json`.
2. Bulk evaluation: restore canonical scores from the progress branch, plan only
   missing/stale verified skills, checkpoint canonical scores and the progress
   ledger together, and preserve 64-skill batches, bounded concurrency, 20-batch
   budget, partial successes, no-progress stop, and resumability.
3. Existing progress branches may contain only standalone v1 results. Add a
   bounded compatibility path that imports that report when canonical v3 is absent
   (an old v2 file is not a usable Open JEV checkpoint), preserves completed-batch
   accounting, and never treats old-provider scores as completed Open JEV work.
4. Validate checkpoints against the current base's catalog, source pins and rubric
   before merging; stale progress branches must not restore outdated scripts or
   catalog data. Coordinate incremental and bulk writers through shared workflow
   concurrency or explicit base/head checks and re-merge before committing.
5. Update report paths, restore commands, commit allowlists, workflow names, PR
   text, summary counts and historical experimental/non-ranking comments. Keep
   evaluation updates PR-based. Do not add a schedule or remove batch limits.
6. Catalog CI runs v3 schema negative fixtures and Open JEV semantics, checks
   generated coverage/aggregate parity via no-op sync, tests all score consumers,
   compiles twice, verifies manifests and stages Pages. It must reject old-provider
   canonical reports and references to the retired runtime input path.

Implementation of these workflows prepares future evaluation. Implementation and verification start no workflow, live evaluation, deployment,
or paid request. The pre-existing main-push bulk trigger remains in place.

## Implementation order

1. Canonical v3 schema, shared normalization/aggregate helpers and migration.
2. Canonical evaluation/maintenance commands and legacy write protection.
3. Incremental/bulk workflow conversion, progress-branch migration and concurrency.
4. Main-score UI, manifest and Pages consumer updates.
5. Migrate committed scores and retire the standalone artifact/schema.
6. Documentation, full offline verification and final review.

Review adjustments implemented: a shared progress branch/concurrency group avoids
divergent producer PRs; checkpoint restore imports data onto current base scripts;
zero-job plans still publish restored/migrated evidence without spending a batch;
source-update PRs sync coverage; and Git report reads allow up to 16 MiB so a full
867-skill checkpoint is not limited by the default 1 MiB subprocess buffer.

Do not replace committed scores until the scripts, consumers and CI can handle
v3. Tasks and explicit acceptance criteria are in [todo.md](todo.md).

## Release verification

- Migration retains all 867 saved Open JEV score payloads and their provenance
  from PR #47; final coverage is 867 evaluated, zero pending and zero legacy failures.
- Fixtures cover old/new reports, invalid metadata, duplicate IDs, exact dimensions,
  changed pins/paths/fingerprints, missing report, stale/retired skills, null means,
  malformed responses and partial/no-success evaluation batches.
- Resume tests cover both standalone-v1 and canonical-v3 progress checkpoints,
  batch accounting and base changes. Old provider results never satisfy Open JEV
  cache lookup, and legacy commands cannot overwrite canonical scores.
- Check and sync run offline; repeated sync is byte-identical. Repository means
  and contributing skill IDs contain only current Open JEV evaluations.
- Site score details, filters, sorting, repository view and empty/stale states use
  Open JEV. Compiler output is deterministic and manifest compatibility is explicit.
- Run focused tests and all Node tests; schema negative fixtures; canonical score,
  catalog and quality checks; the CI Python tests; fixed-revision compile-twice,
  manifest and Pages verification; and `git diff --check`.

## Risks

The completed remote report resolves the initial local coverage gap. All 867
entries must match current catalog pins and evaluator identity before import.
Retaining previous-provider scores as fallback is outside this plan. Old strict schema consumers require the
v3 contract. A format-only migration must preserve evaluator fingerprints to avoid
needless reevaluation. Existing bulk branches and concurrent producers require
explicit migration and conflict handling rather than blind report replacement.
