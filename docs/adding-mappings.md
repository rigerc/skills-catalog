# Adding technology-to-skill mappings and combinations

A mapping makes an existing canonical skill **recommended** when Nosey detects a technology, a combination of technologies, or frontend-essentials eligibility. A skill registered only in `catalog.json.skills[]` is not automatically selected.

Before editing, identify the canonical `skill.id` in `data/catalog.json` and check its matching evidence in `data/catalog-source-ledger.json`. Prefer verified, commit-pinned sources for actionable recommendations. Unresolved sources must remain unresolved even if referenced by a mapping.

## Map an existing skill to an existing technology

1. Find the technology in `data/mappings.json.technologies[]`. Do **not** add a second technology definition for the same ID.
2. Append the canonical skill ID to its `skill_ids` array (without duplicates).
3. Set `mapping_status` to `mapped` when the array becomes nonempty.
4. Find the corresponding `technology_id` rule in `data/technology-detection-rules.json.rules[]` and set **its** `mapping_status` to the same value. The actual signals need not change.
5. Add the technology ID to the skill's `data/catalog.json.skills[].recommended_for.technology_ids`.
6. If the technology was previously detect-only, update the mapped/detect-only counts in both `catalog.json.counts` and `mappings.json.counts`.

Illustrative forward mapping (part of a `mappings.json.technologies[]` item):

```json
{
  "id": "exampleco-payments-sdk",
  "mapping_status": "mapped",
  "skill_ids": ["exampleco/agent-skills/payments-review"]
}
```

Illustrative reverse link (part of the matching `catalog.json.skills[]` entry):

```json
{
  "recommended_for": {
    "technology_ids": ["exampleco-payments-sdk"],
    "combination_ids": [],
    "frontend_essential": false
  }
}
```

These are **partial objects**, not replacements for the complete entries. Keep the full metadata and use valid, existing IDs in the actual files. If several technologies recommend the same skill, add each ID to the reverse list. If you remove a mapping, remove the reverse link unless another rule still uses it.

## Add a technology combination

Use `mappings.json.combinations[]` when two or more existing technologies must be present together. A combination is **AND**, unlike the **OR** of detection signals within a technology.

```json
{
  "id": "exampleco-payments-react",
  "name": "React + ExampleCo Payments SDK",
  "requires": ["react", "exampleco-payments-sdk"],
  "skill_ids": ["exampleco/agent-skills/payments-review"],
  "source_document": "REPLACE-WITH-REAL-COMBINATION-RATIONALE"
}
```

Every `requires` ID must already exist in `mappings.json.technologies[]`. Every `skill_ids` ID must exist in `catalog.json.skills[]`. Choose a unique, stable combination ID and at least two **distinct** required technology IDs. Document why the skill is useful for the combination rather than each component on its own.

For every mapped skill, add the combination ID to its `recommended_for.combination_ids` in `catalog.json`. Update `mappings.json.counts.combinations` and `catalog.json.counts.technology_combinations`. Combinations **do not** get separate scanner rules; they use their required technologies' rules.

## Frontend essentials

`mappings.json.frontend_essentials.skill_ids` is reserved for skills that should be offered broadly on eligible frontend projects. To add one, include its ID there **and** set `catalog.json.skills[].recommended_for.frontend_essential` to `true`. Update `catalog.json.counts.frontend_essential_skills`. To remove one, undo both changes. Do not treat this list as a shortcut for technology-specific mapping. Nosey's `--no-frontend-bonus` setting lets users opt out.

## Reference integrity and counters

- Keep **both directions** of each mapping in sync: forward arrays in `mappings.json` and reverse fields in `catalog.json`. The current validator verifies IDs exist but does **not** prove every reverse link mirrors every forward mapping; review this explicitly.
- `mapping_status: "mapped"` requires nonempty `technology.skill_ids`; `detect_only` requires `[]`. The detection rule's status must match.
- Do not duplicate skill IDs or map through speculative aliases. Resolve IDs against the existing `repository_aliases`; preserve public canonical identity.
- Update `catalog.json.snapshot_date` and `mappings.json.snapshot_date` to the same snapshot date after a meaningful catalog update.
- Keep both `counts` objects consistent; in the current v1 format `mappings.json.counts.distinct_referenced_skills` is validated against the total catalog skill count (not only mapped skills).
- Regenerate [the Markdown indexes](../README.md) with `node scripts/catalog.mjs --write`, then run `node scripts/catalog.mjs --check` and `node --test tests/*.test.mjs`.

## Mapping-review checklist

Check positive and negative detection examples, appropriateness of the recommended skill, exact canonical IDs, the source's verification status, reasonable combination scope, and back-reference symmetry. Changes should be easy to explain in the PR description; recommendations are curated decisions, not inferred automatically from similarly named packages.
