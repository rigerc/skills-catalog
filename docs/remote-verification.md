# Checking upstream skill existence

CI runs [check-skill-existence.mjs](../scripts/check-skill-existence.mjs) after local catalog validation, on pull requests, pushes to main, manual dispatches, and weekly scheduled checks.

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
