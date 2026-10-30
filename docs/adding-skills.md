# Adding or updating a skill

A **skill** is a canonical recommendation target (an external repository's `SKILL.md`), not a technology detector. A skill is **not recommended automatically** just because it has been indexed: map it to a technology, combination, or frontend-essentials rule if appropriate.

## 1. Find and review the source

Find the intended `SKILL.md` in the upstream repository, with its exact path and a full 40-character Git commit SHA. Check for duplicate skills under the same or aliased ID, name/path changes, suspicious instructions, external commands, and any material installation or licensing concerns. Do not infer a working file path from a repository's name.

Use an ID that matches the existing stable pattern, usually `owner/repository/skill-name`. The `repository` field is `owner/repository`; the `skill_name` field names the upstream skill. Keep existing IDs stable, even if the upstream repository is renamed: changing them can invalidate saved selections and other mappings. Repository renames may instead use the existing `repository_aliases` in `data/mappings.json`; confirm canonicalization before introducing an alias.

## 2. Add one entry to `data/catalog.json`

Append to `skills[]` (illustrative example: replace every `exampleco` value before submitting):

```json
{
  "id": "exampleco/agent-skills/payments-review",
  "repository": "exampleco/agent-skills",
  "skill_name": "payments-review",
  "skill_md_url": null,
  "recommended_for": {
    "technology_ids": [],
    "combination_ids": [],
    "frontend_essential": false
  }
}
```

`recommended_for.technology_ids` and `recommended_for.combination_ids` are reverse links to rules that recommend this skill. Keep them in sync with the forward `skill_ids` arrays in `mappings.json`; see [Adding mappings](adding-mappings.md). Set `frontend_essential` only when the skill also belongs to `mappings.json.frontend_essentials.skill_ids` and has been reviewed for that broad default behavior.

The **source ledger** (next step), rather than `skill_md_url`, supplies the verified, commit-pinned URL at runtime. `skill_md_url: null` is valid and avoids claiming unverified URLs are installable. Do not populate that field with a guessed link.

## 3. Add exactly one source-evidence entry

Create a matching `id` in `data/catalog-source-ledger.json.entries[]`. Two possible states:

### Unresolved (when exact source or identity is not verified)

```json
{
  "id": "exampleco/agent-skills/payments-review",
  "status": "unresolved",
  "checked_at": "2026-10-31T00:00:00Z",
  "reason": "Exact upstream SKILL.md path and commit have not been verified"
}
```

Use the actual date/time when you checked. Set `ledger.unresolved_count` to the number of unresolved records. Do **not** mark an unresolved skill verified merely to make it installable. Nosey should treat the source as unavailable for installation while unresolved.

### Verified (only after inspecting a real upstream commit)

```json
{
  "id": "exampleco/agent-skills/payments-review",
  "status": "verified",
  "checked_at": "<actual ISO-8601 verification timestamp>",
  "url": "https://github.com/OWNER/REPO/blob/<40-hex-commit>/skills/payments-review/SKILL.md",
  "commit": "<same exact 40-hex commit>"
}
```

The above **contains placeholders and is not a valid evidence record until replaced**. Verify the URL actually returns the intended `SKILL.md` at that commit. A URL to `main`, `latest`, an overview page, or a directory is not equivalent. If the installable upstream skill name differs from the catalog's `skill_name`, a verified record may include `source_skill_name` after confirming the correct name. Remove an old `reason` when changing an entry to `verified`. If the source disappears, downgrade to `unresolved` and record the reason rather than inventing a replacement.

A `verified` record documents historical evidence, **not** safety certification, supported installation, or live availability. Avoid credentials and private URLs.

## 4. Recommend the skill deliberately

Add its ID to one or more `mappings.json.technologies[].skill_ids` or `combinations[].skill_ids` and add matching reverse IDs to this skill's `recommended_for` object. See [Adding mappings](adding-mappings.md).

If the skill is deliberately index-only, leave its recommendation arrays empty and explain why in the PR. Avoid broad frontend-essentials behavior unless the skill is appropriate for most web projects.

## 5. Update counts and validate

- In `catalog.json.counts`, adjust `distinct_skills` (+1 for a net new skill); `technologies_with_skills` and `technologies_detect_only` change only if a technology switches mapping status; `technology_combinations` changes only if a combination was added or removed; `frontend_essential_skills` changes only when that list changes.
- In `mappings.json.counts`, adjust `distinct_referenced_skills` (+1 for a new catalog skill in the current v1 count contract), plus technology/combination counts when relevant.
- Keep `catalog.json.snapshot_date` and `mappings.json.snapshot_date` equal when refreshing the snapshot; update `catalog-source-ledger.json.unresolved_count` if the unresolved total changed.
- Run the commands in [CONTRIBUTING.md](../CONTRIBUTING.md#local-workflow). Generated `SKILLS.md` will pick up the entry automatically.

## Updating or retiring a skill

Prefer to retain its ID when only its verified commit or upstream path changes. If retiring it, first remove references from all technologies, combinations and frontend essentials; remove its catalog and ledger entries together, update the counts and reverse links, and call out migration effects on previously saved selections in the PR. Never silently remap a historical ID to a different skill.
