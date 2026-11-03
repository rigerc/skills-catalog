# Open JEV replacement tasks

Status: implemented and verified offline. Design: [plan.md](plan.md).
Open JEV replaces the existing scores and owns the canonical evaluation pipeline.

## Task 1: Define canonical Open JEV v3 and offline migration

Adapt Open JEV results to the main report layout and implement strict validation,
coverage, repository aggregates and explicit standalone-v1 import.

**Acceptance criteria:**
- [x] Canonical v3 accepts only Open JEV results; conversion preserves saved values, provenance and inference fingerprint without inventing missing fields.
- [x] Freshness checks and coverage/means handle pending, unresolved, stale and retired skills; invalid identities, dimensions, metadata and duplicate IDs fail.
- [x] Offline migration is atomic and repeatable; the completed remote report produces 867 evaluated and zero pending for the current catalog.

**Verification:** `node --test tests/scores.test.mjs tests/open-jev-pipeline.test.mjs`;
add migration fixtures and invalid/empty/stale/aggregate cases.
**Dependencies:** None. **Scope:** Medium.
**Likely files:** `schemas/scores.schema.json`, `scripts/open-jev-lib.mjs`,
`scripts/open-jev-normalize.mjs`, `scripts/open-jev-merge.mjs`, `tests/scores.test.mjs`.
Split pure report helpers into a module if necessary; keep task changes focused.

## Task 2: Give Open JEV ownership of canonical commands

Move planner/checker/progress reads to canonical scores; route package commands to
Open JEV and isolate the old evaluator's alternate-output support.

**Acceptance criteria:**
- [x] `sync:scores` and `check:scores` maintain/check v3 offline with no-op byte stability; planner and bulk accounting use current Open JEV entries.
- [x] `evaluate:skills` defaults to the Open JEV plan/workflow route and documents how inference runs; it never defaults to the old provider.
- [x] Every legacy write path requires an explicit noncanonical output and rejects the canonical path; automatic legacy canonical import is removed.

**Verification:** Focused score/provider/planner/bulk tests; test command routing,
missing inputs, custom output isolation, forbidden canonical writes and offline behavior.
**Dependencies:** Task 1. **Scope:** Two focused subtasks.
**2a likely files:** `scripts/open-jev-plan.mjs`, `scripts/open-jev-check.mjs`,
`scripts/open-jev-bulk-status.mjs`, `scripts/open-jev-lib.mjs`, `tests/open-jev-bulk.test.mjs`.
**2b likely files:** `package.json`, `scripts/evaluate-skills.mjs`,
`tests/evaluate-skills.test.mjs`, `tests/scores.test.mjs`.

## Checkpoint: Canonical pipeline

- [x] Canonical commands operate on v3 fixtures and preserve the existing Open JEV cache.
- [x] Old-provider commands cannot replace production scores.

## Task 3: Update incremental and bulk evaluation CI

Write canonical scores directly, migrate resumable progress, and update main CI.

**Acceptance criteria:**
- [x] Both producer workflows plan/merge/check/commit `data/scores.json`; old progress branches import standalone v1 without losing batch accounting.
- [x] Partial success, no-progress stop, existing batch/concurrency limits and PR review remain; stale bases and concurrent writers cannot silently lose results.
- [x] Catalog CI validates v3, negative fixtures, semantic/aggregate parity and no-op sync, and rejects legacy canonical data.

**Verification:** `node --test tests/open-jev-pipeline.test.mjs tests/open-jev-bulk.test.mjs`;
add old/new checkpoint and concurrent/base-change fixtures; inspect all workflow
restore paths, commit allowlists and PR text without dispatching live workflows.
**Dependencies:** Task 2. **Scope:** Two focused subtasks.
**3a likely files:** `.github/workflows/nosey-open-jev.yml`,
`.github/workflows/nosey-open-jev-bulk.yml`, `tests/open-jev-pipeline.test.mjs`,
`tests/open-jev-bulk.test.mjs`.
**3b likely files:** `.github/workflows/nosey-catalog.yml`,
`scripts/validate-schemas.mjs`, `tests/scores.test.mjs`.

## Task 4: Use Open JEV as the main score everywhere

Adapt the compiler and existing UI to canonical Open JEV entries, and remove the
independent experimental input path while preserving the manifest compatibility alias.

**Acceptance criteria:**
- [x] Skill/repository score displays, filters and sorting use Open JEV; dates, confidence, excerpt limitations and empty/stale states work without prose.
- [x] Manifest `evaluation` uses Open JEV; `open_jev` is retained as a deprecated alias from the same entry in manifest v1.1, preserving existing consumers.
- [x] Repository aggregates, Pages URL, deterministic compilation and static quality eligibility remain correct; no unsupported calibration claim is introduced.

**Verification:** Behavioral consumer fixtures, `node --test tests/scores.test.mjs tests/stage-pages.test.mjs`,
fixed-revision compile-twice, manifest validation and Pages staging.
**Dependencies:** Tasks 1–2. **Scope:** Two focused subtasks.
**4a likely files:** `scripts/compile-catalog.mjs`, `schemas/manifest.schema.json`,
`scripts/check-manifest.mjs`, focused manifest tests.
**4b likely files:** `site/index.html`, `tests/stage-pages.test.mjs`,
focused score-presentation tests if needed.

## Checkpoint: Ready to replace data

- [x] Producers, consumers and CI understand the same v3 contract.
- [x] Resume migration and manifest compatibility have explicit test coverage.

## Task 5: Replace committed scores and retire the standalone report

Run the offline migration after code changes are ready and remove obsolete runtime
artifacts. Previous primary scores remain recoverable in Git history.

**Acceptance criteria:**
- [x] `data/scores.json` contains all 867 Open JEV evaluations from PR #47 with recalculated coverage/means, replacing all prior-provider results.
- [x] `data/open-jev-scores.json` and its obsolete standalone schema are removed; only intentional compatibility import code and migration fixtures/docs reference the old path.
- [x] Repeated canonical sync is byte-identical and canonical checks/schema validation pass.

**Verification:** Compare all imported scores/provenance against the PR #47 migration input;
run `npm run sync:scores` twice, `npm run check:scores`, schema validation and
`rg -n 'open-jev-scores\.json' scripts tests schemas .github docs package.json site`.
**Dependencies:** Tasks 3–4. **Scope:** Medium.
**Likely files:** `data/scores.json`, `data/open-jev-scores.json` (delete),
`schemas/open-jev-scores.schema.json` (delete), migration fixtures/tests.

## Task 6: Document and verify the replacement

Update evaluator usage, canonical schema, workflow ownership, primary score policy,
coverage expectations and legacy alternate-output instructions.

**Acceptance criteria:**
- [x] Documentation describes Open JEV as the main evaluator and explains excerpt scope, actual coverage and resumable evaluation commands.
- [x] No production documentation or workflow still describes a separate experimental score input or the old evaluator as canonical.
- [x] Required offline tests/checks pass and final diff contains only the intended replacement.

**Verification:**
```sh
node --test tests/*.test.mjs
python3 -m unittest discover -s tests -p 'test_detection_patterns.py' -v
npm run validate:schemas -- --self-test --skip-unmapped
npm run check:scores
node scripts/catalog.mjs --check
node scripts/quality.mjs --check
git diff --check
```
Also run the catalog workflow's fixed-revision compile-twice comparison, manifest
verification and Pages staging checks in temporary output directories. Verify
`evaluate:skills` planning and score maintenance require no credentials or network.
**Dependencies:** Task 5. **Scope:** Medium.
**Likely files:** `docs/quality.md`, generated documentation source
`scripts/catalog.mjs` if links/text change, `README.md` via its generator,
`tasks/plan.md`, `tasks/todo.md`.

## Checkpoint: Complete

- [x] Open JEV is the sole canonical score source across scripts, CI, UI and manifest.
- [x] All acceptance criteria and verification results are recorded; changes are ready for review.

## Verification results (2026-11-03)

- 131 Node tests passed on both the local runtime and CI's Node 22.23.4 runtime.
- Three Python detection-pattern tests passed.
- Canonical schema validation and negative fixtures passed; score checks passed.
- Initial eight-entry migration: two sync runs were byte-identical and all
  imported score payloads/provenance matched the original standalone input.
- Catalog/generated docs, unmapped index, quality invariants and duplicate checks passed.
- Fixed-revision compilation produced identical manifests twice; manifest checks
  and Pages staging/verification passed, with 593 quality-eligible skills unchanged.
- Actionlint, YAML parsing and embedded shell syntax checks passed for all four
  changed workflows. The scoped UI detector returned no findings.
- Consumer tests cover primary scores, confidence/scope copy, filtering/sorting,
  stale/empty states, manifest aliases, old/new checkpoint imports and Git report
  output larger than 1 MiB. Legacy-output protection includes a symlink alias.
- No live evaluation, workflow dispatch, paid inference or deployment was performed.

## Completed remote report import (2026-11-03)

Imported [PR #47](https://github.com/rigerc/skills-catalog/pull/47) at commit
`e54886ce3e678a922ca0aa196c04de8a1dfd3184` through the checkpoint migration path.
All 867 entries match current source pins and evaluator identity; coverage is now
867 evaluated, zero pending/stale/unresolved. The completed 14-batch progress ledger
is preserved. No new inference was run.

Follow-up verification: all 867 canonical entries, provenance, coverage and repository
means match the completed PR #47 report after conversion. Canonical checks, schema
negative fixtures and no-op sync passed. All 131 Node tests passed on both runtimes;
the empty-state test no longer assumes the production catalog contains an unscored
skill. Deterministic full-report manifest compilation and Pages validation passed;
the planner selects zero remaining skills.
