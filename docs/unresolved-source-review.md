# Audit and disposition of 13 unresolved skill sources

Audited on 2026-10-31. The original snapshot had 346 skills and 13 unresolved source records. Eight ambiguous sources were verified at their original pinned commits; the other five have been deleted from the catalog and source ledger. The current snapshot has **341 skills, 341 verified sources, and zero unresolved sources**.

## Eight verified source paths

| Catalog repository / skill | Selected pinned upstream source |
| --- | --- |
| `affaan-m/everything-claude-code/django-patterns` | `affaan-m/ECC/skills/django-patterns/SKILL.md` |
| `affaan-m/everything-claude-code/django-security` | `affaan-m/ECC/skills/django-security/SKILL.md` |
| `affaan-m/everything-claude-code/java-coding-standards` | `affaan-m/ECC/skills/java-coding-standards/SKILL.md` |
| `affaan-m/everything-claude-code/laravel-patterns` | `affaan-m/ECC/skills/laravel-patterns/SKILL.md` |
| `affaan-m/everything-claude-code/python-patterns` | `affaan-m/ECC/skills/python-patterns/SKILL.md` |
| `DmitryPogrebnoy/ruby-agent-skills/generating-sorbet` | `plugins/ruby-type-signature-skills/skills/generating-sorbet/SKILL.md` |
| `DmitryPogrebnoy/ruby-agent-skills/generating-sorbet-inline` | `plugins/ruby-type-signature-skills/skills/generating-sorbet-inline/SKILL.md` |
| `sickn33/antigravity-awesome-skills/nodejs-best-practices` | `sickn33/agentic-awesome-skills/skills/nodejs-best-practices/SKILL.md` |

The two renamed repositories are now `affaan-m/ECC` and `sickn33/agentic-awesome-skills`. The Sorbet sources use the published plugin's `skills/` directory rather than distinct `source/plugins/` variants. The catalog retains historical canonical IDs for these eight skills. The Node.js source declares `risk: critical` upstream; source verification is not a security endorsement.

## Five deleted skills

| Deleted canonical skill ID | Invalid upstream frontmatter name |
| --- | --- |
| `angular/angular/pr_review` | `PR Review` |
| `Kaakati/rails-enterprise-dev/sidekiq-async-patterns` | `Sidekiq & Async Patterns` |
| `pluginagentmarketplace/custom-plugin-python/machine-learning` | `Machine Learning` |
| `pluginagentmarketplace/custom-plugin-python/pandas-data-analysis` | `Pandas Data Analysis` |
| `pramoddutta/qaskills/storybook-testing` | `Storybook Interaction Testing` |

The user requested deletion instead of waiting for upstream metadata corrections. All five catalog records, ledger records and recommendation references were removed. NumPy and Storybook remain detectable but have no mapped recommendations (`detect_only`). The empty Rails + Sidekiq combination was removed; remaining Angular and Pandas recommendations are preserved.

The release-blocked flag is now `false`. GitHub CI verifies the 341 remaining pinned skill documents. Once the change is merged, the canonical catalog must be synchronized to Nosey's pinned local copy.
