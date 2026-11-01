# Manifest v1 contract (Task 1)

Status: **locked for implementation**. Producer: `rigerc/skills-catalog`; consumer: `rigerc/nosey-6`. This contract consolidates the canonical catalog, mappings, detection rules, source ledger, score reviews, quality checks, and optional skill frontmatter. It does **not** change recommendation logic.

## Artifact and compatibility

- Generated artifact: `data/manifest.json`, versioned by `schemas/manifest.schema.json`. `manifest_version: 1` is independent of the versions of its input files.
- One immutable snapshot of the source data. Generate deterministically: sort skills by exact canonical ID; repositories by repository; preserve canonical mappings/rules order where order has meaning; avoid a wall-clock timestamp that changes between identical builds. `generated_at` is an ISO UTC source-update timestamp, not the time the generator happens to run.
- `catalog_id` must agree among catalog, mappings, rules, scores, and quality. Ledger has no `catalog_id`. Inputs must pass their existing schema and semantic checks.
- The manifest does **not** contain its own Git commit. Nosey records the resolved catalog `main` SHA separately, from the same ref used to retrieve the manifest. Source install refs remain immutable per-skill commits.
- Maximum manifest fetch size: **4 MiB**, measured as UTF-8 bytes; target near 1 MiB. A serialized cache slot must also fit its separate existing limit. Source JSON documents remain published for legacy clients.

## Top-level fields

Required: `manifest_version` (integer, exactly 1), `catalog_id` (nonempty string), `generated_at` (UTC ISO timestamp), `catalog`, `skills`, `technologies`, `combinations`, `rules`, `frontend`, `repositories`, `integrity`.

- `catalog`: `snapshot_date`, `source`, `remote_availability`, `notes`, `counts` (the canonical catalog and mapping counts), `repository_aliases`, `detection_coverage_note`, `coverage`. The `coverage` object has `score` and `quality` maps with exactly `current/stale/pending/not_evaluated/unresolved` counts, a `meta` map with `current/stale/pending/unresolved` counts, and `orphans` with `score/quality/meta/attribution` counts. Each non-orphan state map sums to catalog skill count.
- `technologies[]`, `combinations[]`, `rules[]`: preserve canonical records verbatim from `mappings.json` and `technology-detection-rules.json`, respectively; **do not** infer, reorder recommendations, or simplify detection evidence.
- `frontend`: `frontend_essentials` and `mcp_scan_context` from mappings, and `detection_policy` from rules. Preserve their original contents without rewriting matching behavior.
- `integrity.canonical_sources`: SHA-256 (lowercase hexadecimal, UTF-8 file bytes) per input JSON under `data/` used for generation, including optional metadata when present. `integrity.sections`: SHA-256 of `JSON.stringify(section)` for each of `catalog`, `skills`, `technologies`, `combinations`, `rules`, `frontend`, `repositories`. Consumers can verify section hashes *from the manifest alone*; canonical-file hashes are provenance, **not** independently verifiable without the originals.

## Every skill

Each `skills[]` item preserves `id`, `repository`, `skill_name`, `skill_md_url`, `recommended_for`, `source_research` (`null` when absent). The canonical ID is exactly `repository/skill_name`; no duplicate IDs and no ledger entries missing for catalog skills.

The following fields are **always present**:

| Field | Shape and null policy |
| --- | --- |
| `source` | `{state, url, commit, checked_at, selection_reason, reason}`. State `verified` or `unresolved`. Verified has a real immutable GitHub SKILL.md URL and commit, checked date; unresolved has `url: null`, `commit: null`, `checked_at: null`, and the ledger reason. `selection_reason` is nullable. |
| `attribution` | `null`, or `{original_repository, credit_url}` from `agentic-source-attribution.json`. No guessed original source. An unresolved credit is **not** a verified original source. Join only by an exact original pinned URL (repository + commit + SKILL.md path) or exact canonical ID; unmatchable legacy `old_id` entries remain orphans, never assigned by name similarity. As of the examined snapshot, only 3 of 91 resolved credit entries match the current ledger URL; this is a coverage limitation, not a reason to synthesize matches. |
| `meta` | `{state, name, description, license, compatibility, source_commit, read_at}`. State `current\|stale\|pending\|unresolved`; each unavailable value is `null`. A missing frontmatter field is `null`, never derived from the directory name. |
| `score` | `{state, overall, criteria, result_kind, model, evaluated_at, source_commit, fingerprint}`. State `current\|stale\|pending\|not_evaluated\|unresolved`. `criteria` contains exactly `trigger_clarity`, `instruction_quality`, `correctness`, `safety`, `context_efficiency`, each on the 1–5 scale. Unavailable numeric fields and criteria are `null`, **never 0**. A stale review may retain historical values but must be visibly labeled stale. |
| `quality` | `{state, status, counts, findings, truncated, upstream_truncated, metrics, validator_version, evaluated_at, source_commit, fingerprint, not_evaluated_reason}`. Same state enum as score; `status` is `pass\|warn\|fail\|not_evaluated` or `null`. `counts` are exact source `errors/warnings/infos`; `findings` are capped, sanitized source findings, or `null` if no verdict. `metrics` includes `tokens.total`, `contamination.level`, and `contamination.score` when present. `not_evaluated_reason` is only present for a source non-evaluation, otherwise `null`. |

The `quality.truncated` integer counts findings omitted *from the published input findings*; `upstream_truncated` separately records the source `findings_truncated` flag. Never imply that the truncated total is exhaustive when upstream already omitted findings.

## State and freshness rules

Join by **exact canonical skill ID**, never by repository name, skill name, file path alone, or an approximate URL. Derive immutable `repository`/`path` coordinates from the **verified ledger URL** using the existing `sourceCoordinates` parser. Orphan score/quality/metadata IDs never enter `skills[]` or repository averages; count them in `catalog.coverage` and, when unambiguously attributable, in the corresponding `repositories[].coverage`.

State precedence for each assessment: (1) unresolved ledger -> `unresolved`, (2) absent entry -> `pending`, (3) source or tool mismatch -> `stale`, (4) matching entry with no assessment -> `not_evaluated`, (5) matching valid verdict -> `current`.

- **Score:** source URL **and** commit must exactly match the ledger; entry fingerprint must equal `scores.evaluator.fingerprint`; result kind must be compatible with evaluator provider. Validate native Jev transformation `score = native_score + 1`, probability distribution total within 0.001 of 1, and overall mean of five criteria (Jev tolerance 1e-10; prose rounds to two decimals). Preserve raw numeric precision.
- **Quality:** source repository (case-normalized for GitHub), path and commit must match the ledger; `entry.fingerprint` must equal `quality.tool.config_sha256`, including tool version/checks/flags. A `tree_sha` match **alone** is not freshness. Validate counts against findings (equal when input complete; lower bound when source truncated), and `fail`/ `warn`/ `pass` against error/warning counts.
- **Metadata:** `source_commit` must equal ledger commit, otherwise stale. Missing backfill is pending. Missing frontmatter fields are null even when metadata itself is current.
- Matching `not_evaluated` entries remain not-evaluated, not a pass or zero score. Retryable quality failures remain eligible for upstream refresh and must display the cause.
- For stale score/quality, historical values are permissible in evidence view only with the explicit `stale` state. Never count them in averages or display as current.

## Size and text limits

- `description`: strip control characters, normalize whitespace, max **300 Unicode code points**; trim without inventing information.
- `quality.findings`: first **5** findings per skill, in source order. Each `message`: max **200 Unicode code points** after control-character stripping. Apply the same sanitization to other untrusted text (`name`, `license`, `compatibility`, `selection_reason`, attribution, quality file/category/reason). Nosey additionally calls `clean()` on display.
- Scores include **numbers only** for five criteria; omit Jev per-entry legends, probabilities, token usage, cost, and review prose. No scoring or validator network work occurs during manifest generation.

## Repository aggregates

`repositories[]`: one object per catalog repository, with `repository`, `coverage` and `score`. Coverage reports `total` (catalog skills), `score` and `quality` maps with exactly `current/stale/pending/not_evaluated/unresolved`, `meta` with exactly `current/stale/pending/unresolved`, and `orphans` with `score/quality/meta/attribution`. Where an orphan cannot be attributed to a catalog repository without inference, report it only at top-level. `score` contains `overall` and five `criteria` means, all `null` if zero current evaluated skills. For each mean, use **equal weight per currently evaluated catalog skill, without intermediate rounding**. Never import historic aggregate rows from `scores.json` as current. Filter, grouping and UI selection must not affect these catalog-wide totals.

## Resolved design choices

- Nosey acquisition skill-count plausibility guard: **reject a drop strictly greater than 25%** compared with its resident catalog; preserve last-good state, show a notice. A deliberate large contraction needs an explicit migration/release step.
- `scan --json` **includes descriptions by default**, with `null` where missing; keep `schema_version: 1` and all existing fields/exit codes.
- Description cap: **300** code points; finding cap: **5**; finding message cap: **200**.
- Scores, validator checks and metadata are **informational only**; no change to recommendation order, eligibility, selection or install plans. Validator status is *not* security certification. The source catalog is the latest on `main`; install refs are still pinned per skill.

## Validation and legacy safety

Producer must run existing canonical validations plus schema validation of manifest; enforce identical IDs/counts, valid source pins, correct state/value combinations, schema version, coverage and means, and section hashes. `--check` compares generated bytes without modification. `--write` updates generated data. `--validate` checks data and invariants without writing. No network is required. Keep original canonical JSON files published for older Nosey releases.
