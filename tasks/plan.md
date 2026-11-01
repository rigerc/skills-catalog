# Plan: Jev as a skill evaluator

Status: implemented and verified offline. See [todo.md](todo.md) for completed tasks and verification.

## Scope

Add `--provider jev` to `scripts/evaluate-skills.mjs`, using
`@aitofy/jev-awesome-skills` to evaluate the same pinned `SKILL.md` documents as
the existing providers. The user confirmed evaluator support, rather than importing
the upstream repository's skills into the catalog.

Keep the current OpenAI default. Reuse source verification, selection, concurrency,
request pacing, bounded reads, checkpointing, and resume behavior.

Also support Jev through OpenRouter using `typesafe/jev-1.14`, with paid input
and free output. The user authorized paid input for this route; no free-model
availability prerequisite applies.

Add an `opencode-go` Jev endpoint selector using OpenCode's limited-time free
`jev-1.13-free` model. Keep this route free; paid-input authorization applies to
the separately selected OpenRouter route.

## Findings and sources

Reviewed upstream HEAD `544f447cc1f2c1a9a967ce1368a3017be98efb20`.
Its [package manifest](https://github.com/aitofy-dev/jev-awesome-skills/blob/544f447cc1f2c1a9a967ce1368a3017be98efb20/package.json)
declares version `0.1.1`. Its public exports include `judge`, `buildRequest`, and
`decideFixture`. The [client](https://github.com/aitofy-dev/jev-awesome-skills/blob/544f447cc1f2c1a9a967ce1368a3017be98efb20/src/judge.ts)
reads `TYPESAFE_API_KEY`, calls `https://api.typesafe.ai/v1/systemone`, and returns
`ok: false, source: "fallback"` on missing credentials, transport failures, or
invalid answers. The [CLI](https://github.com/aitofy-dev/jev-awesome-skills/blob/544f447cc1f2c1a9a967ce1368a3017be98efb20/src/cli.ts)
exits successfully for these fallback judgments; exit status alone cannot establish success.

[TypeSafe's Score documentation](https://docs.typesafe.ai/primitives/score)
defines zero-based ordered levels, fractional scores, level probabilities, and
confidence. [Composite scoring](https://docs.typesafe.ai/patterns/composite-scoring)
supports evaluating dimensions separately and combining them in application code.
The existing prose schema requires integer scores and written reasons, so Jev
needs its own result type.

[Model documentation](https://docs.typesafe.ai/models) currently lists
`jev-1.14.0`, with a 32k per-question and 64k per-request context by default.
The package uses `jev-latest`; aliases can change, so use the versioned model
by default for reproducible saved results. Allow `--model` overrides and record
the requested and returned IDs.

### OpenRouter findings (2026-11-01)

The [OpenRouter Jev guide](https://openrouter.ai/docs/guides/community/jev)
documents the Decisions endpoint `POST https://openrouter.ai/api/alpha/decisions`.
Its [TypeSafe compatibility guide](https://openrouter.ai/docs/guides/community/typesafe-sdk)
also documents `POST https://openrouter.ai/api/v1/systemone`, which accepts the
same state/questions contract and is the planned endpoint for the existing
package's injected transport. Neither route is Chat Completions.

The [Jev 1.14 model page](https://openrouter.ai/typesafe/jev-1.14) lists
$0.042 per million input tokens and $0 output tokens. Live endpoint metadata for
`typesafe/jev-1.14` returned prompt pricing `0.000000042` dollars/token and
completion pricing `0`. This is the selected OpenRouter model. Record actual
usage and cost when returned; published prices are informational and can change.

The ordinary `/api/v1/models` response did not list these decision models, while
their per-model endpoint metadata was available. Use documented decision-model
discovery or `/api/v1/models/{author}/{slug}/endpoints` when checking availability
or pricing rather than inferring absence from the chat-oriented model list alone.

### OpenCode findings (2026-11-01)

The [OpenCode Jev documentation](https://opencode.ai/v2/docs/console/models/#jev)
lists `jev-1.13-free` at
`POST https://opencode.ai/inference/systemone/v1/systemone`, using an OpenCode
Console API key. It explicitly permits replacing `jev-1.13` with `jev-1.13-free`
for the limited-time free offer; the pricing table lists free input and output.

This is a Console System One route. The [Go subscription model list](https://opencode.ai/v2/docs/console/go/)
does not list Jev, so `opencode-go` is our endpoint selector name, not evidence
that Jev has a separate Go subscription endpoint. Do not invent a `/go/` URL.
The public model-list response inspected during planning omitted Jev; the
documented Jev endpoint is the source for its contract, with live access still
subject to authentication, availability, and quotas.

## Decisions

### Integration

- Add the exact package version as an optional dependency, after checking that
  the published `0.1.1` package contains the reviewed exports and built ESM files.
  Dynamically import it only for Jev. Existing providers must still work without it.
- Put the adapter and Jev-specific rubric in `scripts/jev-evaluator.mjs`.
  Use `judge` and its injectable transport rather than the CLI or a second Jev client.
  The injected transport supplies the evaluator's existing HTTP controls and captures
  metadata the package otherwise omits from its `Judgment` object.
- Read `TYPESAFE_API_KEY` for direct Jev, `OPENROUTER_API_KEY` for OpenRouter,
  and `OPENCODE_API_KEY` for OpenCode's Jev endpoint. Fail before downloading
  sources when the selected key is missing. Keep `--dry-run` offline,
  credential-free, and independent of the optional package.
- Use `jev-1.14.0` as the initial default, subject to verifying the current official
  contract when implementation starts. Do not send chat reasoning/output-token parameters.
  Reject explicit `--reasoning-effort` or `--max-output-tokens` for Jev with a useful
  explanation; inherited defaults from other providers must not cause an error.

### OpenRouter endpoint and model selection

- Add `--jev-endpoint typesafe|openrouter|opencode-go`, defaulting to `typesafe`, for
  `--provider jev`. Keep the existing OpenRouter chat provider behavior intact.
- For `openrouter`, send the same five-question Jev body to the fixed
  `https://openrouter.ai/api/v1/systemone` endpoint, using the package's injectable
  transport. The documented `/api/alpha/decisions` route is an alternative if
  compatibility testing requires it; any endpoint choice must be recorded and tested.
- Default to the full OpenRouter ID `typesafe/jev-1.14`. Keep the direct
  `jev-1.14.0` default scoped to TypeSafe and select defaults independently of
  CLI argument order. Allow an explicit `--model` override for another Jev version.
- Paid input is authorized. Do not require a zero-priced route, a `:free` suffix,
  or a free-only price cap. Do not silently substitute Jev Router, a chat model,
  another decision model, or the direct TypeSafe endpoint.
- Validate Jev model selection and preserve requested/returned IDs and real
  usage/cost metadata. Handle unavailable models and insufficient OpenRouter
  credit as clear errors while retaining completed checkpoints.
- Pass the selected OpenRouter key to `judge` through a scoped environment object
  and the overridden transport. Do not change process-wide environment variables,
  read the TypeSafe key as a fallback, or forward credentials to another host.
- A dry run describes the selected endpoint, model, and paid-input billing
  without fetching model metadata or opening a network connection.

### OpenCode free Jev endpoint

- Select it with `--provider jev --jev-endpoint opencode-go`. Default to
  `jev-1.13-free`, independently of argument order. Keep existing
  `--provider opencode-go` chat/DeepSeek behavior intact.
- Use the documented `https://opencode.ai/inference/systemone/v1/systemone`
  endpoint with the same five-question request and package-backed parsing through
  an injected transport. Do not use Chat Completions or the OpenCode chat CLI;
  Jev returns typed answers without generated prose.
- Authenticate with `OPENCODE_API_KEY`, the documented Console key variable.
  Pass it through a scoped `judge` environment and the OpenCode-only transport;
  do not read TypeSafe/OpenRouter credentials as fallback or mutate process-wide
  environment variables.
- Keep this endpoint on the free Jev model. Reject a paid `jev-1.13` override
  unless the user separately authorizes it. Never switch to paid Jev, OpenRouter,
  a subscription model, or another evaluator when free capacity is unavailable.
- Treat 401/403, exhausted quota/429, removed models, and expired free offers as
  explicit failures that preserve completed checkpoints. Do not spoof an OpenCode
  client identity to bypass access restrictions.
- Record the selected endpoint, free model ID, returned model, and available
  usage/cost metadata. Preserve actual reported zero cost, but do not synthesize
  zero when metadata is absent. Explain that the free offer is time-limited.
- Keep dry runs fully offline and add separate examples/output files for this route.

### Questions and scoring

- Make one request per skill with five `score` questions: trigger clarity,
  instruction quality, correctness, safety, and context efficiency.
- Give each question five concrete, independent level descriptions. Include the
  dimension in its instructions; question IDs alone do not communicate the rubric.
- Supply the pinned document and source identity in `state`. Treat document contents
  as untrusted data, with trusted evaluation instructions in the questions.
- Preserve native scores on 0–4 and their complete legends/probabilities. Expose
  `score = native_score + 1` on a fractional 1–5 display scale, without rounding the
  native value. Compute the equal-weight mean in code; rounding is presentation only.
- Do not generate reasons, strengths, improvements, or model-written summaries.
  Record a static limitation explaining that Jev provides scores without prose and
  only the document was assessed. Do not invoke a second model to supply feedback.

### Result contract and cache

- Introduce report schema version 2 with discriminated entry results: `prose_review`
  and `jev_scores`. Keep existing prose result fields intact. Add validation dispatch
  rather than weakening the existing strict prose validator.
- Load version 1 reports as prose reviews and preserve their cache fingerprints;
  migrate in memory and write version 2 only through normal checkpointing.
- A Jev result is successful only when `ok === true`, `source === "jev"`, and all five
  expected score answers validate. Check exact question coverage, answer types, finite
  scores in 0–4, matching rubric levels, and probabilities in 0–1 summing approximately
  to one. Define and test a numeric tolerance for serialization precision.
- Preserve optional confidence and actual returned model. Capture real usage/request
  metadata from transport when present; absent values remain null/omitted, never zero.
- Fingerprint the package and adapter versions, requested model, complete questions,
  scoring transformation, and result schema. Include the Jev endpoint, full upstream
  model ID, and transport adapter version so TypeSafe, OpenRouter, and OpenCode
  caches cannot collide.
  Keep source pin/content identity as today.
  Document that explicitly using a mutable alias requires `--force` to refresh cached
  results after an upstream change; pinning the default avoids this ambiguity.
- Record both original document and submitted-state hashes, because the package's
  request builder redacts state. Do not claim the redacted input is byte-identical
  to the downloaded document.

### Failures and limits

- Turn every fallback into `not_evaluated`. Never fabricate a score or switch providers.
- An unavailable OpenRouter Jev model, insufficient credit, authentication error,
  or exhausted rate limit preserves checkpoints without changing models or endpoints.
- OpenCode's free route preserves checkpoints on access/quota failures and never
  inherits the permission to use paid input granted for OpenRouter.
- Preserve typed transport failures outside `judge`, which catches exceptions, so
  authentication errors and exhausted rate limits still stop dispatch correctly.
- Honor existing timeouts, pacing, retry count, Retry-After handling, and checkpointing.
  Retry transient HTTP failures, including TypeSafe's documented 529 overload response.
  Do not automatically repeat ambiguous network timeouts.
- Treat oversized/context-exceeded inputs as per-skill failures. Keep the document
  intact: no silent truncation, chunking, or opt-in long-context header.
  A byte limit alone does not guarantee fitting the per-question token context.
- Use [official request rules](https://docs.typesafe.ai/api/errors) when classifying
  HTTP failures. Keep all logs and saved errors free of credentials.

## Ordered work

The detailed acceptance criteria and verification steps are in [todo.md](todo.md).

1. Define the versioned Jev result contract and legacy report handling.
2. Add the package-backed adapter, questions, and offline score fixtures.
3. Wire provider selection, credentials, transport controls, and resumable reports.
4. Add the OpenRouter endpoint, paid-input Jev default, and endpoint-specific tests.
5. Add the OpenCode free Jev endpoint, credential selection, and quota/fallback tests.
6. Exercise failure cases, input limits, metadata, and provider regressions.
7. Document installation and usage; run the final offline checks.

Checkpoint after tasks 1–2: result validation and score conversion work offline.
Checkpoint after tasks 3–6: all three endpoints work with injected transport;
OpenRouter paid-input responses, OpenCode free-quota failures, and cache isolation
are covered.
Final checkpoint: documentation and all existing provider tests pass.

## Risks and boundaries

- Package parsing is less strict than this evaluator needs: validate completeness,
  score ranges, and probability distributions again at the adapter boundary.
- Scores from different providers are not calibrated to be interchangeable. Preserve
  provider identity and rubric details; any quality comparison needs a labeled sample.
- The optional dependency is a new requirement only for Jev. Pin it and avoid an
  implicit download through `npx` during evaluation.
- OpenRouter bills input tokens for the selected Jev model. Record returned costs
  when available and describe pricing accurately; no free-model discovery is required.
- OpenCode's `jev-1.13-free` offer may expire or exhaust its quota. Preserve the
  free-only selection and return a clear failure rather than switching routes.
- No catalog imports, automatic quality gates, proceed/ask/stop policy, or bulk live
  evaluations are part of this change. Pure score questions need no action-policy branch.

## Implemented usage

```sh
npm run evaluate:skills -- --provider jev --dry-run

# With the optional package installed and TYPESAFE_API_KEY set:
npm run evaluate:skills -- --provider jev --limit 10 \
  --output results/jev-evaluations.json

npm run evaluate:skills -- --provider jev \
  --output results/jev-evaluations.json

# OpenRouter: paid input, free output. Defaults to typesafe/jev-1.14.
# Requires OPENROUTER_API_KEY; no TYPESAFE_API_KEY is needed for this route.
npm run evaluate:skills -- --provider jev --jev-endpoint openrouter \
  --limit 10 --output results/jev-openrouter-evaluations.json

# Explicit version selection:
npm run evaluate:skills -- --provider jev --jev-endpoint openrouter \
  --model typesafe/jev-1.14 --output results/jev-openrouter-evaluations.json

# OpenCode: limited-time free Jev; requires OPENCODE_API_KEY.
# Defaults to jev-1.13-free on the Console System One endpoint.
npm run evaluate:skills -- --provider jev --jev-endpoint opencode-go \
  --limit 10 --output results/jev-opencode-free-evaluations.json

node scripts/evaluate-skills.mjs --provider jev --jev-endpoint opencode-go --dry-run
```

Implementation uses `scripts/jev-evaluator.mjs` and shared HTTP controls in
`scripts/evaluation-http.mjs`. The pinned optional package was verified and installed
with lifecycle scripts disabled. No live Jev inference or paid API request was made.
