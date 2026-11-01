# Skill quality results

`data/quality.json` (schema: `schemas/quality.schema.json`) records offline
[skill-validator](https://github.com/agent-ecosystem/skill-validator) results for every
verified, commit-pinned skill. It is generated; do not edit it by hand.

## What runs

`structure`, `content` and `contamination` checks, per skill, on the **full skill directory**
at the pinned commit (every tracked nested file, including custom directories, not a curated list). The checkout excludes unrelated sibling skill directories. Git submodules and LFS payloads are not recursively hydrated or executed. Not run: `links`
(live HTTP, non-deterministic, spends network quota) and LLM scoring. An optional,
separate LLM review script is described below.

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

## LLM evaluation

`scripts/evaluate-skills.mjs` reviews every skill in `data/catalog.json`, using the
verified, commit-pinned `SKILL.md` URL in `data/catalog-source-ledger.json`. It uses
Node.js 22+; prose providers need no packages, and Jev uses an optional package.
The default provider is OpenAI, using
[`gpt-6-luna`](https://developers.openai.com/api/docs/models/gpt-6-luna) with
[`medium` reasoning effort](https://developers.openai.com/api/docs/guides/reasoning).
OpenAI requests use the Responses API and strict
[Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses).

Set `OPENAI_API_KEY` in your environment, then run:

```sh
# Offline plan: no credentials, network requests, or file writes.
npm run evaluate:skills -- --dry-run

# Start with a sample.
npm run evaluate:skills -- --limit 10

# Evaluate all remaining skills, resuming successful reviews automatically.
npm run evaluate:skills

# Explicit model configuration and selected skills.
node scripts/evaluate-skills.mjs --provider openai --model gpt-6-luna \
  --reasoning-effort medium --ids addyosmani/web-quality-skills/accessibility

# OpenRouter: set OPENROUTER_API_KEY. Defaults to openai/gpt-6-luna.
npm run evaluate:skills -- --provider openrouter --limit 10 \
  --output results/openrouter-evaluations.json

# OpenCode: free DeepSeek V4.1 Flash through the installed OpenCode 2+ CLI.
# No evaluation API key is needed for this route. "opencode" is also accepted.
npm run evaluate:skills -- --provider opencode-go --limit 10 \
  --output results/opencode-free-evaluations.json

# Optional Go subscription API: set OPENCODE_GO_API_KEY (or OPENCODE_API_KEY).
# Requires explicitly choosing a subscription model instead of the free default.
npm run evaluate:skills -- --provider opencode-go --model deepseek-v4.1-flash \
  --limit 10 --output results/opencode-go-evaluations.json
```

OpenRouter uses its [Chat Completions API with Structured Outputs](https://openrouter.ai/docs/guides/features/structured-outputs)
and requires routes that support the supplied parameters. Specify another supported
model with its full OpenRouter ID via `--model`. Its default reasoning effort is medium.

OpenCode defaults to `deepseek-v4.1-flash-free`. The [OpenCode inference documentation](https://opencode.ai/v2/docs/console/api/inference/#authentication)
restricts free chat models to OpenCode itself; third-party API clients receive HTTP 403.
The script therefore invokes the real OpenCode CLI for free models. It does not spoof
the client, substitute the subscription model, or fall back to a paid route. The free
offer is [time-limited](https://opencode.ai/v2/docs/console/models/#free-models) and subject
to OpenCode availability and limits. Install OpenCode 2+ first; `--opencode-bin` changes
the executable path.

Each CLI review runs in a temporary directory with separate configuration/data/cache
directories, a dedicated agent, all tool permissions denied, one agent step, and sharing
disabled. The source document is attached as data. The temporary files are removed
afterward. CLI JSON event output must include a completed response; text is validated
against the same evaluation schema. The CLI route requests JSON through the prompt,
rather than server-enforced Structured Outputs, and does not automatically retry failures.

An explicit non-free model uses the [Go subscription API](https://opencode.ai/v2/docs/console/go/#endpoints)
with `OPENCODE_GO_API_KEY`, falling back to `OPENCODE_API_KEY` only when that variable
is absent. The Go adapter uses Chat Completions JSON-object mode and validates the
schema locally. DeepSeek reasoning maps `none` to disabled thinking, `low` to low,
`medium`/`high`/`xhigh` to high, and `max` to max, following its
[native reasoning controls](https://api-docs.deepseek.com/guides/thinking_mode/).
The effective DeepSeek effort and transport are recorded in the evaluator configuration.

This sends each downloaded document to the selected provider and consumes its usage
allowance or incurs API charges, except for available free models. Source downloads
use raw GitHub URLs rather than the GitHub REST/GraphQL APIs. Source documents are
treated as untrusted text and their commands are never executed. Only `SKILL.md`
is supplied: supporting references, scripts, assets, and runtime behavior are not
evaluated. Reviews are subjective and may vary between runs.

Each prose review scores trigger clarity, instruction quality, correctness, safety, and
context efficiency from 1–5, with a reason for each score, an arithmetic mean,
strengths, improvements, and limitations. These judgments are separate from the
offline validator results and do not certify security or factual correctness.

Results default to [`data/scores.json`](../data/scores.json), with the versioned
contract in [`schemas/scores.schema.json`](../schemas/scores.schema.json).
`--output` selects an alternate file with the same report format. Results include
source URL/commit, content hash, evaluator fingerprint, returned model/response ID,
token usage, and catalog-wide coverage. Successful results are reused only when
the source pin, model, reasoning effort, rubric, schema, and output-token budget
match. Errors are retried on the next run. `--force` refreshes cached reviews;
`--limit` caps pending attempts, and `--ids` selects canonical catalog IDs.
Use separate output files to retain reviews from multiple models.

The default file is maintained incrementally: each attempt is atomically checkpointed,
successful matching scores are reused, and retired catalog entries are removed when
the report is refreshed. If `data/scores.json` is missing, the script imports the old
`results/llm-evaluations.json` report when present, retaining its scores and provenance.
The legacy file is left intact. Coverage may be incomplete; missing results are never
filled with fabricated scores.

Maintain or check the saved artifact without credentials or network access:

```sh
# Initialize the file, migrate legacy results, or refresh coverage after catalog edits.
npm run sync:scores

# Check fingerprints, score means, distributions, ordering, and summary consistency.
npm run check:scores

# Validate the full JSON Schema contract, including scores.json.
npm run validate:schemas -- --self-test
```

`--sync` preserves the saved evaluator and score values, updates coverage, and prunes
retired IDs. `--check` reports current coverage without requiring full coverage or
forcing old score snapshots to match new source pins. Neither command calls an API
or loads the optional Jev client. Unchanged reports retain their timestamp and are
not rewritten. Evaluation options such as `--provider` and `--limit` apply to live
evaluation rather than these maintenance commands. CI runs schema and semantic checks.

### Jev score evaluation

Jev returns typed scores and probability distributions. It evaluates the same five
dimensions without writing reasons, summaries, strengths, or recommendations.
Install its pinned optional client (version `0.1.1`) with:

```sh
npm install --ignore-scripts --no-package-lock --include=optional
```

The client is loaded only for live Jev evaluation. Existing providers and every
`--dry-run` work without it. Select the Jev endpoint independently of the chat provider:

```sh
# Direct TypeSafe: set TYPESAFE_API_KEY. Default model: jev-1.14.0.
npm run evaluate:skills -- --provider jev --limit 10 \
  --output results/jev-evaluations.json

# OpenRouter: set OPENROUTER_API_KEY. Default model: typesafe/jev-1.14.
# This route has paid input and free output.
npm run evaluate:skills -- --provider jev --jev-endpoint openrouter --limit 10 \
  --output results/jev-openrouter-evaluations.json

# OpenCode Console: set OPENCODE_API_KEY. Default model: jev-1.13-free.
npm run evaluate:skills -- --provider jev --jev-endpoint opencode-go --limit 10 \
  --output results/jev-opencode-free-evaluations.json

# Plan the entire catalog offline, without a key or the optional client.
npm run evaluate:skills -- --provider jev --jev-endpoint opencode-go --dry-run
```

Remove `--limit 10` to process all remaining skills. Each endpoint reads only its
documented key variable; there is no fallback to another endpoint's credential.
`--jev-endpoint` applies to `--provider jev`. The existing
`--provider opencode-go` continues to select the DeepSeek chat evaluator.

TypeSafe uses its [System One endpoint](https://docs.typesafe.ai/api/system-one).
OpenRouter uses its [compatible System One endpoint](https://openrouter.ai/docs/guides/community/typesafe-sdk),
`https://openrouter.ai/api/v1/systemone`. OpenCode uses its documented
[Jev endpoint](https://opencode.ai/v2/docs/console/models/#jev),
`https://opencode.ai/inference/systemone/v1/systemone`, with the limited-time free
`jev-1.13-free` model. Although the selector is named `opencode-go`, this Jev route
belongs to OpenCode Console. It uses the typed HTTP API and requires no OpenCode CLI.
Paid Jev model overrides are rejected for that route; access or quota failures never
switch it to paid Jev or OpenRouter.

One request contains the document and five independently described, five-level
[Score questions](https://docs.typesafe.ai/primitives/score). Native fractional
scores range from 0–4; the report preserves them as `native_score` and exposes
`score = native_score + 1` on a 1–5 scale. The overall score is the equal-weight
mean, with rounding only in console output. Per-level probabilities, matching
legends, and optional confidence are preserved. Probability totals must be within
`0.001` of one. These distributions describe Jev's judgment, not verified correctness.

Jev results use `result_kind: "jev_scores"`, while chat results use
`result_kind: "prose_review"`. Reports now write `schema_version: 2`. Version 1
prose reports are read and migrated in memory without changing their successful
cache fingerprints; dry runs never persist migration. Jev cache identity includes
the endpoint, requested model, client/adapter versions, complete questions, score
transformation, and validation configuration. Explicitly using a moving alias such
as `jev-latest` requires `--force` when you want fresh results after an upstream change.

The package redacts state before sending it. Reports retain the downloaded document
hash, `original_state_sha256`, and `submitted_state_sha256` so the source and submitted
content are distinguishable. Reports never store the source text or request body.
The returned model, endpoint, request ID, and usage/cost are recorded when available;
missing metadata stays unknown, and a real reported zero cost is preserved.

An upstream `source: "fallback"`, malformed distribution, or missing rubric answer
is `not_evaluated`. HTTP authentication/credit/model errors and exhausted rate limits
stop dispatch while preserving checkpoints. HTTP 529 overloads use the normal retry
policy. Document/context limits fail only the affected skill without truncating it
or enabling long context automatically. A byte limit does not guarantee that a
document fits the model's token context.

Jev does not accept chat `--reasoning-effort` or `--max-output-tokens` options;
explicitly passing either is an error. The normal source/concurrency/timeout/retry
options still apply. All Jev tests use fixtures or injected HTTP responses; no live
Jev evaluation or paid API call is needed for verification.

The report is atomically checkpointed after each attempt. Missing/unresolved sources,
oversized documents, refusals, incomplete responses, and malformed output are recorded
as `not_evaluated`, never as successful reviews. Coverage distinguishes evaluated,
failed, pending, stale, and unresolved skills. Selected runs retain other saved entries.

Defaults are two concurrent skills, one second between request starts, three retries
for provider HTTP 429/5xx, a 180-second provider request/CLI timeout, 8,192 output tokens
(including reasoning), and a 200,000-byte source limit. `--help` lists overrides.
Oversized documents are skipped rather than truncated. Authentication/configuration
errors and exhausted rate limits stop new requests and preserve progress. Retry-After
delays longer than 60 seconds also stop the run. Network timeouts are recorded without
automatically repeating potentially billed requests; rerunning retries them.

Exit codes: `0` for a successful run or offline plan, `1` for configuration/report errors,
`2` for a stopped run or a report containing failed/unresolved skills. Pending skills
from an intentional `--limit` or `--ids` selection do not cause an error. This script
does not run automatically in CI or change the canonical quality data.
