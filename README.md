# Nosey skills catalog

**Canonical data source for the built-in catalog and technology mappings in [Nosey](https://github.com/rigerc/nosey-5).**

Nosey synchronizes a commit-pinned copy from this repository into its packaged backend, keeping scans and recommendations offline-first. Make changes **here**, not in Nosey's generated copies.

> Generated from `data/`. Edit the JSON source files, then run `node scripts/catalog.mjs --write`.

## Snapshot

| Metric | Total |
| --- | ---: |
| Skills | **2601** |
| Skills without mappings | **1749** |
| Mapped technologies | **201** |
| Detect-only technologies | **55** |
| Combinations | **33** |
| Verified skill sources | **2601** |
| Unresolved sources | **0** |

Snapshot date: **2026-11-01**. Source verification is historical evidence, **not** a live availability, compatibility, licensing, or security guarantee. Unresolved sources are not considered installable.

## Browse the data

- [All skills and source verification](SKILLS.md)
- [Technology mappings and combinations](TECHNOLOGIES.md)
- [Skill registry](data/catalog.json)
- [Unmapped skills (generated)](data/unmapped.json)
- [Skill map](data/mappings.json)
- [Scanner detection rules](data/technology-detection-rules.json)
- [Provenance and unresolved-source ledger](data/catalog-source-ledger.json)
- [JSON Schema contracts](schemas/)

## Technology coverage

| Category | Technologies | Mapped | Detect-only |
| --- | ---: | ---: | ---: |
| AI, LLM and MCP | 22 | 18 | 4 |
| Auth and payments | 6 | 5 | 1 |
| Backend frameworks and APIs | 25 | 23 | 2 |
| Build tools, monorepos and release | 27 | 12 | 15 |
| Cloud, infrastructure and CI/CD | 17 | 17 | 0 |
| Creative, media and graphics | 5 | 5 | 0 |
| Data, databases and queues | 31 | 28 | 3 |
| Go ecosystem | 18 | 17 | 1 |
| Languages, runtimes and scripting | 23 | 14 | 9 |
| Mobile, desktop and extensions | 15 | 13 | 2 |
| Ruby on Rails ecosystem | 6 | 3 | 3 |
| Testing and quality | 23 | 17 | 6 |
| Web frameworks, UI and styling | 38 | 29 | 9 |

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

CI validates four JSON Schemas and enforces schema versions, canonical skill IDs, mapping references, count consistency, detection rules, provenance records, generated documentation, and the unmapped skills index. A separate workflow proposes documentation regeneration PRs. Nosey's scheduled workflow proposes PRs to synchronize updates to its pinned, locally packaged snapshot.

The four canonical source JSON files under `data/` are one versioned snapshot; `data/unmapped.json` is derived from them. Keep skill identities, recommendation back-references, technology detection rules, and verified source identities aligned. Never invent installation URLs for unresolved entries. This built-in format is **not** Nosey's separate additive custom `registry.json` format.
