# Technology mapping review

This is a first reviewed batch, not a complete classification of the unmapped
catalog. The generated `data/unmapped.json` remains the complete list of skills
without a forward mapping. A skill's name alone is not evidence that it should
be removed or recommended.

## Detection coverage

The new rules identify declared npm or Python dependencies, or the root
`shopify.app.toml` file. The documentation URLs in `data/mappings.json` describe
the supported package names and configuration. Detection is evidence of a
declaration, not proof of installation or execution. Other installation methods,
including CDN scripts, globally installed tools, hosted services, and Shopify
themes without this configuration file, may not be detected. The Selenium
rule also recognizes the documented `selenium-webdriver` npm dependency.

The consuming project scanner is maintained outside this repository. Schema and
catalog validation here check rule structure and references; they do not prove
that a consumer recognizes every manifest format. Consumer-side positive and
negative fixtures are needed before claiming end-to-end detection coverage.

## Deferred candidates

| Technology | Candidate skill | Follow-up |
| --- | --- | --- |
| Quarkus | `Mindrally/skills/quarkus` | Establish precise Maven and Gradle detection and consumer fixtures. |
| k6 | `sickn33/agentic-awesome-skills/k6-load-testing` | Verify a bounded script signature and avoid matching unrelated JavaScript. |
| Odoo | `sickn33/agentic-awesome-skills/odoo-module-developer` | Verify a distinguishing module signature; `__manifest__.py` alone is not sufficient. |
| n8n | `sickn33/agentic-awesome-skills/n8n-workflow-patterns` | Evaluate dependency, workflow and container signals and supported scanner scope. |
| Argo CD | `sickn33/agentic-awesome-skills/argocd-gitops` | Verify distinctive resource declarations and bounded YAML matching. |

Other unmapped skills, including Azure service and SaaS integration skills,
still need classification and research. A hosted service may leave no reliable
project-local signal.

## Removal review candidates

These names do not establish a specific technology trigger. They are candidates
for a catalog-scope decision, not approved removals:

- `alapha888/session-handoff-kit/session-handoff`
- `amElnagdy/review-skills/debate-review`
- `mattpocock/skills/tdd`
- `mattpocock/skills/code-review`
- `HoangNguyen0403/agent-skills-standard/product-strategy`
- `sickn33/agentic-awesome-skills/360-feedback-system`
- `sickn33/agentic-awesome-skills/salary-wage-accounting`
- `sickn33/agentic-awesome-skills/daily-gift`

No skills are removed by this batch. The full unmapped list has not been
reviewed for removal.
