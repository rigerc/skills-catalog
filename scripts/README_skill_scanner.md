# GitHub skill technology scanner

A Python 3.10+ CLI that downloads the public skill catalog from [rigerc/skills-catalog](https://github.com/rigerc/skills-catalog/blob/main/data/unmapped.json), discovers **all tracked `SKILL.md` files** in the repositories it names, inspects each document, maps the results to catalog entries, and suggests ways to verify each technology programmatically. It requires Git (2.25+ for sparse mode) and uses only the Python standard library.

**Rate-limit-aware fetching (v2):** Does not call the GitHub REST or GraphQL API. Each repository is fetched once with a shallow blobless Git clone; all `SKILL.md` blobs are then retrieved in a **single sparse-checkout batch**, instead of fetching a blob on every `git cat-file` call. A shared request pacer limits outbound Git request bursts. Transient network errors and HTTP 429s trigger exponential backoff with jitter, successful clones are cached across runs, and the JSON catalog is cached for 24 hours. This avoids consuming REST API quotas and greatly reduces request volume, but **GitHub can still throttle Git/SSH requests**; it is not an unlimited-access bypass.

## Run

Save `scan_skills.py`, then run:

```bash
python scan_skills.py --output results
```

The default `--catalog` URL is the full JSON supplied in the request. The scanner uses a **shallow, blob-filtered Git clone** of each unique repository; it lists Git trees rather than assuming a fixed path such as `skills/<name>/SKILL.md`. It batch-fetches the contents of all tracked `SKILL.md` files (case-insensitive) through sparse checkout and saves the Markdown under `results/sources/<owner>/<repo>/<original/path>`. The script reads the blobs locally without additional Git network calls per document. Repositories are cached in `results/.repo-cache/` and subsequent runs reuse the snapshots unless `--refresh` is supplied.

## Avoiding GitHub throttling

Defaults are conservative: **2 concurrent repositories**, **2 seconds between the start of Git network operations**, and **5 retry attempts** for transient errors. On networks that still hit a 429, use more conservative pacing:

```bash
python scan_skills.py \
  --output results \
  --workers 1 \
  --request-spacing 6 \
  --retries 8 \
  --backoff 10 \
  --max-backoff 180
```

To use an SSH connection already configured on your machine (rather than HTTPS):

```bash
python scan_skills.py --transport ssh --output results
```

SSH does not use the GitHub REST API either, but server-side request limits may still apply. Don't embed tokens in Git URLs. If your Git version or hosting environment lacks partial clone support, `--fetch-mode full` downloads the whole shallow repository in the initial clone, with no later blob retrieval; it can transfer substantially more data:

```bash
python scan_skills.py --fetch-mode full --output results
```

**Resume and refresh:** Rerun with the **same `--output` directory** to reuse cloned repository snapshots, avoiding fresh network requests for successful repositories. `--refresh` re-clones them from the remote, retaining the previous cache if the new clone fails. To force a fresh catalog download without re-cloning repositories, supply `--refresh-catalog`. Change the cache freshness interval with `--catalog-cache-ttl 3600` (seconds). If the URL is temporarily unavailable but a cached catalog is available, the script uses that cached copy.

For a completely offline execution, download the catalog JSON and repositories separately, then use `--catalog` with a local path and `--local-repos` as described below.

First try 20 entries:

```bash
python scan_skills.py --limit 20 --output sample-results
```

Or use a locally saved catalog:

```bash
python scan_skills.py --catalog unmapped.json --output results
```

To avoid re-downloading existing local Git repositories (useful for offline tests):

```bash
python scan_skills.py --catalog unmapped.json --local-repos /path/to/repos --output results
```

Here `/path/to/repos` is organized as `/path/to/repos/<owner>/<repo>`. The command scans the current `HEAD` commit of each local repo.

Test without external network access:

```bash
python -m unittest -v test_scan_skills.py
```

## Output files

| Filename | Purpose |
|---|---|
| `sources/` | Original downloaded `SKILL.md` content, preserving repository paths |
| `catalog_scans.jsonl` | One record per catalog entry; match status, source URL/commit, technologies, evidence |
| `source_scans.jsonl` | One record per **every** discovered `SKILL.md` (including unlisted ones) |
| `skill_technologies.csv` | One row per catalog skill and detected technology, with evidence line, category, confidence, and detection suggestions |
| `technology_summary.csv` | Count of matched catalog skills mentioning/integrating each technology |
| `repository_signals.jsonl` | Repository-wide file/folder fingerprints, **not asserted per skill** |
| `detection_rules.json` | The complete registry of keywords, regex signatures, file globs, and suggested verification commands |
| `unresolved.csv` | Missing, ambiguous, or inaccessible catalog skills for review |
| `run_summary.json` | Completeness metrics, errors, current commits, and scan time |

The JSONL files can be streamed line by line. `unresolved.csv` is the crucial completeness audit: **a successful run is not a guarantee that every public repository still exists or every catalog entry could be uniquely matched**. Add `--strict` to exit with status `2` on any unmatched catalog skill.

## How technology detection works

1. **SKILL.md text**: 90+ curated technology entries with boundary-aware literal matching, explicit CLI/config/import regexes, evidence lines, and a distinction between `mentioned` (low confidence) and `integration_signal` (medium confidence). A command documented in a skill is not proof the command was executed.
2. **Repository files**: compare tracked paths with signatures such as `Dockerfile`, `package.json`, `pyproject.toml`, `.github/workflows/*.yml`, `go.mod`, `Cargo.toml`, `.tf`, `playwright.config.*`, and `.mcp.json`. These signals are kept at repository scope because monorepos may contain unrelated projects.
3. **Follow-up verification**: `detection_rules.json` and the CSVs provide checks such as `python --version`, `docker --version`, `npx playwright --version`, or verifying `pyproject.toml` dependencies and environment variables. **No commands, code snippets, or probes from a skill are executed.**

To verify *actual runtime usage*, use a separate sandboxed environment with explicit permission and observe package imports, CLI invocation, API access, or process/telemetry traces. Text analysis alone cannot guarantee whether a dependency is installed or in use.

## Notes

- Catalog `snapshot_date` is historical metadata. **Repositories are scanned at their current default-branch `HEAD`**, not automatically rewound to the catalog's snapshot date. The script records a commit SHA for traceability.
- A repo clone can fail due to deletion, privacy changes, connectivity, GitHub throttling, repository size, or timeout; these errors remain visible in the reports. Retries apply only to errors classified as transient, not missing repositories.
- The remote `--fetch-mode sparse` option requires Git 2.25+. When an HTTP endpoint does not support blob filtering, Git may fall back to downloading all blobs. The `--fetch-mode full` option deliberately downloads every blob in the shallow snapshot.
- `--max-file-bytes` (default 2 MB) skips exceptionally large Markdown documents with an explicit error; increase it as needed.
- This analysis is lexical, not a full package/dependency resolver. You can extend `TECHNOLOGIES` with rules for more products, file signatures, and verification strategies.
- Source Markdown and filenames are untrusted, so the scanner never executes embedded shell commands, imports, or setup steps. The CSV writer escapes formula-like cell prefixes.
