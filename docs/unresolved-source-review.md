# Review of unresolved skill sources

Audit performed **2026-10-31 (Europe/Amsterdam)** against the original pinned Git commits. The catalog retains 346 stable skill IDs. This review resolves eight ambiguous-source records without changing recommendation mappings or technology-detection rules.

## Eight resolved source-path ambiguities

| Repository (stable catalog ID prefix) | Skill(s) | Selected upstream source | Why |
| --- | --- | --- | --- |
| `affaan-m/everything-claude-code` | `django-patterns`, `django-security`, `java-coding-standards`, `laravel-patterns`, `python-patterns` | `affaan-m/ECC/skills/<skill>/SKILL.md` | The upstream repository was renamed to `affaan-m/ECC`. The `skills/` directory contains the primary installable English skill documents; localized `docs/*`, `.kiro/`, and `pi/core/` contain alternative copies or translations. Each selected path and slug-matching frontmatter was inspected at commit `25278e7d7b6cf6e6a4e7a6c8e10f14ff22f0eb5b`. |
| `DmitryPogrebnoy/ruby-agent-skills` | `generating-sorbet`, `generating-sorbet-inline` | `plugins/ruby-type-signature-skills/skills/<skill>/SKILL.md` | The repository's published Claude plugin manifest declares `skills: "./skills/"`. The `source/plugins/` files are distinct source variants; the installable plugin contains these valid, slug-named skills at commit `cb2e3552a62026584003e1515ac635bc5eef45c3`. |
| `sickn33/antigravity-awesome-skills` | `nodejs-best-practices` | `sickn33/agentic-awesome-skills/skills/nodejs-best-practices/SKILL.md` | The repository was renamed. Its canonical skill catalog is under `skills/`, with the same blob as two plugin copies. File and slug-matching frontmatter were inspected at commit `b7f6ad814a903f912962ea3cccad8c02766f753b`. |

Canonical skill IDs and `catalog.json.repository` values remain unchanged to avoid breaking saved selections and reverse technology mappings. The ledger points to the current **repository name**, the original immutable commit, and the selected file path. These verification records demonstrate source existence and identity, not trustworthiness.

**Additional risk note:** the upstream `nodejs-best-practices` document carries `risk: critical` metadata. Its provenance is verified, but the content has **not** been security reviewed for Nosey. Do not interpret source verification as approval to execute the file's instructions.

## Five still unresolved: invalid upstream `name` frontmatter

The files were located both at their original pinned commits and on their current default branches. Their actual YAML `name` fields remain unsuitable for an operational kebab-case skill identifier. Simply changing a catalog label would not fix the upstream source.

| Catalog skill ID suffix | Upstream path | Actual upstream frontmatter name |
| --- | --- | --- |
| `angular/angular/pr_review` | `.agent/skills/pr_review/SKILL.md` | `PR Review` |
| `Kaakati/rails-enterprise-dev/sidekiq-async-patterns` | `plugins/rails-enterprise-dev/skills/sidekiq-async-patterns/SKILL.md` | `Sidekiq & Async Patterns` |
| `pluginagentmarketplace/custom-plugin-python/machine-learning` | `skills/machine-learning/SKILL.md` | `Machine Learning` |
| `pluginagentmarketplace/custom-plugin-python/pandas-data-analysis` | `skills/pandas-data-analysis/SKILL.md` | `Pandas Data Analysis` |
| `pramoddutta/qaskills/storybook-testing` | `seed-skills/storybook-testing/SKILL.md` | `Storybook Interaction Testing` |

To resolve these, request upstream fixes to the `name` field and, where needed, the matching skill directory; or deliberately implement a validated, reviewed local normalization policy. Reverify the resulting complete `SKILL.md` at a real immutable commit before marking the ledger record verified. Do **not** change the five records to verified merely because the files exist.

## CI and downstream

The expected result after this PR is **341 verified**, **5 unresolved**, **0 missing / invalid / network errors** from the upstream existence check. The `release_blocked` ledger flag remains `true` while the five metadata issues are outstanding. Once merged, update Nosey's pinned catalog lock and copies through its existing sync workflow. CI only validates the catalog: it does not automatically update Nosey's private repository.
