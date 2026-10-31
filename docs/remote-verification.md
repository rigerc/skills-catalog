# Checking upstream skill existence

The [upstream skill existence workflow](../.github/workflows/verify-skill-sources.yml) runs [check-skill-existence.mjs](../scripts/check-skill-existence.mjs) **only when `data/catalog.json` or `data/catalog-source-ledger.json` changes** in a pull request or a push to `main`. It validates the catalog locally first, then queries the pinned upstream skill files. Changes limited to mappings, documentation, scripts, or workflow configuration do not trigger the remote check. This existence workflow has no manual or scheduled trigger; general catalog validation remains independent in `ci.yml`.

The check reads `data/catalog-source-ledger.json` and looks up **every** entry whose status is `verified` in the GitHub Contents API. It requires:

- An HTTPS GitHub URL ending in `SKILL.md` with a **full commit SHA** matching the ledger.
- A successful response at that exact commit.
- The path to resolve to a **nonempty regular file** with the exact name `SKILL.md`.

HTTP **404/410** is reported as **missing** and fails the check. Empty files and paths that resolve to directories or other objects also fail. Network, authorization, and rate-limit problems are reported separately as errors rather than misreported as missing skills; they still fail CI because existence could not be confirmed. Transient failures are retried. GitHub's same-origin redirects to its canonical repository-ID endpoint are followed only if the pinned commit and file path are unchanged; cross-host or otherwise unexpected redirects fail.

Entries that are **already `unresolved`** are listed in the job summary but **are not falsely counted as verified**, and do not cause an automatic failure. Their source must be investigated and updated through a reviewed PR.

## Local use

For a full check, provide a read-only GitHub API token. No external repositories or scripts are cloned or executed:

```sh
GITHUB_TOKEN="$YOUR_TOKEN" node scripts/check-skill-existence.mjs
```

To check just one skill, `--id` can be used without a token, subject to GitHub's anonymous rate limits:

```sh
node scripts/check-skill-existence.mjs --id anthropics/skills/claude-api
```

The check examines the **recorded immutable commit**, not upstream's moving default branch. Consequently, it does not assert that a skill still exists on upstream `main` or that its contents are trustworthy. A source can pass the existence check and still require manual safety, quality, and licensing review.

## Resolving a failure

For a missing file, review the source repository, the pinned commit, and the precise `SKILL.md` path. If the skill moved, verify a new commit and correct URL, then update the ledger's `commit`, `url`, and actual `checked_at`. If the skill no longer exists, mark its ledger record `unresolved` and give a reason; revisit mapped recommendations instead of inventing a replacement. Never replace the pinned commit with a branch name to silence CI.

For HTTP 403/429, inspect GitHub API permissions and rate-limit headers. A network error should be retried, not used to downgrade valid source records.

The check complements (and does not replace) `node scripts/catalog.mjs --check`, mapping consistency checks, generated docs validation, and the regression tests.

## Checking for newer upstream skill contents

The [Update upstream skill sources](../.github/workflows/update-skill-sources.yml) workflow runs on Tuesdays at **06:37 UTC** and supports manual dispatch from the GitHub Actions tab. Unlike the pinned-file existence check above, the updater compares each verified source's SKILL.md blob at its recorded commit with that same path at the upstream repository's latest default-branch commit. Unrelated upstream commits are ignored.

When changes exist, it updates commit-pinned URLs and verification timestamps in the provenance ledger, refreshes the catalog/mappings snapshot dates and generated Markdown, validates the result, and creates or updates a **review-only pull request**. Repeated runs use the same automation branch, and unchanged catalogs produce no PR. Unresolved entries remain unresolved.

To preview or write updates locally with a GitHub token:

~~~sh
GITHUB_TOKEN="$YOUR_TOKEN" node scripts/update-skill-sources.mjs --check
GITHUB_TOKEN="$YOUR_TOKEN" node scripts/update-skill-sources.mjs --write
~~~

The updater uses read-only GitHub metadata and tree APIs and does not execute upstream files. An upstream move/deletion, GitHub API error, or truncated tree causes a failed run rather than silently skipping a verified skill or generating a partial PR. Human review remains required before merging any updated source pins.
