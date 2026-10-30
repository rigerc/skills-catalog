# Nosey skills catalog

**Canonical data source for the built-in catalog and technology mappings in [Nosey](https://github.com/rigerc/nosey-5).**

Nosey synchronizes a commit-pinned copy from this repository into its packaged backend, keeping scans and recommendations offline-first. Make changes **here**, not in Nosey's generated copies.

> Generated from `data/`. Edit the JSON source files, then run `node scripts/catalog.mjs --write`.

## Snapshot

| Metric | Total |
| --- | ---: |
| Skills | **346** |
| Mapped technologies | **178** |
| Detect-only technologies | **68** |
| Combinations | **34** |
| Verified skill sources | **333** |
| Unresolved sources | **13** |

Snapshot date: **2026-10-28**. Source verification is historical evidence, **not** a live availability, compatibility, licensing, or security guarantee. Unresolved sources are not considered installable.

## Browse the data

- [All skills and source verification](SKILLS.md)
- [Technology mappings and combinations](TECHNOLOGIES.md)
- [Skill registry](data/catalog.json)
- [Skill map](data/mappings.json)
- [Scanner detection rules](data/technology-detection-rules.json)
- [Provenance and unresolved-source ledger](data/catalog-source-ledger.json)

## Technology coverage

| Category | Technologies | Mapped | Detect-only |
| --- | ---: | ---: | ---: |
| AI, LLM and MCP | 22 | 14 | 8 |
| Auth and payments | 5 | 3 | 2 |
| Backend frameworks and APIs | 25 | 23 | 2 |
| Build tools, monorepos and release | 27 | 10 | 17 |
| Cloud, infrastructure and CI/CD | 17 | 17 | 0 |
| Creative, media and graphics | 5 | 5 | 0 |
| Data, databases and queues | 27 | 23 | 4 |
| Go ecosystem | 18 | 17 | 1 |
| Languages, runtimes and scripting | 23 | 13 | 10 |
| Mobile, desktop and extensions | 15 | 12 | 3 |
| Ruby on Rails ecosystem | 6 | 3 | 3 |
| Testing and quality | 21 | 14 | 7 |
| Web frameworks, UI and styling | 35 | 24 | 11 |

## Authoring and validation

Start with [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow, including [adding skills](docs/adding-skills.md), [adding technologies](docs/adding-technologies.md), and [adding mappings](docs/adding-mappings.md).

Requires Node.js 22+; no npm dependencies.

```sh
node scripts/catalog.mjs --validate
node scripts/catalog.mjs --write
node scripts/catalog.mjs --check
node --test tests/*.test.mjs
```

CI enforces schema versions, canonical skill IDs, mapping references, count consistency, detection rules, provenance records, and generated documentation. A separate workflow proposes documentation regeneration PRs. Nosey's scheduled workflow proposes PRs to synchronize updates to its pinned, locally packaged snapshot.

The four `data/*.json` files are one versioned source snapshot. Keep skill identities, recommendation back-references, technology detection rules, and verified source identities aligned. Never invent installation URLs for unresolved entries. This built-in format is **not** Nosey's separate additive custom `registry.json` format.
