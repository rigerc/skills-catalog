# Skills manifest v1: contract and publication

Status: **locked for implementation** under the revised `tasks/plan.md`. This supersedes the former "all catalog data in one manifest" design. Source of truth remains the existing canonical `data/` files.

## Published, coherent three-file cohort

The generated **skills-only** `data/manifest.json` is published together with the existing `data/mappings.json` and `data/technology-detection-rules.json`. The manifest has no technologies, combinations, rules, `frontend`, `recommended_for`, or legacy attribution. These remain in their canonical files or are retired. The manifest is a **deployment artifact**, never committed to `main`, because concurrent bot PRs would conflict and bot-created PRs do not trigger the normal PR validation workflow.

GitHub Pages is the publishing surface: `https://rigerc.github.io/skills-catalog/data/`. A single Pages deployment assembles the cohort after each relevant `main` push, with the manifest carrying the **build's exact 40-hex `source_commit`**. `integrity.mappings` and `integrity.rules` are SHA-256 hashes of the published files' **exact bytes**, not JSON reserialization; Nosey rejects mixed/partial deploys. Previous legacy files stay available for older Nosey installations and the website. The consumer uses conditional HTTP requests and does not resolve GitHub HEAD.

`scripts/manifest.mjs --write` generates the temporary artifact for Pages; `--check` generates and validates from the current sources **without a committed-file byte comparison**; `--validate` validates an existing generated manifest or an in-memory candidate without writing. Both code paths must work offline.

## Manifest shape

Required top-level keys:

- `manifest_version: 1`, `catalog_id`, `generated_at` (UTC ISO timestamp from the source data, deterministic across unchanged inputs), `source_commit` (exact immutable 40-hex Git SHA from the Pages build).
- `counts`: `skills`, `repositories`, and `score` / `quality` / `meta` state counts. Each assessment's state counts add up to the catalog skill count.
- `integrity`: `mappings` and `rules`, each a lowercase SHA-256 hexadecimal digest of the corresponding published JSON.
- `skills[]`: sorted by exact canonical `id`. Each item has `id`, `repository`, `skill_name`, `source`, `meta`, `score`, `quality`. Do not include a redundant `recommended_for`, unpinned `skill_md_url`, or `source_research` as a top-level field.
- `repositories[]`: sorted by exact repository name, one aggregate per repository in `skills`.

Each `skills[]` record:

| Key | Mandatory contract |
| --- | --- |
| `source` | `{state, url, commit, checked_at, selection_reason, reason}`, state `verified\|unresolved`. Verified has an immutable GitHub `SKILL.md` URL and commit; unresolved has null URL/commit/check date and a human-readable reason. No source is inferred. |
| `meta` | `{state, name, description, license, compatibility, read_at_commit, research}`. State `current\|stale\|pending\|unresolved`; absent frontmatter fields are null. Research copies the optional `source_research` object (8 source entries); it is provenance, **not** proof of security. Metadata can be pending while research is available. |
| `score` | `{state, overall, criteria, result_kind, model, evaluated_at}`. State `current\|stale\|pending\|not_evaluated\|unresolved`. `criteria` is either null or five numeric 1–5 fields: `trigger_clarity`, `instruction_quality`, `correctness`, `safety`, `context_efficiency`. No Jev legends or probability arrays, provider usage, costs or invented composite values. |
| `quality` | `{state, status, counts, findings, findings_truncated, validator_version, evaluated_at, metrics}`. Same effective state enum as scores. `status` is `pass\|warn\|fail\|not_evaluated` or null; `counts` are exact source errors/warnings/infos or null; `findings` is a list of at most 5 source findings or null when unavailable; `findings_truncated` is a **boolean**, set for source truncation **or** when the manifest caps findings; `metrics` carries token totals and contamination level when present. Quality has no overall score. |

A missing assessment is **never numeric zero**; unavailable numbers and verdicts are null. The state is always present even if the value is missing. Stale values may be shown as historical in an evidence view but **never** included in current repository averages. The score and quality results are informational; no impact on ranking, selection, eligibility, or installation.

## Exact join and freshness

Use canonical skill `id` as the only join key. Ledger covers every catalog skill; no fuzzy name/repository matching. Source coordinates come from the verified ledger's immutable URL (use the existing `sourceCoordinates` parser).

- Effective state precedence: unresolved ledger -> `unresolved`; missing entry -> `pending`; incompatible pin or fingerprint -> `stale`; matching result without a verdict -> `not_evaluated`; matching evaluated result -> `current`.
- **Score:** require equality of ledger URL and commit with score entry's source and equality of score entry `fingerprint` with the current `scores.evaluator.fingerprint`. For Jev, `score = native_score + 1`, probabilities total to 1 within 0.001, and `overall_score` equals the unrounded mean of five criteria within 1e-10; prose results use their documented two-decimal mean.
- **Quality:** source repository (GitHub case-insensitive), exact file path and commit must match the ledger, as must `fingerprint = quality.tool.config_sha256`. `tree_sha` alone does not establish freshness. Status derives from counts (`fail` for errors; `warn` for warnings, otherwise `pass`), and counts match source findings, respecting upstream truncation.
- **Metadata:** `read_at_commit` equals the ledger commit for current; a repin makes earlier metadata stale. Empty or missing frontmatter fields remain null. Metadata extraction is a later task and partial coverage is valid.
- Do not add `agentic-source-attribution.json`: it describes an older, retired bundle. The revised plan verifies no direct `old_id` joins to the current 867-skill catalog. The verified ledger supplies source provenance.
- Exact ID joins must survive repository aliases such as `affaan-m/everything-claude-code` versus `affaan-m/ECC`. Add fixtures for this.

Orphan results (score/quality/metadata not in catalog) are excluded from `skills[]` and repository scoring. Existing producer checks detect/report orphan rows rather than guessing a mapping.

## Numeric and text constraints

- `meta.description`: at most **300 Unicode code points**; `quality.findings`: first **5** source findings; `quality.findings[].message`: at most **200 Unicode code points**. Strip control characters and normalize untrusted text; Nosey additionally applies `clean()` when rendering. Do not invent descriptions when backfill is missing.
- `repositories[]`: `{repository, total, evaluated, overall_score, criterion_scores}` for **every** catalog repository, including those with zero current evaluated entries. `overall_score` and each criterion mean are null when evaluated = 0. Compute equal-weight, catalog-wide arithmetic means from **only current evaluated skills**, without intermediate rounding. Filtering/grouping/selection in Nosey cannot alter them.
- Manifest target **under 1 MB** (prototype about 720 KB), hard per-file fetch cap **4 MiB**. Preserve source numeric precision. Missing or incomplete score coverage is valid.

## Decisions and consumer invariants

- **Publication:** Pages deployment, with hash-coherent three-file cohort; not a committed manifest or a pinned manifest branch.
- **Plausibility guard:** a skill-count decrease **strictly greater than 25%** compared with the resident Nosey catalog rejects the candidate, retains the resident/cache fallback, and shows a notice. This protects accidental drops, but must be explicitly accounted for during the deliberate 2,601 -> 867 migration.
- **Scan JSON:** include `description` (null if unavailable) and `assessments` by default. Existing fields, exit codes and `schema_version: 1` remain unchanged.
- **Fallback:** fresh -> current cache -> previous cache -> bundled. Bundle is reviewed and refreshed through a scheduled PR, with offline tests and build. Source install refs remain commit-pinned.
- **Quality messaging:** "Checks passed", "Checks: warnings", "Checks: errors found", or "Not checked". These are mostly `SKILL.md` frontmatter and format/specification checks, not a security, safety, or usefulness certification.

## Verification

Validate against `schemas/scores.schema.json`, `schemas/quality.schema.json`, `schemas/catalog-source-ledger.schema.json`, existing semantic checks, and new manifest schema/fixture tests. Generate the manifest locally without network; test hash coherence against the two published companion files in a Pages assemble dry run. Keep existing legacy files for older clients.
