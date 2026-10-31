# Checking upstream skill existence

The [upstream skill existence workflow](../.github/workflows/verify-skill-sources.yml) runs [check-changed-skill-sources.mjs](../scripts/check-changed-skill-sources.mjs) **only when `data/catalog.json` or `data/catalog-source-ledger.json` changes** in a pull request or a push to `main`. It validates the catalog locally first and compares source entries against the relevant base commit. It sends upstream requests **only for newly added sources, unresolved-to-verified changes, and sources whose pinned commit or URL changed**. Changes to verification timestamps alone require no requests. Changes limited to mappings, documentation, scripts, or workflow configuration do not trigger the remote check. This workflow has no manual or scheduled trigger; general catalog validation remains independent in `ci.yml`.

The CI check reads `data/catalog-source-ledger.json` and requests only changed, commit-pinned `SKILL.md` files from **`raw.githubusercontent.com`**. Because the ledger already records the precise upstream commit and path, it needs neither GitHub REST/GraphQL APIs nor a Git HEAD lookup. Identical pinned URLs are downloaded once, with at most two concurrent requests. Each streamed response is capped at 8 MiB. For catalog-only or timestamp-only changes, it makes **zero network requests**. It requires:

- An HTTPS GitHub URL ending in `SKILL.md` with a **full commit SHA** matching the ledger.
- A successful response at that exact commit.
- The path to resolve to a **nonempty regular file** with the exact name `SKILL.md`.

HTTP **404/410** is reported as missing, and empty or oversized files fail the check. Network failures, HTTP 403/429 throttling, and unexpected redirects are reported as errors rather than falsely counted as valid files. Transient transport and 5xx failures are retried once. The job stops dispatching new requests when the raw host denies or throttles access; it never executes upstream content. Raw-host traffic may be independently throttled by GitHub, but these checks do **not** consume the GitHub API request quota.

Entries that are **already `unresolved`** are listed in the job summary but **are not falsely counted as verified**, and do not cause an automatic failure. Their source must be investigated and updated through a reviewed PR.

## Local use

For an **explicit full-catalog audit**, use the original per-file checker with a read-only GitHub API token. It is **not** called by CI because it consumes roughly one request per skill. No external repositories or scripts are cloned or executed:

```sh
GITHUB_TOKEN="$YOUR_TOKEN" node scripts/check-skill-existence.mjs
```

To check just one skill, `--id` can be used without a token, subject to GitHub's anonymous rate limits:

```sh
node scripts/check-skill-existence.mjs --id anthropics/skills/claude-api
```

Both checkers examine the **recorded immutable commit**, not upstream's moving default branch. Consequently, it does not assert that a skill still exists on upstream `main` or that its contents are trustworthy. A source can pass the existence check and still require manual safety, quality, and licensing review.

## Resolving a failure

For a missing file, review the source repository, the pinned commit, and the precise `SKILL.md` path. If the skill moved, verify a new commit and correct URL, then update the ledger's `commit`, `url`, and actual `checked_at`. If the skill no longer exists, mark its ledger record `unresolved` and give a reason; revisit mapped recommendations instead of inventing a replacement. Never replace the pinned commit with a branch name to silence CI.

For HTTP 403/429 in CI, investigate raw-host access or throttling rather than GitHub REST API quota. An intermittent network error should be retried, not used to downgrade valid source records.

The check complements (and does not replace) `node scripts/catalog.mjs --check`, mapping consistency checks, generated docs validation, and the regression tests.

## Checking for newer upstream skill contents

The [Update upstream skill sources](../.github/workflows/update-skill-sources.yml) workflow runs on Tuesdays at **06:37 UTC** and supports manual dispatch from the GitHub Actions tab. Unlike the pinned-file existence check above, the updater compares each verified source's SKILL.md blob at its recorded commit with that same path at the upstream repository's latest default-branch commit. Unrelated upstream commits are ignored.

When changes exist, it updates commit-pinned URLs and verification timestamps in the provenance ledger, refreshes the catalog/mappings snapshot dates and generated Markdown, validates the result, and creates or updates a **review-only pull request**. Repeated runs use the same automation branch, and unchanged catalogs produce no PR. Unresolved entries remain unresolved.

The updater uses `git ls-remote` **once per upstream repository** to resolve its latest default-branch HEAD. For repositories with a newer HEAD, it downloads only the recorded `SKILL.md` paths at the current and pinned commits using `raw.githubusercontent.com`, then compares their Git blob hashes. Repositories whose HEAD already matches all recorded pins require **no raw file downloads**. It does not use the GitHub REST or GraphQL API for upstream checks, so these scans do not consume the GitHub API request quota. The PR creation action still uses the built-in Actions token.

For local preview or updates, use Node.js 22+ and Git; no GitHub API token is required:

~~~sh
node scripts/update-skill-sources.mjs --check
node scripts/update-skill-sources.mjs --write
~~~

Only file bytes are read and hashed; upstream instructions are never executed. The updater limits downloaded files to 8 MiB and uses bounded network concurrency. Missing or oversized files, Git errors, and raw-host throttling cause a failed run without generating a partial PR. Although raw downloads do not consume the REST API quota, GitHub may still throttle excessive raw or Git requests. Human security, compatibility, and licensing review remains required before merging updated pins.
