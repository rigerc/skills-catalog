# Adding a technology and its detection rules

A **technology** is an ID Nosey's scanner can recognize in a project. Detection alone is not a recommendation: a `detect_only` technology reports evidence without recommending skills, while a `mapped` technology has at least one skill ID.

New technologies need **one metadata entry in `data/mappings.json` and one executable detection rule in `data/technology-detection-rules.json`**. The descriptive `mappings.json.technologies[].detection` metadata does not execute scanner logic.

## 1. Choose a stable ID

Search `mappings.json.technologies[]` for the same technology, aliases, and adjacent packages before creating an ID. Prefer lowercase, descriptive, stable IDs (for example `exampleco-payments-sdk`) that will not change with marketing names. Existing IDs must not be renamed casually: combination rules and persisted IDs depend on them. Pick an existing category or justify a new category. Where possible, provide a verifiable link to upstream package or integration documentation in your PR.

## 2. Add technology metadata

For a **detect-only** entry, append this shape to `mappings.json.technologies[]` (example names must be replaced):

```json
{
  "id": "exampleco-payments-sdk",
  "name": "ExampleCo Payments SDK",
  "category": "Auth and payments",
  "mapping_status": "detect_only",
  "detection": {
    "coverage": "documented_examples_only",
    "signals": [
      { "kind": "npm", "examples": ["@exampleco/payments"] }
    ],
    "raw": "npm: @exampleco/payments"
  },
  "skill_ids": [],
  "source_document": "REPLACE-WITH-REAL-DOCUMENTATION-REFERENCE",
  "id_provenance": "author_defined"
}
```

`source_document` is a provenance/reference string; replace the placeholder with the actual supporting document or link and explain it in the PR. Do not mark a newly coined ID as `explicit_in_specification` without evidence. Keep `mapping_status: "detect_only"` **only when** `skill_ids: []`. When you later map a verified skill, change `mapping_status` to `mapped` and update the matching detection rule.

## 3. Add the executable detection rule

Append to `data/technology-detection-rules.json.rules[]`:

```json
{
  "technology_id": "exampleco-payments-sdk",
  "mapping_status": "detect_only",
  "origin": "maintainer_reviewed",
  "logic": "any",
  "signals": [
    {
      "type": "dependency",
      "ecosystem": "npm",
      "name": "@exampleco/payments"
    }
  ]
}
```

Each technology needs exactly one rule with the same `technology_id` and `mapping_status`. `logic: "any"` means **any one positive signal** is sufficient. Avoid generic strings likely to match unrelated technologies. The `origin` field should reflect whether the signals were documented, derived, or reviewed; don't claim a source you haven't checked.

### Supported v1 signal types

| Type | Example | When to use |
| --- | --- | --- |
| `dependency` | `{"type":"dependency","ecosystem":"npm","name":"@exampleco/payments"}` | Package-manifest dependency; ecosystems: `npm`, `py`, `gem`, `go`, `crate`, `hex`, `composer` |
| `path` | `{"type":"path","path":"exampleco.config.json"}` | A specific project-relative file or path |
| `glob` | `{"type":"glob","pattern":"**/exampleco.config.*"}` | Distinctive filename patterns |
| `extension` | `{"type":"extension","suffix":".exampleco"}` | Unambiguous, dedicated file extension |
| `content` | `{"type":"content","path_glob":"**/*.config.js","regex":"examplecoPayments","case_sensitive":true}` | Bounded read of relevant files, with a precise regular expression |
| `mcp_package` | `{"type":"mcp_package","name":"@exampleco/mcp-server"}` | An enabled MCP server package |

All the snippets above are **illustrative**; require project evidence before merging. Use simple, bounded `content` expressions. Avoid broad patterns such as `package.json`, `README.md`, `*.js`, or `react` standing alone. Existing scanner scope, ignore rules, read limits, and enabled-MCP semantics still apply; signals are not arbitrary shell commands.

## 4. Add recommended skills, if applicable

If the technology warrants a skill recommendation, first ensure the skill exists in `catalog.json.skills[]` with a source-ledger entry. Then change the technology's `skill_ids` to the exact canonical IDs, set both technology and detection-rule `mapping_status` to `mapped`, and add this technology ID to each skill's `recommended_for.technology_ids`. See [Adding mappings](adding-mappings.md).

**Do not add an empty mapped technology** or an unrecognized skill ID. If the correct skill source is unresolved, keep that evidence unresolved; do not fabricate an install URL.

## 5. Counts, snapshot, review

- Update `mappings.json.counts.technologies`; `mapped_technologies` and `detect_only_technologies` depend on your chosen status.
- Update `catalog.json.counts.technologies_with_skills` and `technologies_detect_only` to match.
- Update both snapshot dates together. If you change scanner rules, explain how signals are expected to fire, show positive and negative project fixtures/evidence, and update the `provenance` description if appropriate.
- Run `node scripts/catalog.mjs --validate`, `node scripts/catalog.mjs --write`, `node scripts/catalog.mjs --check`, and `node --test tests/*.test.mjs`.

**Rule of thumb:** detection proves the technology is present; recommendation authoring separately decides which skills are useful. A technology can stay detect-only indefinitely.
