# Nosey skills catalog

**Canonical data source for the built-in catalog and technology mappings in [Nosey](https://github.com/rigerc/nosey-6).**

Nosey 0.5.0 consumes validated digest-pinned manifests published by this catalog and includes a bundled offline fallback. Canonical catalog changes belong **here**, not in Nosey's generated data.

**Interactive catalog:** [Browse skills and technologies](https://rigerc.github.io/skills-catalog/).

> Generated from `data/`. Edit the JSON source files, then run `node scripts/catalog.mjs --write`.

## Snapshot

| Metric | Total |
| --- | ---: |
| Skills | **877** |
| Skills without mappings | **0** |
| Mapped technologies | **223** |
| Detect-only technologies | **66** |
| Combinations | **35** |
| Verified skill sources | **877** |
| Unresolved sources | **0** |

Snapshot date: **2026-11-05**. Source verification is historical evidence, **not** a live availability, compatibility, licensing, or security guarantee. Unresolved sources are not considered installable.

## Browse the data

- [All skills and source verification](SKILLS.md)
- [Technology mappings and combinations](TECHNOLOGIES.md)
- [Skill registry](data/catalog.json)
- [Model evaluation scores](data/scores.json)
- [Unmapped skills (generated)](data/unmapped.json)
- [Skill map](data/mappings.json)
- [Scanner detection rules](data/technology-detection-rules.json)
- [Provenance and unresolved-source ledger](data/catalog-source-ledger.json)
- [JSON Schema contracts](schemas/)

## Technology coverage

| Category | Technologies | Mapped | Detect-only |
| --- | ---: | ---: | ---: |
| AI, LLM and MCP | 34 | 19 | 15 |
| Auth and payments | 6 | 5 | 1 |
| Backend frameworks and APIs | 27 | 25 | 2 |
| Build tools, monorepos and release | 28 | 13 | 15 |
| Cloud, infrastructure and CI/CD | 21 | 21 | 0 |
| Creative, media and graphics | 6 | 6 | 0 |
| Data, databases and queues | 34 | 31 | 3 |
| Go ecosystem | 25 | 24 | 1 |
| Languages, runtimes and scripting | 23 | 14 | 9 |
| Mobile, desktop and extensions | 15 | 13 | 2 |
| Ruby on Rails ecosystem | 6 | 3 | 3 |
| Testing and quality | 25 | 19 | 6 |
| Web frameworks, UI and styling | 39 | 30 | 9 |

## Authoring and validation

Start with [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow, including [adding skills](docs/adding-skills.md), [adding technologies](docs/adding-technologies.md), and [adding mappings](docs/adding-mappings.md).

Core catalog commands require Node.js 22+ without npm packages. For JSON Schema checks, install the optional development validator with `npm install --no-package-lock` and run `npm run validate:schemas`.

```sh
node scripts/catalog.mjs --validate
node scripts/catalog.mjs --write
node scripts/catalog.mjs --check
node scripts/unmapped.mjs --check
node --test tests/*.test.mjs
```

CI validates canonical JSON Schemas, skill identities, mapping references, detection rules, provenance, quality and generated documentation. A separate workflow proposes documentation regeneration PRs. A manifest publication workflow distributes digest-pinned snapshots while retaining this browsable catalog site.

The four canonical source JSON files under `data/` are one versioned snapshot; `data/unmapped.json` is derived from them. Keep skill identities, recommendation back-references, technology detection rules, and verified source identities aligned. Never invent installation URLs for unresolved entries. This built-in format is **not** Nosey's separate additive custom `registry.json` format.
