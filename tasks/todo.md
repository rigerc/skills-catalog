# Jev evaluator tasks

Implementation and offline verification are complete. Design and sources: [plan.md](plan.md).

## Task 1: Define Jev results and report compatibility

- [x] Add `prose_review` / `jev_scores` result discrimination and report version 2.
- [x] Load existing version 1 reports without invalidating successful prose caches.
- [x] Validate all five fractional scores, native values, legends, distributions,
  and optional confidence; reject missing, extra, malformed, or non-finite answers.

**Acceptance criteria:** Existing prose validation stays strict; fixture results keep
native fractional values; legacy cached reviews remain reusable.

**Verification:** Add version 1 migration, score conversion, distribution precision,
and invalid-response tests; run `node --test tests/evaluate-skills.test.mjs`.

**Dependencies:** None.

**Likely files:** `scripts/evaluate-skills.mjs`, `tests/evaluate-skills.test.mjs`.
**Scope:** Small.

## Task 2: Add the package-backed Jev adapter

- [x] Verify the published package matches the reviewed exports, then pin `0.1.1`
  as an optional dependency and import it lazily.
- [x] Build five versioned score questions with concrete five-level rubrics and
  untrusted document state; use `buildRequest` / `judge` from the package.
- [x] Convert genuine Jev answers into score-only results and map every fallback
  to a failure. Preserve native data and original/submitted-state hashes.

**Acceptance criteria:** One request covers all dimensions; no fabricated prose;
the other providers and offline planning work without the package installed.

**Verification:** Test with injected judge/transport dependencies and upstream-compatible
fixtures, including fractional scores and redacted state. Run
`node --test tests/jev-evaluator.test.mjs`.

**Dependencies:** Task 1.

**Likely files:** `package.json`, `scripts/jev-evaluator.mjs`,
`tests/jev-evaluator.test.mjs`.
**Scope:** Medium.

## Checkpoint: Offline contract and adapter

- [x] Tasks 1–2 pass using fixtures; no API credential or live call is needed.

## Task 3: Integrate Jev with the evaluation runner

- [x] Add `--provider jev`, the versioned default model, and provider-specific
  `TYPESAFE_API_KEY` handling before source downloads.
- [x] Connect an injected transport with pacing, retry/timeout controls, metadata
  capture, and typed errors that survive the package's fallback behavior.
- [x] Include Jev question/package/adapter/schema versions in fingerprints; route
  progress reporting, report validation, checkpoints, and resume through the new result kind.

**Acceptance criteria:** `--dry-run` performs no requests or writes; missing keys and
unsupported explicit chat options fail clearly; successful Jev results resume correctly.

**Verification:** Exercise end-to-end mocked source and Jev requests, cache reuse,
model/rubric invalidation, atomic checkpoints, and all existing provider tests.

**Dependencies:** Tasks 1–2.

**Likely files:** `scripts/evaluate-skills.mjs`, `scripts/jev-evaluator.mjs`,
`tests/evaluate-skills.test.mjs`, `tests/jev-evaluator.test.mjs`.
**Scope:** Medium.

## Task 4: Add OpenRouter endpoint support with paid-input Jev

- [x] Add `--jev-endpoint typesafe|openrouter|opencode-go` and send the OpenRouter route to
  `https://openrouter.ai/api/v1/systemone` through the shared package-backed adapter.
  Use only `OPENROUTER_API_KEY` for this endpoint and keep existing chat routing intact.
- [x] Default OpenRouter to `typesafe/jev-1.14` with paid input and free output.
  Keep TypeSafe's `jev-1.14.0` default separate, support explicit Jev model overrides,
  and select defaults independently of argument order. No free-model check is required.
- [x] Include endpoint/model/adapter version in fingerprints and saved provenance.
  Preserve actual usage and cost when returned; add fixtures for successful paid-input
  responses, unavailable models, insufficient credit, and missing optional metadata.

**Acceptance criteria:** OpenRouter uses the Jev question/score contract, correct
host and credentials, and isolated caches. Paid-input Jev responses are accepted;
credit/model failures remain clear and never trigger a different model or endpoint.

**Verification:** Mock paid-input Jev responses, zero-cost output, actual cost metadata,
missing usage, 402 credit errors, 429 limits, and unavailable model responses. Assert
a dry run needs no key/package/network and no free-model metadata request occurs.
Test default selection in both argument orders and the alternative Decisions endpoint if used.

**Dependencies:** Tasks 2–3.

**Likely files:** `scripts/evaluate-skills.mjs`, `scripts/jev-evaluator.mjs`,
`tests/evaluate-skills.test.mjs`, `tests/jev-evaluator.test.mjs`.
**Scope:** Medium.

## Task 5: Add OpenCode free Jev through the opencode-go selector

- [x] Wire `--provider jev --jev-endpoint opencode-go` to
  `https://opencode.ai/inference/systemone/v1/systemone`, defaulting to
  `jev-1.13-free` and authenticating only with `OPENCODE_API_KEY`.
- [x] Reuse the package-backed request/parser, score validation, pacing, checkpoints,
  and metadata handling. Include the OpenCode endpoint/free model in cache identity.
  Keep existing OpenCode chat/DeepSeek behavior intact.
- [x] Preserve the free model on access/quota/model failures; reject paid overrides
  and forbid automatic fallback to paid Jev or the authorized paid OpenRouter route.

**Acceptance criteria:** The documented Console Jev endpoint receives all five score
questions with the correct key/model. Free results validate and resume correctly;
401/403/429 and expired offers preserve progress without paid fallback.

**Verification:** Use injected transport fixtures for native fractional scores,
reported zero cost, absent cost, incorrect keys/hosts, missing models, expired free
offers, and exhausted quotas. Test default selection in both argument orders and
cache isolation from direct TypeSafe/OpenRouter results. Assert no chat API or CLI
is invoked, and dry runs need no key/package/network.

**Dependencies:** Tasks 2–3; Task 4 establishes the shared endpoint selector.

**Likely files:** `scripts/evaluate-skills.mjs`, `scripts/jev-evaluator.mjs`,
`tests/evaluate-skills.test.mjs`, `tests/jev-evaluator.test.mjs`.
**Scope:** Medium.

## Task 6: Verify failure handling and context limits

- [x] Cover fallback results, HTTP-200 malformed answers, missing question IDs,
  invalid distributions, unknown metadata, and missing usage.
- [x] Test 401, 402, 403, 429 with Retry-After, 529/5xx, and timeouts across all endpoints, including preservation
  of progress when dispatch stops and redaction of credentials.
- [x] Test byte-limit and model-context failures without truncating input, switching
  providers, enabling long context, or repeating ambiguous network requests.

**Acceptance criteria:** A fallback never counts as evaluated; failure scope matches
the error; original provider behavior remains unchanged.

**Verification:** Run the focused Jev tests and `node --test tests/*.test.mjs`.
Assertions use deterministic fixtures, not exact probabilities from live models.

**Dependencies:** Tasks 3–5.

**Likely files:** `scripts/jev-evaluator.mjs`, `tests/jev-evaluator.test.mjs`,
`tests/evaluate-skills.test.mjs`.
**Scope:** Medium.

## Checkpoint: Integrated provider

- [x] Tasks 3–6 pass with injected transport and all existing providers remain green.
- [x] Paid-input OpenRouter Jev succeeds with fixtures; credit/model failures preserve checkpoints.
- [x] Free OpenCode Jev succeeds with fixtures; access/quota failures never switch to paid inference.

## Task 7: Document and validate the completed feature

- [x] Document optional installation, endpoint-specific `TYPESAFE_API_KEY` /
  `OPENROUTER_API_KEY` / `OPENCODE_API_KEY`, model selection, score-only results, fractional scale,
  limits, and separate output files for each Jev endpoint.
- [x] Document version 1 report compatibility, cache identity, mutable model aliases,
  and absent prose feedback; update CLI help examples.
- [x] Run the full offline checks and inspect the diff for accidental catalog changes.
- [x] Document OpenRouter's `typesafe/jev-1.14` default, paid input/free output billing,
  and actual cost metadata. Remove free-model availability prerequisites from usage guidance.
- [x] Document OpenCode's `jev-1.13-free` default, limited-time free offer, Console
  System One endpoint, quota failures, and lack of automatic paid fallback.

**Acceptance criteria:** A contributor can install and run Jev from the documented
commands; verification requires no paid API calls; canonical catalog data stays unchanged.

**Verification:**

```sh
node scripts/evaluate-skills.mjs --provider jev --dry-run
node scripts/evaluate-skills.mjs --provider jev --jev-endpoint openrouter --model typesafe/jev-1.14 --dry-run
node scripts/evaluate-skills.mjs --provider jev --jev-endpoint opencode-go --model jev-1.13-free --dry-run
node --test tests/*.test.mjs
node scripts/catalog.mjs --check
node scripts/quality.mjs --check
git diff --check
```

**Dependencies:** Tasks 1–6.

**Likely files:** `docs/quality.md`, `scripts/evaluate-skills.mjs`, `CONTRIBUTING.md`.
**Scope:** Medium.

## Final checkpoint

- [x] All acceptance criteria pass; the documented offline commands work.
- [x] No invented Jev feedback, successful fallbacks, implicit provider switch,
  paid fallback from free OpenCode Jev, or automatically triggered bulk live evaluation.
- [x] Implementation is ready for review.

## Verification record

- Verified published `@aitofy/jev-awesome-skills@0.1.1` exports and SHA-512 integrity; installed with lifecycle scripts disabled.
- Fixture tests cover all three endpoints, real-package parsing/redaction, CLI persistence/resume, legacy report migration, retries, context limits, and no paid fallback from OpenCode.
- Catalog, quality, and JSON Schema checks pass. No canonical catalog data changed.
- No live Jev inference or paid API request was made.
