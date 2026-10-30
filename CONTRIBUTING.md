# Contributing to the Nosey skills catalog

This repository is the **source of truth for Nosey's built-in catalog**. Changes here are synchronized into [Nosey](https://github.com/rigerc/nosey-5) as a reviewed, commit-pinned snapshot. Do not change Nosey's mirrored JSON files directly.

## Choose your change

| Goal | Guide | Files you may need to edit |
| --- | --- | --- |
| Add, verify, rename, or retire a skill | [Adding skills](docs/adding-skills.md) | `data/catalog.json`, `data/catalog-source-ledger.json`, and relevant mappings |
| Detect a new technology | [Adding technologies](docs/adding-technologies.md) | `data/mappings.json`, `data/technology-detection-rules.json` |
| Recommend skills for technologies or combinations | [Adding mappings](docs/adding-mappings.md) | `data/mappings.json`, `data/catalog.json` |

For a new technology **with** a new skill recommendation, follow all three guides. For an existing technology-to-skill association, start with the mapping guide.

## Where data lives

- **`data/catalog.json`**: canonical skill IDs, repository/name, optional legacy `skill_md_url`, and reverse recommendation references.
- **`data/mappings.json`**: technology IDs and metadata, descriptive detection examples, technology-to-skill mappings, combinations, frontend essentials, and repository aliases.
- **`data/technology-detection-rules.json`**: executable scanner signals for every technology. This is distinct from the descriptive examples in `mappings.json`.
- **`data/catalog-source-ledger.json`**: one evidence record for every skill, either commit-pinned `verified` or explicitly `unresolved`.

The four documents form **one versioned snapshot**. Use an existing entry as the shape reference. Keep `schema_version: 1`, the shared `catalog_id`, and the matching `catalog.json` / `mappings.json` `snapshot_date` values consistent.

`README.md`, `SKILLS.md`, and `TECHNOLOGIES.md` are **generated**. Do not hand-edit them. If their layout or fixed explanatory text needs changing, edit `scripts/catalog.mjs` instead, then regenerate.

The built-in catalog format here is **not** the additive custom `registry.json` format exposed by Nosey's `registry init` command. Creating a `skills/` folder in this repository does not register a new built-in skill; this catalog indexes external skill sources.

## Local workflow

Requires Node.js **22+**, with no npm install needed.

1. Branch from `main`; change the canonical JSON and any supporting evidence/documents.
2. Adjust the explicit `counts` objects to match the actual arrays, and keep IDs and their reverse links consistent.
3. If the data changed, update `catalog.json` and `mappings.json` to the same new snapshot date. Leave historical `checked_at` dates in the ledger intact unless you actually reverified the corresponding source.
4. Run:

   ```sh
   node scripts/catalog.mjs --validate
   node scripts/check-duplicate-skills.mjs
   node scripts/catalog.mjs --write
   node scripts/catalog.mjs --check
   node --test tests/*.test.mjs
   ```

5. Inspect the diff (including generated Markdown); open a pull request to `main` for review.

### Pull request checklist

- [ ] Every new skill ID is unique after repository alias resolution, has **one** ledger entry, and does not reuse another skill's repository/name or upstream `SKILL.md` path.
- [ ] Every technology referenced by a mapping exists and has **one** corresponding detection rule.
- [ ] Technology `mapping_status` agrees with `skill_ids` and its detection rule.
- [ ] Every recommendation references a real skill and the skill's `recommended_for` backlink agrees.
- [ ] Counts, shared catalog identity, and snapshot dates are updated consistently.
- [ ] Unresolved sources remain visibly unresolved; verified sources have checked, immutable commit-pinned `SKILL.md` URLs.
- [ ] Generated docs are current; validation and tests pass.
- [ ] New/changed scanner signals are narrow enough to avoid common false positives, with evidence or a fixture in the PR.

**What CI checks:** schema versions, counts, unique IDs, duplicate repository/skill names, duplicate pinned upstream `SKILL.md` paths (even across commits), known references, matching mapping/detection statuses, provenance entry coverage, and generated-document drift. Same-named skills in different repositories are allowed; semantic similarity or copied contents across distinct upstream files still requires human review. **What still needs review:** whether recommendations are appropriate, reverse backlinks exactly mirror every forward mapping, real-world URL/source safety, and scanner signal precision. Passing CI is not an independent security or availability audit.

## Release into Nosey

After this PR merges, Nosey's catalog-sync workflow can open an update PR based on the new `skills-catalog/main` commit. The update records the exact commit and blob hashes in `catalog-source.lock.json`. Nosey retains its offline packaged snapshot until that update PR is reviewed and merged; merging here alone does not change an installed Nosey release.
